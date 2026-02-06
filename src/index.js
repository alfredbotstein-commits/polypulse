import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { 
  searchMarketsFulltext, 
  getTrendingMarkets,
  parseOutcomes,
  formatVolume,
  formatPrice,
} from './polymarket.js';
import {
  addAlert,
  getUserAlerts,
  getAllAlerts,
  deleteAlert,
  removeTriggeredAlert,
  getUserAlertCount,
} from './alerts.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const MAX_ALERTS_PER_USER = 10;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// /start command
bot.start((ctx) => {
  ctx.reply(
    `🔮 *Welcome to PolyPulse!*\n\n` +
    `Your Polymarket insights companion.\n\n` +
    `*Commands:*\n` +
    `/price <query> — Get current odds for a market\n` +
    `/trending — Show top moving markets\n` +
    `/alert <query> <price> — Set price alert\n` +
    `/alerts — List your alerts\n` +
    `/cancelalert <id> — Remove an alert\n` +
    `/help — Show this message\n\n` +
    `_Example: /price bitcoin 100k_`,
    { parse_mode: 'Markdown' }
  );
});

// /help command
bot.help((ctx) => {
  ctx.reply(
    `🔮 *PolyPulse Commands*\n\n` +
    `/price <query> — Search markets and get current odds\n` +
    `/trending — Top 5 markets by 24h volume\n` +
    `/alert <query> <price> — Set alert when Yes hits price\n` +
    `/alerts — View your active alerts\n` +
    `/cancelalert <id> — Cancel an alert\n\n` +
    `*Alert Examples:*\n` +
    `/alert bitcoin 60 — Alert when Bitcoin market ≥60%\n` +
    `/alert trump 40 — Alert when Trump market ≤40%\n\n` +
    `_Alerts auto-detect direction based on current price._`,
    { parse_mode: 'Markdown' }
  );
});

// /price <query> command
bot.command('price', async (ctx) => {
  const query = ctx.message.text.replace(/^\/price\s*/i, '').trim();
  
  if (!query) {
    return ctx.reply(
      '❌ Please provide a search query.\n\n' +
      '_Example: /price bitcoin_',
      { parse_mode: 'Markdown' }
    );
  }
  
  try {
    await ctx.sendChatAction('typing');
    
    const markets = await searchMarketsFulltext(query, 3);
    
    if (markets.length === 0) {
      return ctx.reply(
        `🔍 No active markets found for "${query}".\n\n` +
        `_Try different keywords or check /trending_`,
        { parse_mode: 'Markdown' }
      );
    }
    
    let response = `🔮 *Markets matching "${query}":*\n\n`;
    
    for (const market of markets) {
      const outcomes = parseOutcomes(market);
      const volume = formatVolume(market.volumeNum || 0);
      const volume24h = formatVolume(market.volume24hr || 0);
      
      response += `📊 *${escapeMarkdown(market.question)}*\n`;
      
      // Show outcomes
      for (const outcome of outcomes) {
        const emoji = outcome.name.toLowerCase() === 'yes' ? '✅' : 
                      outcome.name.toLowerCase() === 'no' ? '❌' : '🔹';
        response += `${emoji} ${outcome.name}: *${outcome.pct}*\n`;
      }
      
      response += `💰 Vol: ${volume} (24h: ${volume24h})\n`;
      
      // Add link
      const slug = market.slug || market.question.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      response += `🔗 [View on Polymarket](https://polymarket.com/event/${slug})\n\n`;
    }
    
    await ctx.reply(response, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true 
    });
    
  } catch (error) {
    console.error('Error in /price:', error);
    ctx.reply('❌ Failed to fetch market data. Please try again.');
  }
});

