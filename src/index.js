import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { 
  searchMarketsFulltext, 
  getTrendingMarkets,
  parseOutcomes,
  formatVolume,
  formatPrice,
} from './polymarket.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// /start command
bot.start((ctx) => {
  ctx.reply(
    `🔮 *Welcome to PolyPulse!*\n\n` +
    `Your Polymarket insights companion.\n\n` +
    `*Commands:*\n` +
    `/price <query> — Get current odds for a market\n` +
    `/trending — Show top moving markets\n` +
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
    `/trending — Top 5 markets by 24h volume\n\n` +
    `*Examples:*\n` +
    `/price trump\n` +
    `/price bitcoin\n` +
    `/price interest rate`,
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

// Escape markdown special characters
function escapeMarkdown(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// Launch bot
bot.launch()
  .then(() => {
    console.log('🔮 PolyPulse bot is running!');
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