// /trending command
bot.command('trending', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    
    const markets = await getTrendingMarkets(5);
    
    if (markets.length === 0) {
      return ctx.reply('No trending markets found.');
    }
    
    let response = `🔥 *Top 5 Trending Markets (24h)*\n\n`;
    
    for (let i = 0; i < markets.length; i++) {
      const market = markets[i];
      const outcomes = parseOutcomes(market);
      const volume24h = formatVolume(market.volume24hr || 0);
      const priceChange = market.oneDayPriceChange || 0;
      const changeStr = priceChange > 0 ? `+${(priceChange * 100).toFixed(1)}%` :
                        priceChange < 0 ? `${(priceChange * 100).toFixed(1)}%` : '0%';
      const changeEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '➡️';
      
      // Truncate long questions
      let question = market.question;
      if (question.length > 60) {
        question = question.substring(0, 57) + '...';
      }
      
      response += `*${i + 1}. ${escapeMarkdown(question)}*\n`;
      
      // Show main outcome (Yes price)
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      if (yesOutcome) {
        response += `   Yes: *${yesOutcome.pct}* ${changeEmoji} ${changeStr}\n`;
      }
      
      response += `   💰 24h Vol: ${volume24h}\n\n`;
    }
    
    await ctx.reply(response, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true 
    });
    
  } catch (error) {
    console.error('Error in /trending:', error);
    ctx.reply('❌ Failed to fetch trending markets. Please try again.');
  }
});

// /alert <query> <price> — Set a price alert
bot.command('alert', async (ctx) => {
  const args = ctx.message.text.replace(/^\/alert\s*/i, '').trim();
  
  // Parse: everything before the last number is the query
  const match = args.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*%?$/);
  
  if (!match) {
    return ctx.reply(
      '❌ Usage: `/alert <query> <price>`\n\n' +
      '_Example: /alert bitcoin 60_\n' +
      '_Sets alert when Yes price hits 60%_',
      { parse_mode: 'Markdown' }
    );
  }
  
  const query = match[1].trim();
  const threshold = parseFloat(match[2]);
  
  if (threshold < 1 || threshold > 99) {
    return ctx.reply('❌ Price must be between 1 and 99 (percent).');
  }
  
  // Check user's alert count
  const userId = ctx.from.id.toString();
  const alertCount = getUserAlertCount(userId);
  
  if (alertCount >= MAX_ALERTS_PER_USER) {
    return ctx.reply(
      `❌ You've reached the maximum of ${MAX_ALERTS_PER_USER} alerts.\n` +
      `Use /alerts to view and /cancelalert to remove some.`
    );
  }
  
  try {
    await ctx.sendChatAction('typing');
    
    // Find the best matching market
    const markets = await searchMarketsFulltext(query, 1);
    
    if (markets.length === 0) {
      return ctx.reply(
        `🔍 No active markets found for "${query}".\n\n` +
        `_Try different keywords._`,
        { parse_mode: 'Markdown' }
      );
    }
    
    const market = markets[0];
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    
    if (!yesOutcome) {
      return ctx.reply('❌ Could not parse market prices. Try another market.');
    }
    
    const currentPrice = parseFloat(yesOutcome.price) * 100;
    const thresholdDecimal = threshold / 100;
    
    // Auto-detect direction
    const direction = currentPrice < threshold ? 'above' : 'below';
    
    // Save alert
    const alertId = addAlert({
      userId,
      chatId: ctx.chat.id.toString(),
      marketId: market.id || market.slug,
      marketName: market.question,
      threshold: thresholdDecimal,
      direction,
    });
    
    const directionText = direction === 'above' ? '≥' : '≤';
    const arrow = direction === 'above' ? '📈' : '📉';
    
    await ctx.reply(
      `✅ *Alert #${alertId} created!*\n\n` +
      `📊 ${escapeMarkdown(market.question)}\n` +
      `${arrow} Alert when Yes ${directionText} *${threshold}%*\n` +
      `📍 Current: *${currentPrice.toFixed(1)}%*\n\n` +
      `_I'll notify you when price triggers._`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Error in /alert:', error);
    ctx.reply('❌ Failed to create alert. Please try again.');
  }
});

// /alerts — List user's alerts
bot.command('alerts', async (ctx) => {
  const userId = ctx.from.id.toString();
  const alerts = getUserAlerts(userId);
  
  if (alerts.length === 0) {
    return ctx.reply(
      '📭 You have no active alerts.\n\n' +
      '_Set one with: /alert bitcoin 60_',
      { parse_mode: 'Markdown' }
    );
  }
  
  let response = `🔔 *Your Alerts (${alerts.length}/${MAX_ALERTS_PER_USER}):*\n\n`;
  
  for (const alert of alerts) {
    const directionText = alert.direction === 'above' ? '≥' : '≤';
    const threshold = (alert.threshold * 100).toFixed(0);
    
    // Truncate long names
    let name = alert.market_name;
    if (name.length > 40) {
      name = name.substring(0, 37) + '...';
    }
    
    response += `*#${alert.id}* — ${escapeMarkdown(name)}\n`;
    response += `   Yes ${directionText} ${threshold}%\n\n`;
  }
  
  response += `_Cancel with: /cancelalert <id>_`;
  
  await ctx.reply(response, { parse_mode: 'Markdown' });
});

// /cancelalert <id> — Remove an alert
bot.command('cancelalert', async (ctx) => {
  const args = ctx.message.text.replace(/^\/cancelalert\s*/i, '').trim();
  const alertId = parseInt(args, 10);
  
  if (!alertId || isNaN(alertId)) {
    return ctx.reply(
      '❌ Usage: `/cancelalert <id>`\n\n' +
      '_Use /alerts to see your alert IDs._',
      { parse_mode: 'Markdown' }
    );
  }
  
  const userId = ctx.from.id.toString();
  const deleted = deleteAlert(alertId, userId);
  
  if (deleted) {
    ctx.reply(`✅ Alert #${alertId} cancelled.`);
  } else {
    ctx.reply(`❌ Alert #${alertId} not found or doesn't belong to you.`);
  }
});

// Escape markdown special characters
function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// ============ ALERT POLLING ============

async function checkAlerts() {
  const alerts = getAllAlerts();
  
  if (alerts.length === 0) return;
  
  // Group alerts by market to minimize API calls
  const marketIds = [...new Set(alerts.map(a => a.market_id))];
  
  for (const marketId of marketIds) {
    try {
      // Search for market (using the stored ID/slug as query)
      const markets = await searchMarketsFulltext(marketId, 1);
      
      if (markets.length === 0) continue;
      
      const market = markets[0];
      const outcomes = parseOutcomes(market);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      
      if (!yesOutcome) continue;
      
      const currentPrice = parseFloat(yesOutcome.price);
      
      // Check all alerts for this market
      const marketAlerts = alerts.filter(a => a.market_id === marketId);
      
      for (const alert of marketAlerts) {
        const triggered = 
          (alert.direction === 'above' && currentPrice >= alert.threshold) ||
          (alert.direction === 'below' && currentPrice <= alert.threshold);
        
        if (triggered) {
          // Send notification
          const thresholdPct = (alert.threshold * 100).toFixed(0);
          const currentPct = (currentPrice * 100).toFixed(1);
          const emoji = alert.direction === 'above' ? '📈' : '📉';
          
          const message = 
            `🔔 *Alert Triggered!*\n\n` +
            `${emoji} *${escapeMarkdown(alert.market_name)}*\n\n` +
            `Target: ${thresholdPct}%\n` +
            `Current: *${currentPct}%*\n\n` +
            `_This alert has been removed._`;
          
          try {
            await bot.telegram.sendMessage(alert.chat_id, message, {
              parse_mode: 'Markdown',
            });
          } catch (sendErr) {
            console.error(`Failed to send alert to ${alert.chat_id}:`, sendErr.message);
          }
          
          // Remove the triggered alert
          removeTriggeredAlert(alert.id);
          console.log(`Alert #${alert.id} triggered and removed`);
        }
      }
      
      // Small delay between markets to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
      
    } catch (error) {
      console.error(`Error checking market ${marketId}:`, error.message);
    }
  }
}

// Start polling loop
function startAlertPolling() {
  console.log('📊 Starting alert polling (every 5 min)...');
  
  // Initial check after 30 seconds
  setTimeout(() => {
    checkAlerts().catch(err => console.error('Alert check error:', err));
  }, 30000);
  
  // Then every 5 minutes
  setInterval(() => {
    checkAlerts().catch(err => console.error('Alert check error:', err));
  }, POLL_INTERVAL_MS);
}

// Launch bot
bot.launch()
  .then(() => {
    console.log('🔮 PolyPulse bot is running!');
    startAlertPolling();
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
