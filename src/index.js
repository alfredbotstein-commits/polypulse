// PolyPulse Premium Bot
// Real-time Polymarket intelligence

import 'dotenv/config';
import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import Stripe from 'stripe';
import { CONFIG, ERRORS } from './config.js';
import {
  getOrCreateUser,
  isPremium,
  checkUsage,
  incrementUsage,
  setStripeCustomer,
  getUserAlerts,
  createAlert,
  deleteAlert,
  countUserAlerts,
  getAllActiveAlerts,
  triggerAlert,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  countWatchlist,
  getDigestSetting,
  setDigestSetting,
  getBriefingPrefs,
  upsertBriefingPrefs,
  setBriefingEnabled,
  setBriefingTimezone,
  setBriefingHour,
  parseTimezone,
  parseTimeString,
  getWhalePrefs,
  upsertWhalePrefs,
  setWhaleEnabled,
  getPositions,
  findPositionByMarket,
  createPosition,
  addToPosition,
  reducePosition,
  countOpenPositions,
  calculatePositionPnL,
  getSmartAlertPrefs,
  setSmartAlertEnabled,
  setSmartAlertParams,
  SMART_ALERT_TYPES,
  // P5: Category Subscriptions
  getCategorySubs,
  countCategorySubs,
  addCategorySub,
  removeCategorySub,
  VALID_CATEGORIES,
  // P6: Predictions / Leaderboard
  createPrediction,
  hasUserPredicted,
  getUserPrediction,
  getUserPredictions,
  getUserPredictionStats,
  getLeaderboard,
  getUserLeaderboardRank,
  countMonthlyPredictors,
} from './db.js';
import {
  searchMarketsFulltext,
  getTrendingMarkets,
  parseOutcomes,
  enrichMarket,
  getMarketsByCategory,
  getMarketsByTagId,
  getPopularTags,
  getTagEmoji,
  getMarketById,
  CATEGORIES,
} from './polymarket.js';

// Pagination state storage (in-memory, keyed by user ID)
const paginationState = new Map();
const PAGE_SIZE = 5;

/**
 * Get or initialize pagination state for a user
 */
function getPaginationState(userId, listType) {
  const key = `${userId}:${listType}`;
  if (!paginationState.has(key)) {
    paginationState.set(key, { page: 0, total: 0, data: [] });
  }
  return paginationState.get(key);
}

/**
 * Set pagination state for a user
 */
function setPaginationState(userId, listType, state) {
  const key = `${userId}:${listType}`;
  paginationState.set(key, state);
}
import {
  formatWelcome,
  formatTrending,
  formatPrice,
  formatPremiumUpsell,
  formatRateLimit,
  formatError,
  formatAlertCreated,
  formatAccount,
  escapeMarkdown,
  truncate,
  formatWatchlist,
  formatWatchAdded,
  formatDigestStatus,
  formatBriefingSettings,
  formatTimezoneSet,
  formatBriefingTimeSet,
  formatWhaleSettings,
  formatWhaleEnabled,
  formatWhaleDisabled,
  formatPortfolio,
  formatPnLSummary,
  formatBuyConfirmation,
  formatSellConfirmation,
  formatPortfolioUpsell,
  formatSmartAlertSettings,
  formatSmartAlertToggled,
  formatCategoriesSet,
  // Category subscriptions
  formatCategoriesList,
  formatMySubs,
  formatSubscribeConfirm,
  formatUnsubscribeConfirm,
  formatCategoryUpsell,
  // P6: Predictions / Leaderboard
  formatPredictionConfirm,
  formatPredictions,
  formatAccuracy,
  formatLeaderboard,
  formatLeaderboardUpsell,
  formatAlreadyPredicted,
  formatVolume,
} from './format.js';

// Initialize bot
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Initialize Stripe (optional - may not have credentials yet)
const STRIPE_ENABLED = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
const stripe = STRIPE_ENABLED ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ============ MIDDLEWARE ============

// User middleware - get or create user on every message
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      ctx.user = await getOrCreateUser(ctx.from.id, ctx.from.username);
      ctx.isPremium = isPremium(ctx.user);
    } catch (err) {
      console.error('User middleware error:', err);
    }
  }
  await next();
});

// ============ COMMANDS ============

// /start - Clean welcome with action buttons
bot.command('start', async (ctx) => {
  console.log('[DEBUG] /start command triggered by user:', ctx.from?.id);
  try {
    const keyboard = new InlineKeyboard()
      .text('🔥 Trending Markets', 'action:trending')
      .text('🔍 Browse Categories', 'action:categories')
      .row()
      .text('💰 My Portfolio', 'action:portfolio')
      .text('⭐ Go Premium', 'action:upgrade');
    
    const msg = `📊 *PolyPulse* — Real\\-time Polymarket intelligence

Track odds, set alerts, and never miss a market move\\.`;

    await ctx.reply(msg, { 
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Start command error:', err);
    // Fallback to plain text if MarkdownV2 fails
    await ctx.reply('📊 Welcome to PolyPulse!\n\nUse /help to see commands, or /trending to get started.');
  }
});

// /help - Commands list
bot.command('help', async (ctx) => {
  const msg = `*📊 PolyPulse — All Commands*

*Check Markets*
/trending — See the hottest markets right now
/price bitcoin — Get current odds on any market
/search election — Find markets by keyword

*Price Alerts*
/alert bitcoin 60 — Notify me when Bitcoin hits 60%
/alerts — See all my active alerts
/cancelalert — Remove an alert

*Watchlist*
/watch trump — Track a market
/watchlist — See my watched markets
/unwatch trump — Stop tracking a market

*Morning Briefing \\(Premium\\)*
/briefing — View briefing settings
/briefing on — Enable daily briefing
/briefing off — Disable briefing
/briefing time 7am — Set delivery time
/timezone EST — Set your timezone

*Whale Alerts \\(Premium\\)*
/whale — View whale alert settings
/whale on — Enable alerts \\($50K\\+\\)
/whale 100k — Only alert $100K\\+ bets
/whale off — Disable alerts

*Portfolio Tracker*
/portfolio — View all positions with P&L
/buy bitcoin 100 0\\.54 — Log buying 100 shares at 54¢
/sell bitcoin 50 0\\.73 — Log selling 50 shares at 73¢
/pnl — Quick P&L summary

*Smart Alerts \\(Premium\\)*
/smartalerts — View smart alert settings
/smartalert volume on — Enable volume spike alerts
/smartalert momentum off — Disable momentum alerts
/smartalert categories crypto,politics — Set new market categories

*Category Subscriptions*
/categories — List available categories
/subscribe crypto — Subscribe to all crypto markets
/subscribe politics,sports — Subscribe to multiple
/unsubscribe crypto — Unsubscribe from a category
/mysubs — View your subscriptions

*Predictions \\& Leaderboard*
/predict bitcoin\\-100k yes — Make a prediction
/predictions — View your prediction history
/accuracy — Your accuracy stats
/leaderboard — Top predictors this month \\(Premium\\)

*Account*
/account — Check my subscription status
/status — Same as /account
/upgrade — Get Premium \\($9\\.99/mo\\)

*Quick Shortcuts*
/market — Trending markets \\(same as /trending\\)
/top — Top markets or leaderboard
/cancel — How to cancel an alert

_Free: 3 alerts, 5 watchlist, 1 position, 1 category_
_Premium: Unlimited everything \\+ Briefing \\+ Whales_`;

  await ctx.reply(msg, { parse_mode: 'MarkdownV2' });
});

// /trending - Beautifully formatted trending markets
bot.command('trending', async (ctx) => {
  // Check usage for free users
  if (!ctx.isPremium) {
    const usage = await checkUsage(ctx.user, 'trending');
    if (!usage.allowed) {
      const hoursLeft = Math.ceil(24 - ((Date.now() - new Date(ctx.user.usage_reset_at)) / (1000 * 60 * 60)));
      return ctx.reply(formatRateLimit(hoursLeft, 'trending'), { parse_mode: 'MarkdownV2' });
    }
  }

  await ctx.replyWithChatAction('typing');

  try {
    const markets = await getTrendingMarkets(5);
    
    if (!ctx.isPremium) {
      await incrementUsage(ctx.user, 'trending');
    }

    await ctx.reply(formatTrending(markets), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Trending error:', err);
    await ctx.reply(formatError('apiDown'), { parse_mode: 'MarkdownV2' });
  }
});

// /price <query> - Rich market detail
bot.command('price', async (ctx) => {
  const query = ctx.match?.trim();
  
  if (!query) {
    return ctx.reply(
`*📊 Check Market Prices*

Type a keyword after /price to find a market:

/price bitcoin — Bitcoin prediction markets
/price trump — Trump\\-related markets
/price ethereum — ETH price predictions

_I'll show you the current odds and recent trends\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Check usage
  if (!ctx.isPremium) {
    const usage = await checkUsage(ctx.user, 'price');
    if (!usage.allowed) {
      const hoursLeft = Math.ceil(24 - ((Date.now() - new Date(ctx.user.usage_reset_at)) / (1000 * 60 * 60)));
      return ctx.reply(formatRateLimit(hoursLeft, 'price'), { parse_mode: 'MarkdownV2' });
    }
  }

  await ctx.replyWithChatAction('typing');

  try {
    const markets = await searchMarketsFulltext(query, 5);
    
    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    if (!ctx.isPremium) {
      await incrementUsage(ctx.user, 'price');
    }

    // Main market + related
    const mainMarket = markets[0];
    const related = markets.slice(1, 3);

    await ctx.reply(formatPrice(mainMarket, related), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Price error:', err);
    await ctx.reply(formatError('apiDown'), { parse_mode: 'MarkdownV2' });
  }
});

// /search <query> - Find markets
bot.command('search', async (ctx) => {
  const query = ctx.match?.trim();
  
  if (!query) {
    return ctx.reply(
`*🔍 Search Markets*

Type a keyword after /search to find markets:

/search crypto — Cryptocurrency markets
/search election — Election predictions
/search sports — Sports betting markets

_I'll show you matching markets with current odds\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Check usage
  if (!ctx.isPremium) {
    const usage = await checkUsage(ctx.user, 'search');
    if (!usage.allowed) {
      const hoursLeft = Math.ceil(24 - ((Date.now() - new Date(ctx.user.usage_reset_at)) / (1000 * 60 * 60)));
      return ctx.reply(formatRateLimit(hoursLeft, 'search'), { parse_mode: 'MarkdownV2' });
    }
  }

  await ctx.replyWithChatAction('typing');

  try {
    // Search for more markets to enable pagination
    const allMarkets = await searchMarketsFulltext(query, 50);
    
    if (allMarkets.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔍 Browse Categories', 'action:categories')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.reply(`🔍 *No results for "${escapeMarkdown(query)}"*\n\n_Try browsing by category instead\\._`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    if (!ctx.isPremium) {
      await incrementUsage(ctx.user, 'search');
    }

    const total = allMarkets.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const markets = allMarkets.slice(0, PAGE_SIZE);

    let msg = `*🔍 Results for "${escapeMarkdown(query)}"*`;
    if (totalPages > 1) msg += ` \\(1/${totalPages}\\)`;
    msg += `\n_${total} markets found_\n\n`;
    
    const keyboard = new InlineKeyboard();

    markets.forEach((m, i) => {
      const market = enrichMarket(m);
      const question = truncate(market.question, 40);
      const marketId = market.id || market.slug;
      
      // Format with price change context
      msg += `*${i + 1}\\.* ${escapeMarkdown(question)}\n`;
      msg += `   ${market.momentum} *${escapeMarkdown(market.yesPct)}* ${escapeMarkdown(market.priceChange)} \\(24h\\) · ${escapeMarkdown(market.volume)}\n\n`;
      
      // Add action buttons
      keyboard
        .text(`🔔 Alert #${i + 1}`, `alert:${marketId}`)
        .text(`👀 Watch #${i + 1}`, `watch:${marketId}`)
        .row();
    });

    // Pagination if more than one page
    if (totalPages > 1) {
      keyboard.text(`1/${totalPages}`, 'noop');
      keyboard.text('➡️ Next', `page:search:${encodeURIComponent(query)}:1`);
      keyboard.row();
    }

    keyboard
      .text('🔍 Categories', 'action:categories')
      .text('🏠 Home', 'action:back_home');

    await ctx.reply(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Search error:', err);
    await ctx.reply(formatError('apiDown'), { parse_mode: 'MarkdownV2' });
  }
});

// /alert <query> <price> - Set price alert
bot.command('alert', async (ctx) => {
  const args = ctx.match?.trim();
  
  // Parse: everything before last number is query
  const match = args?.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*%?$/);
  
  if (!match) {
    return ctx.reply(
`*🔔 Price Alerts*

Get notified when a market hits your target price\\.

*How to set an alert:*
\`/alert bitcoin 60\`

This finds a bitcoin market and alerts you when YES reaches 60%\\.

*Examples:*
• \`/alert trump 70\` — alert when Trump market hits 70%
• \`/alert ethereum 25\` — alert when ETH market drops to 25%
• \`/alert recession 50\` — alert at 50/50 odds

The bot checks every minute\\. When your price hits, you get a message and the alert is removed\\.

_Free: 3 alerts\\. Premium: unlimited\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  const query = match[1].trim();
  const threshold = parseFloat(match[2]) / 100; // Convert to decimal

  if (threshold <= 0 || threshold >= 1) {
    return ctx.reply('Price must be between 1\\-99%', { parse_mode: 'MarkdownV2' });
  }

  // Check alert limits
  const alertCount = await countUserAlerts(ctx.user.id);
  const maxAlerts = ctx.isPremium ? Infinity : CONFIG.FREE_LIMITS.alerts;

  if (alertCount >= maxAlerts) {
    if (!ctx.isPremium) {
      return ctx.reply(formatPremiumUpsell('alerts'), { parse_mode: 'MarkdownV2' });
    }
    return ctx.reply('You have too many alerts\\. Remove some with /alerts', { parse_mode: 'MarkdownV2' });
  }

  await ctx.replyWithChatAction('typing');

  try {
    const markets = await searchMarketsFulltext(query, 1);
    
    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    const market = markets[0];
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    
    if (!yesOutcome) {
      return ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
    }

    const currentPrice = yesOutcome.price;
    const direction = currentPrice < threshold ? 'above' : 'below';

    await createAlert(
      ctx.user.id,
      ctx.chat.id,
      market.id || market.slug,
      market.question,
      threshold,
      direction
    );

    await ctx.reply(
      formatAlertCreated(market, threshold, direction, currentPrice),
      { parse_mode: 'MarkdownV2' }
    );
  } catch (err) {
    console.error('Alert error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /alerts - List user's alerts
bot.command('alerts', async (ctx) => {
  try {
    const alerts = await getUserAlerts(ctx.user.id);
    
    if (alerts.length === 0) {
      return ctx.reply(
        '📭 *No active alerts*\n\n_Set one: /alert bitcoin 60_',
        { parse_mode: 'MarkdownV2' }
      );
    }

    const maxAlerts = ctx.isPremium ? '∞' : CONFIG.FREE_LIMITS.alerts;
    let msg = `*🔔 Your Alerts \\(${alerts.length}/${maxAlerts}\\)*\n\n`;

    alerts.forEach((alert, i) => {
      const dir = alert.direction === 'above' ? '≥' : '≤';
      const pct = (alert.threshold * 100).toFixed(0);
      const name = truncate(alert.market_name, 40);
      
      msg += `*${i + 1}\\.* ${escapeMarkdown(name)}\n`;
      msg += `   YES ${dir} ${pct}%\n`;
      msg += `   _ID: ${escapeMarkdown(alert.id.slice(0, 8))}_\n\n`;
    });

    msg += `_Cancel an alert: /cancelalert abc123_`;

    await ctx.reply(msg, { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Alerts error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /cancelalert <id> - Remove alert
bot.command('cancelalert', async (ctx) => {
  const alertId = ctx.match?.trim();
  
  if (!alertId) {
    return ctx.reply(
`*🔕 Cancel an Alert*

To cancel an alert, use the ID shown in /alerts:

1\\. Type /alerts to see your active alerts
2\\. Copy the ID \\(like abc123\\)
3\\. Type /cancelalert abc123

_Each alert shows its ID underneath the market name\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  try {
    // Try to find alert by partial ID match
    const alerts = await getUserAlerts(ctx.user.id);
    const alert = alerts.find(a => a.id.startsWith(alertId));

    if (!alert) {
      return ctx.reply('❌ Alert not found\\. Check /alerts for your IDs\\.', { parse_mode: 'MarkdownV2' });
    }

    await deleteAlert(alert.id, ctx.user.id);
    await ctx.reply('✅ Alert cancelled\\.', { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Cancel alert error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// ============ WATCHLIST COMMANDS ============

// /watch <query> - Add market to watchlist
bot.command('watch', async (ctx) => {
  const query = ctx.match?.trim();

  if (!query) {
    return ctx.reply(
`*📋 Add to Watchlist*

Type a keyword after /watch to track a market:

/watch bitcoin — Track Bitcoin markets
/watch trump — Track Trump markets
/watch recession — Track recession odds

_I'll save it to your watchlist so you can check it anytime with /watchlist\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Check watchlist limits
  const watchCount = await countWatchlist(ctx.user.id);
  const maxWatchlist = ctx.isPremium ? Infinity : CONFIG.FREE_LIMITS.watchlist;

  if (watchCount >= maxWatchlist) {
    if (!ctx.isPremium) {
      return ctx.reply(formatPremiumUpsell('watchlist'), { parse_mode: 'MarkdownV2' });
    }
    return ctx.reply('Your watchlist is full\\. Remove some with /unwatch', { parse_mode: 'MarkdownV2' });
  }

  await ctx.replyWithChatAction('typing');

  try {
    const markets = await searchMarketsFulltext(query, 1);

    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    const market = markets[0];
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    const currentPrice = yesOutcome?.price || 0;

    await addToWatchlist(ctx.user.id, market.id || market.slug, market.question, currentPrice);

    await ctx.reply(formatWatchAdded(market, currentPrice), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Watch error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /watchlist - Show watched markets
bot.command('watchlist', async (ctx) => {
  try {
    const watchlist = await getWatchlist(ctx.user.id);

    if (watchlist.length === 0) {
      return ctx.reply(
        '📭 *Your watchlist is empty*\n\n_Add markets: /watch bitcoin_',
        { parse_mode: 'MarkdownV2' }
      );
    }

    await ctx.replyWithChatAction('typing');

    // Fetch current prices for each market
    const enrichedList = [];
    for (const item of watchlist) {
      try {
        const markets = await searchMarketsFulltext(item.market_id, 1);
        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
          enrichedList.push({
            ...item,
            currentPrice: yesOutcome?.price || 0,
            market: markets[0],
          });
        } else {
          enrichedList.push({ ...item, currentPrice: item.added_price || 0, market: null });
        }
      } catch {
        enrichedList.push({ ...item, currentPrice: item.added_price || 0, market: null });
      }
    }

    const maxItems = ctx.isPremium ? '∞' : CONFIG.FREE_LIMITS.watchlist;
    await ctx.reply(formatWatchlist(enrichedList, maxItems), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Watchlist error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /unwatch <query> - Remove from watchlist
bot.command('unwatch', async (ctx) => {
  const query = ctx.match?.trim();

  if (!query) {
    return ctx.reply(
`*📋 Remove from Watchlist*

Type a keyword after /unwatch to stop tracking a market:

/unwatch bitcoin — Stop tracking Bitcoin
/unwatch trump — Stop tracking Trump

_Check /watchlist to see what you're currently tracking\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  try {
    // Search user's watchlist for matching market
    const watchlist = await getWatchlist(ctx.user.id);
    const queryLower = query.toLowerCase();
    
    const match = watchlist.find(item => 
      item.market_name?.toLowerCase().includes(queryLower) ||
      item.market_id?.toLowerCase().includes(queryLower)
    );

    if (!match) {
      return ctx.reply('❌ Market not found in your watchlist\\. Check /watchlist', { parse_mode: 'MarkdownV2' });
    }

    await removeFromWatchlist(ctx.user.id, match.market_id);
    await ctx.reply(`✅ Removed from watchlist: _${escapeMarkdown(truncate(match.market_name, 40))}_`, { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Unwatch error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// ============ DIGEST COMMANDS ============

// /digest - Manage daily digest (Premium only)
bot.command('digest', async (ctx) => {
  const arg = ctx.match?.trim().toLowerCase();

  // Premium only
  if (!ctx.isPremium) {
    return ctx.reply(formatPremiumUpsell('digest'), { parse_mode: 'MarkdownV2' });
  }

  if (arg === 'on') {
    await setDigestSetting(ctx.user.id, true);
    return ctx.reply(formatDigestStatus(true), { parse_mode: 'MarkdownV2' });
  }

  if (arg === 'off') {
    await setDigestSetting(ctx.user.id, false);
    return ctx.reply(formatDigestStatus(false), { parse_mode: 'MarkdownV2' });
  }

  // No argument - show current status
  const setting = await getDigestSetting(ctx.user.id);
  const status = setting.digest_enabled ? 'enabled' : 'disabled';
  const hour = setting.digest_hour || 13;
  
  // Convert UTC hour to friendly time
  const time = `${hour}:00 UTC`;

  const msg = `*📬 Daily Digest*

Status: ${setting.digest_enabled ? '✅ Enabled' : '❌ Disabled'}
Time: ${escapeMarkdown(time)}

Your daily digest includes:
• Watchlist price changes
• Triggered alerts summary
• Top 5 movers

_/digest on — Enable digest_
_/digest off — Disable digest_`;

  return ctx.reply(msg, { parse_mode: 'MarkdownV2' });
});

// ============ BRIEFING COMMANDS ============

// /briefing - Morning briefing management (Premium only)
bot.command('briefing', async (ctx) => {
  const args = ctx.match?.trim().toLowerCase();

  // Premium only
  if (!ctx.isPremium) {
    return ctx.reply(formatBriefingSettings(null, false), { parse_mode: 'MarkdownV2' });
  }

  // Get current prefs
  const prefs = await getBriefingPrefs(ctx.from.id);

  // Handle subcommands
  if (args === 'on') {
    await upsertBriefingPrefs(ctx.from.id, { enabled: true });
    return ctx.reply('✅ *Morning briefing enabled\\!*\n\n_You\'ll receive your daily digest every morning\\._', { parse_mode: 'MarkdownV2' });
  }

  if (args === 'off') {
    await upsertBriefingPrefs(ctx.from.id, { enabled: false });
    return ctx.reply('❌ *Morning briefing disabled*\n\n_Re\\-enable anytime: /briefing on_', { parse_mode: 'MarkdownV2' });
  }

  // Handle /briefing time 7am
  if (args.startsWith('time ')) {
    const timeStr = args.replace('time ', '').trim();
    const hour = parseTimeString(timeStr);
    
    if (hour === null) {
      return ctx.reply('❌ Invalid time format\\. Try: `/briefing time 7am` or `/briefing time 14:00`', { parse_mode: 'MarkdownV2' });
    }

    await upsertBriefingPrefs(ctx.from.id, { send_hour: hour });
    const timezone = prefs?.timezone || 'UTC';
    return ctx.reply(formatBriefingTimeSet(hour, timezone), { parse_mode: 'MarkdownV2' });
  }

  // No args - show current settings
  return ctx.reply(formatBriefingSettings(prefs, true), { parse_mode: 'MarkdownV2' });
});

// /timezone - Set timezone (Premium only)
bot.command('timezone', async (ctx) => {
  const args = ctx.match?.trim();

  // Premium only
  if (!ctx.isPremium) {
    return ctx.reply(formatPremiumUpsell('briefing'), { parse_mode: 'MarkdownV2' });
  }

  if (!args) {
    return ctx.reply(
`🌍 *Set Your Timezone*

Type your timezone after /timezone:

\`/timezone EST\` — Eastern Time
\`/timezone PST\` — Pacific Time
\`/timezone CST\` — Central Time
\`/timezone UTC\` — Coordinated Universal Time

_This sets when you receive your morning briefing\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  const timezone = parseTimezone(args);
  
  if (!timezone) {
    return ctx.reply(
      '❌ Unknown timezone\\. Try: EST, PST, CST, MST, UTC, GMT, CET, JST',
      { parse_mode: 'MarkdownV2' }
    );
  }

  await upsertBriefingPrefs(ctx.from.id, { timezone });
  const prefs = await getBriefingPrefs(ctx.from.id);
  const hour = prefs?.send_hour ?? 8;

  return ctx.reply(formatTimezoneSet(timezone, hour), { parse_mode: 'MarkdownV2' });
});

// /whale - Whale alert management (Premium only)
bot.command('whale', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ').trim().toLowerCase();

  // Check premium
  if (!ctx.isPremium) {
    return ctx.reply(formatWhaleSettings(null, false), { parse_mode: 'MarkdownV2' });
  }

  const prefs = await getWhalePrefs(ctx.from.id);

  // No args - show status
  if (!args) {
    return ctx.reply(formatWhaleSettings(prefs, true), { parse_mode: 'MarkdownV2' });
  }

  // /whale on
  if (args === 'on') {
    await setWhaleEnabled(ctx.from.id, true, 50000);
    return ctx.reply(formatWhaleEnabled(50000), { parse_mode: 'MarkdownV2' });
  }

  // /whale off
  if (args === 'off') {
    await setWhaleEnabled(ctx.from.id, false);
    return ctx.reply(formatWhaleDisabled(), { parse_mode: 'MarkdownV2' });
  }

  // /whale 100k, /whale 500k, etc.
  const amountMatch = args.match(/^(\d+)k?$/i);
  if (amountMatch) {
    let amount = parseInt(amountMatch[1], 10);
    
    // Handle "100k" format vs "100000"
    if (amount <= 1000) {
      amount *= 1000;  // e.g., "100" or "100k" -> 100000
    }

    // Minimum $50K, maximum $10M
    if (amount < 50000) amount = 50000;
    if (amount > 10000000) amount = 10000000;

    await setWhaleEnabled(ctx.from.id, true, amount);
    return ctx.reply(formatWhaleEnabled(amount), { parse_mode: 'MarkdownV2' });
  }

  // Invalid input
  return ctx.reply(
    '❌ Invalid command\\. Try:\n`/whale on` — Enable \\($50K\\+\\)\n`/whale 100k` — Only $100K\\+ bets\n`/whale off` — Disable',
    { parse_mode: 'MarkdownV2' }
  );
});

// ============ PORTFOLIO COMMANDS ============

// /portfolio - View all positions with P&L
bot.command('portfolio', async (ctx) => {
  // Free users get 1 position, premium unlimited
  const positionCount = await countOpenPositions(ctx.from.id);
  
  if (positionCount === 0) {
    return ctx.reply(formatPortfolioUpsell(), { parse_mode: 'MarkdownV2' });
  }

  await ctx.replyWithChatAction('typing');

  try {
    const positions = await getPositions(ctx.from.id);
    
    // Enrich with current prices
    const enrichedPositions = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const pos of positions) {
      try {
        // Get current price from Polymarket
        const markets = await searchMarketsFulltext(pos.market_id, 1);
        let currentPrice = parseFloat(pos.entry_price); // fallback

        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const outcome = outcomes.find(o => 
            o.name.toUpperCase() === pos.side.toUpperCase()
          ) || outcomes[0];
          currentPrice = outcome?.price || currentPrice;
        }

        const pnl = calculatePositionPnL(pos, currentPrice);
        enrichedPositions.push({ ...pos, pnl });
        
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      } catch {
        // Use entry price as fallback
        const pnl = calculatePositionPnL(pos, pos.entry_price);
        enrichedPositions.push({ ...pos, pnl });
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      }
    }

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? ((totalCurrentValue / totalInvested) - 1) * 100 : 0;

    const totalStats = {
      invested: totalInvested,
      currentValue: totalCurrentValue,
      pnl: totalPnl,
      pnlPercent: totalPnlPercent,
    };

    await ctx.reply(formatPortfolio(enrichedPositions, totalStats), { 
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Portfolio error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /buy <market> <shares> <price> - Log a buy
bot.command('buy', async (ctx) => {
  const args = ctx.match?.trim();

  if (!args) {
    return ctx.reply(
`📈 *Log a Buy*

Record a position you bought on Polymarket\\.

*Format:* \`/buy market shares price\`

*Examples:*
\`/buy bitcoin\\-100k 100 0\\.54\` — 100 shares at 54¢
\`/buy trump 200 0\\.31\` — 200 shares at 31¢
\`/buy eth\\-etf 150 0\\.48\` — 150 shares at 48¢

_The price is in decimal \\(0\\.54 = 54¢\\)_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Parse: market shares price
  const match = args.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d*\.?\d+)$/);
  
  if (!match) {
    return ctx.reply(
      '❌ Invalid format\\. Use: `/buy market shares price`\nExample: `/buy bitcoin 100 0\\.54`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  const marketQuery = match[1].trim();
  const shares = parseFloat(match[2]);
  const price = parseFloat(match[3]);

  if (shares <= 0) {
    return ctx.reply('❌ Shares must be positive\\.', { parse_mode: 'MarkdownV2' });
  }

  if (price <= 0 || price >= 1) {
    return ctx.reply('❌ Price must be between 0 and 1 \\(e\\.g\\., 0\\.54 = 54¢\\)\\.', { parse_mode: 'MarkdownV2' });
  }

  // Check position limits for free users
  if (!ctx.isPremium) {
    const posCount = await countOpenPositions(ctx.from.id);
    if (posCount >= 1) {
      // Check if this would be adding to existing position
      const existing = await findPositionByMarket(ctx.from.id, marketQuery);
      if (!existing) {
        return ctx.reply(formatPremiumUpsell('portfolio'), { parse_mode: 'MarkdownV2' });
      }
    }
  }

  await ctx.replyWithChatAction('typing');

  try {
    // Find the market
    const markets = await searchMarketsFulltext(marketQuery, 1);
    
    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    const market = markets[0];
    const marketId = market.id || market.slug;

    // Check if user already has a position in this market
    const existing = await findPositionByMarket(ctx.from.id, marketId);

    let position;
    let isNewPosition = true;

    if (existing) {
      // Add to existing position
      position = await addToPosition(existing.id, shares, price, ctx.from.id);
      isNewPosition = false;
    } else {
      // Create new position
      position = await createPosition(
        ctx.from.id,
        marketId,
        market.question,
        'YES', // Default to YES side
        shares,
        price
      );
    }

    await ctx.reply(formatBuyConfirmation(position, isNewPosition), { 
      parse_mode: 'MarkdownV2' 
    });
  } catch (err) {
    console.error('Buy error:', err);
    await ctx.reply(`❌ ${escapeMarkdown(err.message || 'Could not log trade')}`, { 
      parse_mode: 'MarkdownV2' 
    });
  }
});

// /sell <market> <shares> <price> - Log a sell
bot.command('sell', async (ctx) => {
  const args = ctx.match?.trim();

  if (!args) {
    return ctx.reply(
`📉 *Log a Sell*

Record a position you sold on Polymarket\\.

*Format:* \`/sell market shares price\`

*Examples:*
\`/sell bitcoin\\-100k 50 0\\.73\` — Sold 50 shares at 73¢
\`/sell trump 100 0\\.42\` — Sold 100 shares at 42¢

_The price is in decimal \\(0\\.73 = 73¢\\)_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Parse: market shares price
  const match = args.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d*\.?\d+)$/);
  
  if (!match) {
    return ctx.reply(
      '❌ Invalid format\\. Use: `/sell market shares price`\nExample: `/sell bitcoin 50 0\\.73`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  const marketQuery = match[1].trim();
  const shares = parseFloat(match[2]);
  const price = parseFloat(match[3]);

  if (shares <= 0) {
    return ctx.reply('❌ Shares must be positive\\.', { parse_mode: 'MarkdownV2' });
  }

  if (price <= 0 || price >= 1) {
    return ctx.reply('❌ Price must be between 0 and 1 \\(e\\.g\\., 0\\.73 = 73¢\\)\\.', { parse_mode: 'MarkdownV2' });
  }

  await ctx.replyWithChatAction('typing');

  try {
    // Find user's position in this market
    const position = await findPositionByMarket(ctx.from.id, marketQuery);
    
    if (!position) {
      return ctx.reply(
        '❌ No open position found for that market\\. Check /portfolio',
        { parse_mode: 'MarkdownV2' }
      );
    }

    // Calculate P&L on this sale
    const entryPrice = parseFloat(position.entry_price);
    const saleProceeds = shares * price;
    const costBasis = shares * entryPrice;
    const pnlOnSale = saleProceeds - costBasis;

    // Execute the sell
    const result = await reducePosition(position.id, shares, price, ctx.from.id);

    await ctx.reply(
      formatSellConfirmation(result, shares, price, pnlOnSale, result.fullyClosed),
      { parse_mode: 'MarkdownV2' }
    );
  } catch (err) {
    console.error('Sell error:', err);
    await ctx.reply(`❌ ${escapeMarkdown(err.message || 'Could not log trade')}`, { 
      parse_mode: 'MarkdownV2' 
    });
  }
});

// /pnl - Quick P&L summary
bot.command('pnl', async (ctx) => {
  await ctx.replyWithChatAction('typing');

  try {
    const positions = await getPositions(ctx.from.id);
    
    if (positions.length === 0) {
      return ctx.reply(
        '📊 *No open positions*\n\n_Log a trade: /buy bitcoin 100 0\\.54_',
        { parse_mode: 'MarkdownV2' }
      );
    }

    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const pos of positions) {
      try {
        const markets = await searchMarketsFulltext(pos.market_id, 1);
        let currentPrice = parseFloat(pos.entry_price);

        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const outcome = outcomes.find(o => 
            o.name.toUpperCase() === pos.side.toUpperCase()
          ) || outcomes[0];
          currentPrice = outcome?.price || currentPrice;
        }

        const pnl = calculatePositionPnL(pos, currentPrice);
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      } catch {
        const pnl = calculatePositionPnL(pos, pos.entry_price);
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      }
    }

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? ((totalCurrentValue / totalInvested) - 1) * 100 : 0;

    const totalStats = {
      invested: totalInvested,
      currentValue: totalCurrentValue,
      pnl: totalPnl,
      pnlPercent: totalPnlPercent,
    };

    await ctx.reply(formatPnLSummary(totalStats, positions.length), { 
      parse_mode: 'MarkdownV2' 
    });
  } catch (err) {
    console.error('PnL error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// ============ SMART ALERT COMMANDS ============

// VALID_CATEGORIES is now an array imported directly from db.js

// /smartalerts - View smart alert settings
bot.command('smartalerts', async (ctx) => {
  // Premium check
  if (!ctx.isPremium) {
    return ctx.reply(formatSmartAlertSettings([], false), { parse_mode: 'MarkdownV2' });
  }

  try {
    const prefs = await getSmartAlertPrefs(ctx.from.id);
    return ctx.reply(formatSmartAlertSettings(prefs, true), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Smart alerts error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /smartalert <type> <on|off> OR /smartalert categories <list>
bot.command('smartalert', async (ctx) => {
  const args = ctx.match?.trim().toLowerCase();

  // Premium check
  if (!ctx.isPremium) {
    return ctx.reply(formatSmartAlertSettings([], false), { parse_mode: 'MarkdownV2' });
  }

  if (!args) {
    return ctx.reply(
`🧠 *Smart Alerts*

*Usage:*
\`/smartalert volume on\` — Enable volume spike alerts
\`/smartalert momentum off\` — Disable momentum alerts
\`/smartalert categories crypto,politics\` — Set categories

*Alert types:*
• \`volume\` — 3x\\+ normal volume spikes
• \`momentum\` — 10%\\+ moves in 4 hours
• \`divergence\` — Correlated markets decouple
• \`newmarket\` — New markets in your categories

_View current settings: /smartalerts_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Handle /smartalert categories crypto,politics
  if (args.startsWith('categories ')) {
    const catStr = args.replace('categories ', '').trim();
    const categories = catStr.split(/[,\s]+/).filter(c => c.length > 0);
    
    // Validate categories
    const validCats = categories.filter(c => VALID_CATEGORIES.includes(c.toLowerCase()));
    
    if (validCats.length === 0) {
      return ctx.reply(
        `❌ No valid categories\\. Available: ${escapeMarkdown(VALID_CATEGORIES.join(', '))}`,
        { parse_mode: 'MarkdownV2' }
      );
    }

    try {
      await setSmartAlertParams(ctx.from.id, 'new_market', { categories: validCats });
      // Also enable new_market alerts
      await setSmartAlertEnabled(ctx.from.id, 'new_market', true);
      return ctx.reply(formatCategoriesSet(validCats), { parse_mode: 'MarkdownV2' });
    } catch (err) {
      console.error('Set categories error:', err);
      return ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
    }
  }

  // Parse: /smartalert <type> <on|off>
  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    return ctx.reply(
      '❌ Usage: `/smartalert volume on` or `/smartalert momentum off`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  const typeArg = parts[0];
  const action = parts[1];

  // Map user-friendly names to db alert types
  const typeMap = {
    'volume': 'volume_spike',
    'volumespike': 'volume_spike',
    'volume_spike': 'volume_spike',
    'momentum': 'momentum',
    'divergence': 'divergence',
    'newmarket': 'new_market',
    'new_market': 'new_market',
    'newmarkets': 'new_market',
  };

  const alertType = typeMap[typeArg];
  
  if (!alertType) {
    return ctx.reply(
      `❌ Unknown alert type: "${escapeMarkdown(typeArg)}"\\. Try: volume, momentum, divergence, newmarket`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  const enabled = action === 'on' || action === 'enable' || action === 'true' || action === '1';
  const disabled = action === 'off' || action === 'disable' || action === 'false' || action === '0';

  if (!enabled && !disabled) {
    return ctx.reply(
      '❌ Use "on" or "off"\\. Example: `/smartalert volume on`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  try {
    await setSmartAlertEnabled(ctx.from.id, alertType, enabled);
    return ctx.reply(formatSmartAlertToggled(alertType, enabled), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Smart alert toggle error:', err);
    return ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// ============ CATEGORY SUBSCRIPTION COMMANDS ============

// /categories - List available categories
// /categories - List available categories
bot.command('categories', async (ctx) => {
  try {
    const userSubs = await getCategorySubs(ctx.from.id);
    await ctx.reply(formatCategoriesList(userSubs), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Categories error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /subscribe <category> - Subscribe to category(ies)
bot.command('subscribe', async (ctx) => {
  const args = ctx.match?.trim().toLowerCase();

  if (!args) {
    return ctx.reply(
`📂 *Subscribe to Categories*

Subscribe to entire categories instead of individual markets\\.

*Usage:*
\`/subscribe crypto\` — Subscribe to crypto markets
\`/subscribe politics,sports\` — Multiple categories

*What you get:*
• Alerts for new markets in your categories
• Category\\-specific updates

*Available:* crypto, politics, sports, tech, economics, entertainment, world

_See all: /categories_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Parse categories (comma or space separated)
  const requestedCats = args.split(/[,\s]+/).filter(c => c.length > 0);
  
  // Validate categories
  const validCats = requestedCats.filter(c => VALID_CATEGORIES.includes(c.toLowerCase()));
  
  if (validCats.length === 0) {
    return ctx.reply(
      `❌ No valid categories\\. Available: ${escapeMarkdown(VALID_CATEGORIES.join(', '))}`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  try {
    // Get current subscriptions
    const currentSubs = await getCategorySubs(ctx.from.id);
    const currentCatNames = currentSubs.map(s => s.category);
    
    // Filter out already subscribed
    const newCats = validCats.filter(c => !currentCatNames.includes(c.toLowerCase()));
    const alreadySubscribed = validCats.filter(c => currentCatNames.includes(c.toLowerCase()));

    // Check limits for free users
    if (!ctx.isPremium && newCats.length > 0) {
      const currentCount = currentSubs.length;
      if (currentCount >= 1) {
        return ctx.reply(formatCategoryUpsell(), { parse_mode: 'MarkdownV2' });
      }
      // Free users can only add 1 total
      if (newCats.length > 1) {
        newCats.splice(1); // Keep only first one
      }
    }

    // Subscribe to new categories
    const added = [];
    for (const cat of newCats) {
      try {
        await addCategorySub(ctx.from.id, cat);
        added.push(cat);
        
        // Free users can only have 1 total
        if (!ctx.isPremium) {
          const currentCount = await countCategorySubs(ctx.from.id);
          if (currentCount >= 1) break;
        }
      } catch (err) {
        console.error(`Failed to subscribe to ${cat}:`, err.message);
      }
    }

    if (added.length === 0 && alreadySubscribed.length > 0) {
      return ctx.reply(
        `ℹ️ You're already subscribed to: ${escapeMarkdown(alreadySubscribed.join(', '))}`,
        { parse_mode: 'MarkdownV2' }
      );
    }

    await ctx.reply(formatSubscribeConfirm(added), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Subscribe error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /unsubscribe <category> - Unsubscribe from a category
bot.command('unsubscribe', async (ctx) => {
  const args = ctx.match?.trim().toLowerCase();

  if (!args) {
    return ctx.reply(
`📂 *Unsubscribe from Categories*

*Usage:*
\`/unsubscribe crypto\` — Unsubscribe from crypto

_Check your subscriptions: /mysubs_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Find matching category
  const category = args.trim();
  
  if (!VALID_CATEGORIES.includes(category)) {
    return ctx.reply(
      `❌ Unknown category: "${escapeMarkdown(category)}"\\. Check /categories for valid options\\.`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  try {
    const removed = await removeCategorySub(ctx.from.id, category);
    
    if (!removed) {
      return ctx.reply(
        `❌ You're not subscribed to ${escapeMarkdown(category)}\\. Check /mysubs`,
        { parse_mode: 'MarkdownV2' }
      );
    }

    await ctx.reply(formatUnsubscribeConfirm(category), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /mysubs - View active category subscriptions
bot.command('mysubs', async (ctx) => {
  try {
    const subs = await getCategorySubs(ctx.from.id);
    await ctx.reply(formatMySubs(subs, ctx.isPremium), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Mysubs error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// ============ PREDICTION / LEADERBOARD COMMANDS ============

// /predict <market> <yes|no> - Make a prediction
bot.command('predict', async (ctx) => {
  const args = ctx.match?.trim();

  if (!args) {
    return ctx.reply(
`🎯 *Make a Prediction*

Predict the outcome of any market — for free\\!

*Usage:*
\`/predict bitcoin\\-100k yes\` — Predict YES
\`/predict trump no\` — Predict NO

*How it works:*
• Find a market with /trending or /search
• Make your prediction
• We track your accuracy over time
• Top predictors make the leaderboard 🏆

_Start with: /predict bitcoin yes_`,
      { parse_mode: 'MarkdownV2' }
    );
  }

  // Parse: everything before last word is market query, last word is prediction
  const parts = args.trim().split(/\s+/);
  const lastWord = parts[parts.length - 1].toLowerCase();
  
  // Check if last word is a valid prediction (yes/no)
  if (lastWord !== 'yes' && lastWord !== 'no') {
    return ctx.reply(
      '❌ End with "yes" or "no"\\. Example: `/predict bitcoin yes`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  const prediction = lastWord.toUpperCase();
  const marketQuery = parts.slice(0, -1).join(' ');

  if (!marketQuery) {
    return ctx.reply(
      '❌ Specify a market\\. Example: `/predict bitcoin\\-100k yes`',
      { parse_mode: 'MarkdownV2' }
    );
  }

  await ctx.replyWithChatAction('typing');

  try {
    // Find the market
    const markets = await searchMarketsFulltext(marketQuery, 1);
    
    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    const market = markets[0];
    const marketId = market.id || market.slug;

    // Check if user already predicted on this market
    const alreadyPredicted = await hasUserPredicted(ctx.from.id, marketId);
    if (alreadyPredicted) {
      const existing = await getUserPrediction(ctx.from.id, marketId);
      return ctx.reply(formatAlreadyPredicted(existing), { parse_mode: 'MarkdownV2' });
    }

    // Get current odds
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    const currentOdds = yesOutcome?.price || 0.5;

    // Create the prediction
    await createPrediction(
      ctx.from.id,
      marketId,
      market.question,
      prediction,
      currentOdds
    );

    await ctx.reply(formatPredictionConfirm(market, prediction, currentOdds), { 
      parse_mode: 'MarkdownV2' 
    });
  } catch (err) {
    console.error('Predict error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /predictions - View prediction history
bot.command('predictions', async (ctx) => {
  try {
    const predictions = await getUserPredictions(ctx.from.id, 20);
    const stats = await getUserPredictionStats(ctx.from.id);
    
    await ctx.reply(formatPredictions(predictions, stats), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Predictions error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /accuracy - Your accuracy stats
bot.command('accuracy', async (ctx) => {
  try {
    const stats = await getUserPredictionStats(ctx.from.id);
    const leaderboardRank = await getUserLeaderboardRank(ctx.from.id);
    
    await ctx.reply(formatAccuracy(stats, leaderboardRank), { parse_mode: 'MarkdownV2' });
  } catch (err) {
    console.error('Accuracy error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /leaderboard - Top predictors this month
bot.command('leaderboard', async (ctx) => {
  // Premium only for full leaderboard
  if (!ctx.isPremium) {
    const stats = await getUserPredictionStats(ctx.from.id);
    return ctx.reply(formatLeaderboardUpsell(stats), { parse_mode: 'MarkdownV2' });
  }

  try {
    await ctx.replyWithChatAction('typing');
    
    const entries = await getLeaderboard(10);
    const userRank = await getUserLeaderboardRank(ctx.from.id);
    const totalPredictors = await countMonthlyPredictors();
    
    await ctx.reply(formatLeaderboard(entries, userRank, totalPredictors), { 
      parse_mode: 'MarkdownV2' 
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    await ctx.reply(formatError('generic'), { parse_mode: 'MarkdownV2' });
  }
});

// /account - Subscription status
bot.command('account', async (ctx) => {
  await ctx.reply(formatAccount(ctx.user, ctx.isPremium), {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  });
});

// /upgrade - Generate Stripe checkout
bot.command('upgrade', async (ctx) => {
  if (ctx.isPremium) {
    return ctx.reply('✨ You\'re already Premium\\! Thank you for your support\\.', { parse_mode: 'MarkdownV2' });
  }

  // Check if Stripe is configured
  if (!STRIPE_ENABLED) {
    const msg = `*✨ Upgrade to Premium*

${CONFIG.PREMIUM_PRICE_DISPLAY} — cancel anytime\\.

*Premium includes:*
• Unlimited price alerts
• Whale movement notifications
• Daily market digests
• Watchlist \\& portfolio tracking
• Priority support

🚧 _Payment integration coming soon\\!_

We'll notify you when Premium is available\\.`;

    return ctx.reply(msg, { parse_mode: 'MarkdownV2' });
  }

  await ctx.replyWithChatAction('typing');

  try {
    // Create or get Stripe customer
    let customerId = ctx.user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          telegram_id: ctx.from.id.toString(),
          telegram_username: ctx.from.username || '',
        },
      });
      customerId = customer.id;
      await setStripeCustomer(ctx.from.id, customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${process.env.BOT_URL || 'https://t.me/GetPolyPulse_bot'}?start=upgraded`,
      cancel_url: `${process.env.BOT_URL || 'https://t.me/GetPolyPulse_bot'}?start=cancelled`,
      metadata: {
        telegram_id: ctx.from.id.toString(),
      },
    });

    const msg = `*✨ Upgrade to Premium*

${CONFIG.PREMIUM_PRICE_DISPLAY} — cancel anytime\\.

Tap below to complete your upgrade:

[🚀 Start Premium →](${session.url})

_Secure payment via Stripe\\._`;

    await ctx.reply(msg, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: false,
    });
  } catch (err) {
    console.error('Upgrade error:', err);
    await ctx.reply('❌ Could not create checkout\\. Please try again\\.', { parse_mode: 'MarkdownV2' });
  }
});

// ============ COMMAND ALIASES ============

// /market → alias for /trending
bot.command('market', async (ctx) => {
  return ctx.api.sendMessage(ctx.chat.id, 'Use /trending to see trending markets or /price <keyword> to check specific markets.');
});

// /top → alias for /trending
bot.command('top', async (ctx) => {
  return ctx.api.sendMessage(ctx.chat.id, 'Use /trending for top markets or /leaderboard for prediction rankings.');
});

// /status → alias for /account
bot.command('status', async (ctx) => {
  const { formatAccount } = await import('./format.js');
  await ctx.reply(formatAccount(ctx.user, ctx.isPremium), {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
  });
});

// /cancel → alias for /cancelalert
bot.command('cancel', async (ctx) => {
  return ctx.api.sendMessage(ctx.chat.id, 'To cancel an alert, use /cancelalert <id>\\. View your alerts with /alerts first\\.', { parse_mode: 'MarkdownV2' });
});

// ============ CALLBACK QUERY HANDLERS ============

// Handle all callback queries (button taps)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  // Acknowledge the callback immediately
  await ctx.answerCallbackQuery();
  
  // Route based on callback data prefix
  if (data === 'noop') {
    // Do nothing - for page number display buttons
    return;
  } else if (data.startsWith('action:')) {
    const action = data.replace('action:', '');
    await handleMainAction(ctx, action);
  } else if (data.startsWith('cat:')) {
    const category = data.replace('cat:', '');
    await handleCategoryBrowse(ctx, category);
  } else if (data.startsWith('page:')) {
    // Handle pagination: page:listType:pageNum OR page:cat:category:pageNum
    await handlePagination(ctx, data);
  } else if (data.startsWith('market:')) {
    const parts = data.replace('market:', '').split(':');
    await handleMarketAction(ctx, parts[0], parts[1]);
  } else if (data.startsWith('alert:')) {
    const marketId = data.replace('alert:', '');
    await handleAlertSetup(ctx, marketId);
  } else if (data.startsWith('threshold:')) {
    const parts = data.replace('threshold:', '').split(':');
    await handleAlertThreshold(ctx, parts[0], parts[1]);
  } else if (data.startsWith('watch:')) {
    const marketId = data.replace('watch:', '');
    await handleWatchAdd(ctx, marketId);
  } else if (data.startsWith('briefing:')) {
    const action = data.replace('briefing:', '');
    await handleBriefingAction(ctx, action);
  } else if (data.startsWith('whale:')) {
    const action = data.replace('whale:', '');
    await handleWhaleAction(ctx, action);
  }
});

// Handle pagination callbacks
async function handlePagination(ctx, data) {
  const parts = data.replace('page:', '').split(':');
  
  if (parts[0] === 'trending') {
    const page = parseInt(parts[1], 10) || 0;
    await showTrendingWithButtons(ctx, page);
  } else if (parts[0] === 'cat') {
    const category = parts[1];
    const page = parseInt(parts[2], 10) || 0;
    await handleCategoryBrowse(ctx, category, page);
  } else if (parts[0] === 'search') {
    const query = parts[1];
    const page = parseInt(parts[2], 10) || 0;
    await handleSearchPagination(ctx, query, page);
  }
}

// Handle search results with pagination
async function handleSearchPagination(ctx, query, page) {
  try {
    await ctx.editMessageText('🔍 Searching\\.\\.\\.', { parse_mode: 'MarkdownV2' });
    
    const allMarkets = await searchMarketsFulltext(query, 50);
    const total = allMarkets.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    
    if (page < 0) page = 0;
    if (page >= totalPages && totalPages > 0) page = totalPages - 1;
    
    const markets = allMarkets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    
    if (markets.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔍 Browse Categories', 'action:categories')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText(`🔍 No results for "${escapeMarkdown(query)}"\\.\n\n_Try browsing by category\\._`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }
    
    let msg = `*🔍 Results for "${escapeMarkdown(query)}"*`;
    if (totalPages > 1) msg += ` \\(${page + 1}/${totalPages}\\)`;
    msg += `\n_${total} markets found_\n\n`;
    
    const keyboard = new InlineKeyboard();
    const startNum = page * PAGE_SIZE;
    
    markets.forEach((m, i) => {
      const market = enrichMarket(m);
      const question = truncate(market.question, 40);
      const marketId = market.id || market.slug;
      
      msg += `*${startNum + i + 1}\\.* ${escapeMarkdown(question)}\n`;
      msg += `   ${market.momentum} *${escapeMarkdown(market.yesPct)}* ${escapeMarkdown(market.priceChange)} \\(24h\\) · ${escapeMarkdown(market.volume)}\n\n`;
      
      keyboard
        .text(`🔔 #${startNum + i + 1}`, `alert:${marketId}`)
        .text(`👀 #${startNum + i + 1}`, `watch:${marketId}`)
        .row();
    });
    
    // Pagination controls
    if (totalPages > 1) {
      if (page > 0) keyboard.text('⬅️ Prev', `page:search:${encodeURIComponent(query)}:${page - 1}`);
      keyboard.text(`${page + 1}/${totalPages}`, 'noop');
      if (page < totalPages - 1) keyboard.text('➡️ Next', `page:search:${encodeURIComponent(query)}:${page + 1}`);
      keyboard.row();
    }
    
    keyboard
      .text('🔍 Categories', 'action:categories')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Search pagination error:', err);
    await ctx.editMessageText('❌ Search failed\\. Try again\\.', { parse_mode: 'MarkdownV2' });
  }
}

// Main action handler for /start buttons
async function handleMainAction(ctx, action) {
  switch (action) {
    case 'trending':
      await showTrendingWithButtons(ctx);
      break;
    case 'categories':
      await showCategoryBrowser(ctx);
      break;
    case 'portfolio':
      await showPortfolioWithButtons(ctx);
      break;
    case 'upgrade':
      await showUpgradePrompt(ctx);
      break;
    case 'help':
      await showHelpMenu(ctx);
      break;
    case 'back_home':
      await showHomeMenu(ctx);
      break;
    case 'alerts':
      await showAlertsWithButtons(ctx);
      break;
    case 'watchlist':
      await showWatchlistWithButtons(ctx);
      break;
    case 'portfolio_help':
      await showPortfolioHelp(ctx);
      break;
    case 'portfolio_full':
      await showPortfolioFull(ctx);
      break;
    case 'watchlist_full':
      await showWatchlistFull(ctx);
      break;
    case 'briefing_setup':
      await showBriefingSetup(ctx);
      break;
    case 'whale_setup':
      await showWhaleSetup(ctx);
      break;
    default:
      await ctx.reply('Unknown action. Try /start');
  }
}

// Show home menu (same as /start)
async function showHomeMenu(ctx) {
  const keyboard = new InlineKeyboard()
    .text('🔥 Trending Markets', 'action:trending')
    .text('🔍 Browse Categories', 'action:categories')
    .row()
    .text('💰 My Portfolio', 'action:portfolio')
    .text('⭐ Go Premium', 'action:upgrade');
  
  const msg = `📊 *PolyPulse* — Real\\-time Polymarket intelligence

Track odds, set alerts, and never miss a market move\\.`;

  await ctx.editMessageText(msg, { 
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Show trending markets with action buttons AND pagination
async function showTrendingWithButtons(ctx, page = 0) {
  await ctx.editMessageText('⏳ Loading trending markets\\.\\.\\.', { parse_mode: 'MarkdownV2' });
  
  try {
    // Fetch more markets for pagination
    const allMarkets = await getTrendingMarkets(50);
    const total = allMarkets.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    
    // Ensure page is in bounds
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;
    
    const markets = allMarkets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    
    // Save pagination state
    setPaginationState(ctx.from.id, 'trending', { page, total, data: allMarkets });
    
    if (!markets?.length) {
      const keyboard = new InlineKeyboard()
        .text('🔄 Try Again', 'action:trending')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText('📊 No trending markets found\\. Try again in a moment\\.', {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    let msg = `*🔥 Trending Markets*\n\n`;
    const keyboard = new InlineKeyboard();
    const startNum = page * PAGE_SIZE;

    markets.forEach((m, i) => {
      const market = enrichMarket(m);
      const question = truncate(market.question, 40);
      const marketId = market.id || market.slug;
      
      // Format with price change context
      msg += `*${startNum + i + 1}\\.* ${escapeMarkdown(question)}\n`;
      msg += `   ${market.momentum} *${escapeMarkdown(market.yesPct)}* ${escapeMarkdown(market.priceChange)} \\(24h\\) · ${escapeMarkdown(market.volume)}\n\n`;
      
      // Add action buttons for each market
      keyboard
        .text(`🔔 #${startNum + i + 1}`, `alert:${marketId}`)
        .text(`👀 #${startNum + i + 1}`, `watch:${marketId}`)
        .row();
    });

    // Pagination controls
    if (totalPages > 1) {
      const pagRow = [];
      if (page > 0) pagRow.push(keyboard.text('⬅️ Prev', `page:trending:${page - 1}`));
      pagRow.push(keyboard.text(`${page + 1}/${totalPages}`, 'noop'));
      if (page < totalPages - 1) pagRow.push(keyboard.text('➡️ Next', `page:trending:${page + 1}`));
      keyboard.row();
    }

    keyboard
      .text('🔍 Categories', 'action:categories')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Trending callback error:', err);
    const keyboard = new InlineKeyboard()
      .text('🔄 Try Again', 'action:trending')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load markets\\. Try again\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show category browser using dynamic tags from API
async function showCategoryBrowser(ctx) {
  const keyboard = new InlineKeyboard();
  
  try {
    // Fetch popular tags from API
    const tags = await getPopularTags(10);
    
    // Build buttons in 2 columns
    for (let i = 0; i < tags.length; i += 2) {
      const tag1 = tags[i];
      const tag2 = tags[i + 1];
      
      keyboard.text(`${tag1.emoji} ${tag1.name}`, `tag:${tag1.id || tag1.slug}`);
      if (tag2) keyboard.text(`${tag2.emoji} ${tag2.name}`, `tag:${tag2.id || tag2.slug}`);
      keyboard.row();
    }
  } catch (err) {
    console.error('showCategoryBrowser error:', err.message);
    // Fallback to hardcoded categories
    const catKeys = Object.keys(CATEGORIES);
    for (let i = 0; i < catKeys.length; i += 2) {
      const cat1 = CATEGORIES[catKeys[i]];
      const cat2 = catKeys[i + 1] ? CATEGORIES[catKeys[i + 1]] : null;
      
      keyboard.text(`${cat1.emoji} ${cat1.name}`, `cat:${catKeys[i]}`);
      if (cat2) keyboard.text(`${cat2.emoji} ${cat2.name}`, `cat:${catKeys[i + 1]}`);
      keyboard.row();
    }
  }
  
  keyboard.text('🏠 Home', 'action:back_home');

  const msg = `*🔍 Browse Categories*

Tap a category to see markets\\. Each category shows top markets by volume with live odds and 24h price changes\\.`;

  await ctx.editMessageText(msg, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Handle category browsing with pagination
async function handleCategoryBrowse(ctx, category, page = 0) {
  const cat = CATEGORIES[category];
  if (!cat) {
    return ctx.editMessageText('Unknown category\\.', { parse_mode: 'MarkdownV2' });
  }
  
  await ctx.editMessageText(`${cat.emoji} Loading ${cat.name} markets\\.\\.\\.`, { parse_mode: 'MarkdownV2' });
  
  try {
    // Get markets for this category with pagination
    const { markets, total } = await getMarketsByCategory(category, PAGE_SIZE, page * PAGE_SIZE);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    
    // Save pagination state
    setPaginationState(ctx.from.id, `cat:${category}`, { page, total });

    if (markets.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('⬅️ Back to Categories', 'action:categories')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText(`${cat.emoji} No markets found in ${escapeMarkdown(cat.name)}\\.`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    let msg = `${cat.emoji} *${escapeMarkdown(cat.name)} Markets*`;
    if (totalPages > 1) msg += ` \\(${page + 1}/${totalPages}\\)`;
    msg += `\n_${total} markets found_\n\n`;
    
    const keyboard = new InlineKeyboard();
    const startNum = page * PAGE_SIZE;

    markets.forEach((m, i) => {
      const market = enrichMarket(m);
      const question = truncate(market.question, 40);
      const marketId = market.id || market.slug;
      
      // Format with price change context
      msg += `*${startNum + i + 1}\\.* ${escapeMarkdown(question)}\n`;
      msg += `   ${market.momentum} *${escapeMarkdown(market.yesPct)}* ${escapeMarkdown(market.priceChange)} \\(24h\\) · ${escapeMarkdown(market.volume)}\n\n`;
      
      // Add action buttons for each market
      keyboard
        .text(`🔔 #${startNum + i + 1}`, `alert:${marketId}`)
        .text(`👀 #${startNum + i + 1}`, `watch:${marketId}`)
        .row();
    });

    // Pagination controls
    if (totalPages > 1) {
      if (page > 0) keyboard.text('⬅️ Prev', `page:cat:${category}:${page - 1}`);
      keyboard.text(`${page + 1}/${totalPages}`, 'noop');
      if (page < totalPages - 1) keyboard.text('➡️ Next', `page:cat:${category}:${page + 1}`);
      keyboard.row();
    }

    keyboard
      .text('⬅️ Categories', 'action:categories')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Category browse error:', err);
    const keyboard = new InlineKeyboard()
      .text('⬅️ Back to Categories', 'action:categories')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load category\\. Try again\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Handle alert setup from button
async function handleAlertSetup(ctx, marketId) {
  // Show threshold options
  const keyboard = new InlineKeyboard()
    .text('25%', `threshold:${marketId}:25`)
    .text('50%', `threshold:${marketId}:50`)
    .text('75%', `threshold:${marketId}:75`)
    .row()
    .text('⬅️ Back', 'action:trending')
    .text('🏠 Home', 'action:back_home');

  await ctx.editMessageText(`*🔔 Set Alert*

Choose a threshold for this market:

When the odds hit your target, you'll get notified\\.`, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Handle alert threshold selection
async function handleAlertThreshold(ctx, marketId, thresholdStr) {
  const threshold = parseInt(thresholdStr, 10) / 100;
  
  try {
    // Check alert limits
    const alertCount = await countUserAlerts(ctx.user.id);
    const maxAlerts = ctx.isPremium ? Infinity : CONFIG.FREE_LIMITS.alerts;

    if (alertCount >= maxAlerts) {
      const keyboard = new InlineKeyboard()
        .text('⭐ Upgrade for Unlimited', 'action:upgrade')
        .text('📋 Manage Alerts', 'action:alerts')
        .row()
        .text('🏠 Home', 'action:back_home');

      return ctx.editMessageText(`*Alert Limit Reached*

You've used ${alertCount}/${maxAlerts} free alerts\\.

Premium gets you unlimited alerts PLUS 🐋 whale alerts, ☀️ morning briefings, and 💼 portfolio tracking\\.`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    // Look up the market by ID/slug directly (NOT fulltext search)
    const market = await getMarketById(marketId);
    
    if (!market) {
      const keyboard = new InlineKeyboard()
        .text('🔥 Trending', 'action:trending')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText('❌ Could not find that market\\.', {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    const currentPrice = yesOutcome?.price || 0.5;
    const direction = currentPrice < threshold ? 'above' : 'below';

    await createAlert(
      ctx.user.id,
      ctx.chat.id,
      market.id || market.slug,
      market.question,
      threshold,
      direction
    );

    const keyboard = new InlineKeyboard()
      .text('📋 See All Alerts', 'action:alerts')
      .text('🔔 Set Another', 'action:trending')
      .row()
      .text('🏠 Home', 'action:back_home');

    const thresholdPct = (threshold * 100).toFixed(0);
    const currentPct = (currentPrice * 100).toFixed(0);

    await ctx.editMessageText(`*✅ Alert Set\\!*

📊 ${escapeMarkdown(truncate(market.question, 45))}

🎯 Target: *${thresholdPct}%* ${direction === 'above' ? '↗️' : '↘️'}
📍 Current: ${currentPct}%

_You'll be notified when it hits your target\\._`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Alert threshold error:', err);
    const keyboard = new InlineKeyboard()
      .text('🔥 Trending', 'action:trending')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not set alert\\. Try again\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Handle watch add from button
async function handleWatchAdd(ctx, marketId) {
  try {
    // Check watchlist limits
    const watchCount = await countWatchlist(ctx.user.id);
    const maxWatchlist = ctx.isPremium ? Infinity : CONFIG.FREE_LIMITS.watchlist;

    if (watchCount >= maxWatchlist) {
      const keyboard = new InlineKeyboard()
        .text('⭐ Upgrade for Unlimited', 'action:upgrade')
        .text('📋 View Watchlist', 'action:watchlist')
        .row()
        .text('🏠 Home', 'action:back_home');

      return ctx.editMessageText(`*Watchlist Full*

You've used ${watchCount}/${maxWatchlist} watchlist slots\\.

Premium gives you unlimited watchlist \\+ daily briefing on all your markets\\.`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    // Look up the market by ID/slug directly (NOT fulltext search)
    const market = await getMarketById(marketId);
    
    if (!market) {
      const keyboard = new InlineKeyboard()
        .text('🔥 Trending', 'action:trending')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText('❌ Could not find that market\\.', {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }
    const outcomes = parseOutcomes(market);
    const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
    const currentPrice = yesOutcome?.price || 0;

    await addToWatchlist(ctx.user.id, market.id || market.slug, market.question, currentPrice);

    const keyboard = new InlineKeyboard()
      .text('📋 View Watchlist', 'action:watchlist')
      .text('🔔 Set Alert', `alert:${market.id || market.slug}`)
      .row()
      .text('🔍 Browse More', 'action:categories')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(`*✅ Added to Watchlist\\!*

📊 ${escapeMarkdown(truncate(market.question, 45))}
📍 Current: *${escapeMarkdown((currentPrice * 100).toFixed(0))}%*

_Check /watchlist anytime to see updates\\._`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Watch add error:', err);
    const keyboard = new InlineKeyboard()
      .text('🔥 Trending', 'action:trending')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not add to watchlist\\. Try again\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show portfolio with buttons
async function showPortfolioWithButtons(ctx) {
  const positionCount = await countOpenPositions(ctx.from.id);
  
  if (positionCount === 0) {
    const keyboard = new InlineKeyboard()
      .text('🔥 Find Markets', 'action:trending')
      .text('📖 How to Log Trades', 'action:portfolio_help')
      .row()
      .text('🏠 Home', 'action:back_home');
    
    return ctx.editMessageText(`*💰 Your Portfolio*

No positions yet\\. 

Log your Polymarket trades here to track P&L:
\`/buy bitcoin 100 0\\.54\` — 100 shares at 54¢
\`/sell bitcoin 50 0\\.73\` — Sell at 73¢`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }

  await ctx.editMessageText('⏳ Loading portfolio\\.\\.\\.', { parse_mode: 'MarkdownV2' });

  try {
    const positions = await getPositions(ctx.from.id);
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const pos of positions) {
      try {
        const markets = await searchMarketsFulltext(pos.market_id, 1);
        let currentPrice = parseFloat(pos.entry_price);

        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const outcome = outcomes.find(o => o.name.toUpperCase() === pos.side.toUpperCase()) || outcomes[0];
          currentPrice = outcome?.price || currentPrice;
        }

        const pnl = calculatePositionPnL(pos, currentPrice);
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      } catch {
        const pnl = calculatePositionPnL(pos, pos.entry_price);
        totalInvested += pnl.costBasis;
        totalCurrentValue += pnl.currentValue;
      }
    }

    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? ((totalCurrentValue / totalInvested) - 1) * 100 : 0;
    const pnlEmoji = totalPnl >= 0 ? '📈' : '📉';
    const pnlSign = totalPnl >= 0 ? '+' : '';

    const keyboard = new InlineKeyboard()
      .text('📊 Full Details', 'action:portfolio_full')
      .text('💰 Log Trade', 'action:portfolio_help')
      .row()
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(`*💰 Portfolio Summary*

${pnlEmoji} *${pnlSign}$${escapeMarkdown(totalPnl.toFixed(2))}* \\(${pnlSign}${escapeMarkdown(totalPnlPercent.toFixed(1))}%\\)

📊 *${positions.length}* open position${positions.length !== 1 ? 's' : ''}
💵 *$${escapeMarkdown(totalInvested.toFixed(2))}* invested
📍 *$${escapeMarkdown(totalCurrentValue.toFixed(2))}* current value

_Use /portfolio for full breakdown\\._`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Portfolio callback error:', err);
    const keyboard = new InlineKeyboard()
      .text('🔄 Try Again', 'action:portfolio')
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load portfolio\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show upgrade prompt
async function showUpgradePrompt(ctx) {
  if (ctx.isPremium) {
    const keyboard = new InlineKeyboard()
      .text('☀️ Set up Briefing', 'action:briefing_setup')
      .text('🐋 Whale Alerts', 'action:whale_setup')
      .row()
      .text('🏠 Home', 'action:back_home');
    
    return ctx.editMessageText(`*✨ You're Premium\\!*

Thank you for your support\\. Here's what you unlocked:

• ☀️ Morning briefings
• 🐋 Whale alerts \\($50K\\+\\)
• 📊 Unlimited alerts
• 📋 Unlimited watchlist
• 💼 Portfolio tracking`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }

  // Check if Stripe is configured
  if (!STRIPE_ENABLED) {
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    return ctx.editMessageText(`*✨ Premium Coming Soon*

$9\\.99/mo — all the power of Polymarket in your pocket:

• Unlimited price alerts
• 🐋 Whale movement alerts
• ☀️ Daily market briefings  
• 📋 Unlimited watchlist
• 💼 Full portfolio tracking

_We'll notify you when Premium is available\\._`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }

  try {
    // Create Stripe checkout
    let customerId = ctx.user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          telegram_id: ctx.from.id.toString(),
          telegram_username: ctx.from.username || '',
        },
      });
      customerId = customer.id;
      await setStripeCustomer(ctx.from.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.BOT_URL || 'https://t.me/GetPolyPulse_bot'}?start=upgraded`,
      cancel_url: `${process.env.BOT_URL || 'https://t.me/GetPolyPulse_bot'}?start=cancelled`,
      metadata: { telegram_id: ctx.from.id.toString() },
    });

    const keyboard = new InlineKeyboard()
      .url('🚀 Start Premium →', session.url)
      .row()
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(`*✨ Upgrade to Premium*

*$9\\.99/mo* — cancel anytime

*What you get:*
• Unlimited price alerts
• 🐋 Whale movement alerts \\($50K\\+ bets\\)
• ☀️ Daily market briefings
• 📋 Unlimited watchlist
• 💼 Full portfolio tracking

Tap below to start:`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Upgrade callback error:', err);
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not create checkout\\. Try /upgrade again\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show alerts with management buttons
async function showAlertsWithButtons(ctx) {
  try {
    const alerts = await getUserAlerts(ctx.user.id);
    
    if (alerts.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔥 Find Markets', 'action:trending')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText(`*🔔 No Active Alerts*

Set alerts to get notified when markets hit your target:

1\\. Browse trending markets
2\\. Tap 🔔 to set an alert
3\\. Choose your threshold`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    const maxAlerts = ctx.isPremium ? '∞' : CONFIG.FREE_LIMITS.alerts;
    let msg = `*🔔 Your Alerts \\(${alerts.length}/${maxAlerts}\\)*\n\n`;

    alerts.forEach((alert, i) => {
      const dir = alert.direction === 'above' ? '≥' : '≤';
      const pct = (alert.threshold * 100).toFixed(0);
      const name = truncate(alert.market_name, 35);
      
      msg += `*${i + 1}\\.* ${escapeMarkdown(name)}\n`;
      msg += `   YES ${dir} ${pct}%\n\n`;
    });

    msg += `_Cancel via /alerts then /cancelalert_`;

    const keyboard = new InlineKeyboard()
      .text('🔥 Add More', 'action:trending')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Alerts callback error:', err);
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load alerts\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show watchlist with buttons
async function showWatchlistWithButtons(ctx) {
  try {
    const watchlist = await getWatchlist(ctx.user.id);
    
    if (watchlist.length === 0) {
      const keyboard = new InlineKeyboard()
        .text('🔥 Find Markets', 'action:trending')
        .text('🏠 Home', 'action:back_home');
      
      return ctx.editMessageText(`*📋 Your Watchlist*

No markets tracked yet\\.

Tap 👀 on any market to add it to your watchlist\\. You can quickly check prices anytime with /watchlist\\.`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }

    const maxItems = ctx.isPremium ? '∞' : CONFIG.FREE_LIMITS.watchlist;
    let msg = `*📋 Watchlist \\(${watchlist.length}/${maxItems}\\)*\n\n`;

    for (const item of watchlist.slice(0, 5)) {
      const name = truncate(item.market_name, 35);
      const addedPct = (item.added_price * 100).toFixed(0);
      msg += `• ${escapeMarkdown(name)}\n`;
      msg += `  _Added at ${addedPct}%_\n\n`;
    }

    if (watchlist.length > 5) {
      msg += `_\\+${watchlist.length - 5} more \\- use /watchlist for full list_`;
    }

    const keyboard = new InlineKeyboard()
      .text('📊 Full List', 'action:watchlist_full')
      .text('🔥 Add More', 'action:trending')
      .row()
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Watchlist callback error:', err);
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load watchlist\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show full watchlist with current prices
async function showWatchlistFull(ctx) {
  try {
    const watchlist = await getWatchlist(ctx.user.id);
    
    if (watchlist.length === 0) {
      return showWatchlistWithButtons(ctx);
    }

    await ctx.editMessageText('⏳ Loading watchlist prices\\.\\.\\.', { parse_mode: 'MarkdownV2' });

    const maxItems = ctx.isPremium ? '∞' : CONFIG.FREE_LIMITS.watchlist;
    let msg = `*📋 Full Watchlist \\(${watchlist.length}/${maxItems}\\)*\n\n`;

    for (const item of watchlist) {
      const name = truncate(item.market_name, 30);
      const addedPct = (item.added_price * 100).toFixed(0);
      let currentPct = addedPct;
      let changeEmoji = '➖';
      
      try {
        const markets = await searchMarketsFulltext(item.market_id, 1);
        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
          if (yesOutcome) {
            currentPct = (yesOutcome.price * 100).toFixed(0);
            const diff = yesOutcome.price - item.added_price;
            if (diff > 0.01) changeEmoji = '📈';
            else if (diff < -0.01) changeEmoji = '📉';
          }
        }
      } catch {}

      msg += `${changeEmoji} *${escapeMarkdown(name)}*\n`;
      msg += `   Added: ${addedPct}% → Now: *${currentPct}%*\n\n`;
    }

    msg += `_Remove with /unwatch <keyword>_`;

    const keyboard = new InlineKeyboard()
      .text('🔥 Add More', 'action:trending')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Watchlist full error:', err);
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load watchlist\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show portfolio help
async function showPortfolioHelp(ctx) {
  const keyboard = new InlineKeyboard()
    .text('🔥 Find Markets', 'action:trending')
    .text('💰 My Portfolio', 'action:portfolio')
    .row()
    .text('🏠 Home', 'action:back_home');

  await ctx.editMessageText(`*💼 How to Log Trades*

Track your Polymarket positions for P&L:

*Buy Position:*
\`/buy bitcoin 100 0\\.54\`
_100 shares at 54¢ each_

*Sell Position:*
\`/sell bitcoin 50 0\\.73\`
_50 shares at 73¢ each_

*Examples:*
• \`/buy trump 200 0\\.31\` — Buy 200 @ 31¢
• \`/sell eth 150 0\\.68\` — Sell 150 @ 68¢

_This tracks P&L—it doesn't place real trades\\._`, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Show full portfolio details
async function showPortfolioFull(ctx) {
  try {
    const positions = await getPositions(ctx.from.id);
    
    if (positions.length === 0) {
      return showPortfolioWithButtons(ctx);
    }

    let msg = `*💼 Portfolio Details*\n\n`;
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const pos of positions) {
      const name = truncate(pos.market_name, 30);
      let currentPrice = parseFloat(pos.entry_price);
      
      try {
        const markets = await searchMarketsFulltext(pos.market_id, 1);
        if (markets.length > 0) {
          const outcomes = parseOutcomes(markets[0]);
          const outcome = outcomes.find(o => o.name.toUpperCase() === pos.side.toUpperCase()) || outcomes[0];
          currentPrice = outcome?.price || currentPrice;
        }
      } catch {}

      const pnl = calculatePositionPnL(pos, currentPrice);
      totalInvested += pnl.costBasis;
      totalCurrentValue += pnl.currentValue;
      
      const pnlEmoji = pnl.pnl >= 0 ? '📈' : '📉';
      const pnlSign = pnl.pnl >= 0 ? '+' : '';
      const entryPct = (parseFloat(pos.entry_price) * 100).toFixed(0);
      const currentPct = (currentPrice * 100).toFixed(0);

      msg += `${pnlEmoji} *${escapeMarkdown(name)}*\n`;
      msg += `   ${pos.shares} shares @ ${entryPct}¢ → ${currentPct}¢\n`;
      msg += `   P&L: *${pnlSign}$${escapeMarkdown(pnl.pnl.toFixed(2))}*\n\n`;
    }

    const totalPnl = totalCurrentValue - totalInvested;
    const pnlSign = totalPnl >= 0 ? '+' : '';
    msg += `*Total: ${pnlSign}$${escapeMarkdown(totalPnl.toFixed(2))}*`;

    const keyboard = new InlineKeyboard()
      .text('📖 How to Trade', 'action:portfolio_help')
      .text('🏠 Home', 'action:back_home');

    await ctx.editMessageText(msg, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Portfolio full error:', err);
    const keyboard = new InlineKeyboard()
      .text('🏠 Home', 'action:back_home');
    
    await ctx.editMessageText('❌ Could not load portfolio\\.', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
}

// Show briefing setup for premium users
async function showBriefingSetup(ctx) {
  if (!ctx.isPremium) {
    return showUpgradePrompt(ctx);
  }

  const prefs = await getBriefingPrefs(ctx.from.id);
  const enabled = prefs?.enabled ?? false;
  const hour = prefs?.send_hour ?? 8;
  const tz = prefs?.timezone || 'UTC';

  const keyboard = new InlineKeyboard()
    .text(enabled ? '❌ Disable' : '✅ Enable', enabled ? 'briefing:off' : 'briefing:on')
    .row()
    .text('🏠 Home', 'action:back_home');

  await ctx.editMessageText(`*☀️ Morning Briefing*

Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}
Time: ${hour}:00 ${escapeMarkdown(tz)}

Your daily briefing includes:
• Watchlist updates with price changes
• Triggered alerts summary
• Top 5 market movers

_Set timezone: /timezone EST_
_Set time: /briefing time 7am_`, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Show whale setup for premium users
async function showWhaleSetup(ctx) {
  if (!ctx.isPremium) {
    return showUpgradePrompt(ctx);
  }

  const prefs = await getWhalePrefs(ctx.from.id);
  const enabled = prefs?.enabled ?? false;
  const threshold = prefs?.min_amount || 50000;
  const thresholdK = (threshold / 1000).toFixed(0);

  const keyboard = new InlineKeyboard()
    .text(enabled ? '❌ Disable' : '✅ Enable ($50K+)', enabled ? 'whale:off' : 'whale:on')
    .row()
    .text('$100K+', 'whale:100k')
    .text('$250K+', 'whale:250k')
    .text('$500K+', 'whale:500k')
    .row()
    .text('🏠 Home', 'action:back_home');

  await ctx.editMessageText(`*🐋 Whale Alerts*

Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}
Threshold: $${escapeMarkdown(thresholdK)}K\\+

Get notified when whales place big bets on Polymarket\\. See where the smart money is going\\.

_Or use: /whale 100k_`, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Handle briefing toggle actions
async function handleBriefingAction(ctx, action) {
  if (!ctx.isPremium) {
    return showUpgradePrompt(ctx);
  }

  try {
    if (action === 'on') {
      await upsertBriefingPrefs(ctx.from.id, { enabled: true });
      const keyboard = new InlineKeyboard()
        .text('⚙️ Settings', 'action:briefing_setup')
        .text('🏠 Home', 'action:back_home');
      
      await ctx.editMessageText(`*✅ Briefing Enabled\\!*

You'll receive your daily market briefing every morning\\.

_Adjust time with /briefing time 7am_`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } else if (action === 'off') {
      await upsertBriefingPrefs(ctx.from.id, { enabled: false });
      const keyboard = new InlineKeyboard()
        .text('✅ Re-enable', 'briefing:on')
        .text('🏠 Home', 'action:back_home');
      
      await ctx.editMessageText(`*❌ Briefing Disabled*

Re\\-enable anytime: /briefing on`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    console.error('Briefing action error:', err);
    await ctx.editMessageText('❌ Could not update briefing settings\\.', { parse_mode: 'MarkdownV2' });
  }
}

// Handle whale alert actions
async function handleWhaleAction(ctx, action) {
  if (!ctx.isPremium) {
    return showUpgradePrompt(ctx);
  }

  try {
    if (action === 'on') {
      await setWhaleEnabled(ctx.from.id, true, 50000);
      return showWhaleConfirm(ctx, 50000);
    } else if (action === 'off') {
      await setWhaleEnabled(ctx.from.id, false);
      const keyboard = new InlineKeyboard()
        .text('✅ Re-enable', 'whale:on')
        .text('🏠 Home', 'action:back_home');
      
      await ctx.editMessageText(`*❌ Whale Alerts Disabled*

Re\\-enable anytime: /whale on`, {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
    } else if (action === '100k') {
      await setWhaleEnabled(ctx.from.id, true, 100000);
      return showWhaleConfirm(ctx, 100000);
    } else if (action === '250k') {
      await setWhaleEnabled(ctx.from.id, true, 250000);
      return showWhaleConfirm(ctx, 250000);
    } else if (action === '500k') {
      await setWhaleEnabled(ctx.from.id, true, 500000);
      return showWhaleConfirm(ctx, 500000);
    }
  } catch (err) {
    console.error('Whale action error:', err);
    await ctx.editMessageText('❌ Could not update whale settings\\.', { parse_mode: 'MarkdownV2' });
  }
}

// Show whale enabled confirmation
async function showWhaleConfirm(ctx, threshold) {
  const thresholdK = (threshold / 1000).toFixed(0);
  const keyboard = new InlineKeyboard()
    .text('⚙️ Adjust Threshold', 'action:whale_setup')
    .text('🏠 Home', 'action:back_home');
  
  await ctx.editMessageText(`*🐋 Whale Alerts Enabled\\!*

You'll be notified when bets of *$${escapeMarkdown(thresholdK)}K\\+* are placed\\.

_Adjust with /whale 100k or buttons above_`, {
    parse_mode: 'MarkdownV2',
    reply_markup: keyboard,
  });
}

// Show help menu with buttons
async function showHelpMenu(ctx) {
  const keyboard = new InlineKeyboard()
    .text('🔥 Trending', 'action:trending')
    .text('🔍 Categories', 'action:categories')
    .row()
    .text('💰 Portfolio', 'action:portfolio')
    .text('⭐ Premium', 'action:upgrade')
    .row()
    .text('🏠 Home', 'action:back_home');

  await ctx.editMessageText(`*❓ Quick Help*

*Find Markets*
• Tap 🔥 Trending for hot markets
• Tap 🔍 Categories to browse
• Type /price bitcoin to search

*Track Markets*  
• Set alerts with 🔔 buttons
• Add to watchlist with 👀 buttons
• Or type /alert bitcoin 60

*Your Data*
• 💰 Portfolio tracks your P&L
• 📋 /watchlist shows tracked markets
• 🔔 /alerts shows active alerts

_Full command list: /help_`, {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
}

// ============ SMART TEXT HANDLING ============

// Handle bare text (non-commands)
// IMPORTANT: This MUST be registered AFTER all bot.command() handlers
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text?.trim();
  console.log('[DEBUG] text handler received:', text, 'from:', ctx.from?.id);
  
  // Skip if empty or is a command (starts with /)
  if (!text || text.startsWith('/')) return;
  
  // Double-check: skip if this looks like a bot command entity
  const entities = ctx.message.entities || [];
  const hasCommandEntity = entities.some(e => e.type === 'bot_command' && e.offset === 0);
  if (hasCommandEntity) return;
  
  const lowerText = text.toLowerCase();
  
  // Common words → redirect to commands
  if (lowerText === 'help' || lowerText === '?') {
    const keyboard = new InlineKeyboard()
      .text('🔥 Trending', 'action:trending')
      .text('🔍 Categories', 'action:categories')
      .row()
      .text('💰 Portfolio', 'action:portfolio')
      .text('❓ Commands', 'action:help');
    return ctx.reply('Need help? Tap a button below or type /help:', {
      reply_markup: keyboard,
    });
  }
  
  if (lowerText === 'menu' || lowerText === 'start' || lowerText === 'home') {
    const keyboard = new InlineKeyboard()
      .text('🔥 Trending Markets', 'action:trending')
      .text('🔍 Browse Categories', 'action:categories')
      .row()
      .text('💰 My Portfolio', 'action:portfolio')
      .text('⭐ Go Premium', 'action:upgrade');
    return ctx.reply('📊 *PolyPulse Menu*', {
      parse_mode: 'MarkdownV2',
      reply_markup: keyboard,
    });
  }
  
  if (lowerText === 'trending' || lowerText === 'hot' || lowerText === 'top') {
    return ctx.reply('Use /trending to see the hottest markets right now!');
  }
  
  // If text is 3+ chars, try searching for a market
  if (text.length >= 3) {
    await ctx.replyWithChatAction('typing');
    
    try {
      const markets = await searchMarketsFulltext(text, 1);
      
      if (markets.length > 0) {
        const market = markets[0];
        const outcomes = parseOutcomes(market);
        const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
        const pct = yesOutcome?.pct || '—';
        const title = truncate(market.question, 55);
        const marketId = market.id || market.slug;
        
        const keyboard = new InlineKeyboard()
          .text('🔔 Set Alert', `alert:${marketId}`)
          .text('👀 Watch', `watch:${marketId}`)
          .row()
          .text('🔥 Trending', 'action:trending')
          .text('🔍 Browse', 'action:categories');

        return ctx.reply(`📊 *${escapeMarkdown(title)}*\n\nYES: *${escapeMarkdown(pct)}*\n\n_Tap below to track:_`, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
        });
      }
    } catch (err) {
      console.error('Smart text search error:', err.message);
    }
  }
  
  // Fallback: suggest actions
  const keyboard = new InlineKeyboard()
    .text('🔥 Trending', 'action:trending')
    .text('🔍 Browse', 'action:categories')
    .text('❓ Help', 'action:help');
  
  await ctx.reply(
    `I couldn't find "${escapeMarkdown(truncate(text, 20))}"\n\n_Try a market name like "bitcoin" or tap below:_`,
    { parse_mode: 'MarkdownV2', reply_markup: keyboard }
  );
});

// ============ ALERT POLLING ============

async function checkAlerts() {
  const alerts = await getAllActiveAlerts();
  if (alerts.length === 0) return;

  // Group by market
  const marketIds = [...new Set(alerts.map(a => a.market_id))];

  for (const marketId of marketIds) {
    try {
      const markets = await searchMarketsFulltext(marketId, 1);
      if (markets.length === 0) continue;

      const market = markets[0];
      const outcomes = parseOutcomes(market);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      if (!yesOutcome) continue;

      const currentPrice = yesOutcome.price;
      const marketAlerts = alerts.filter(a => a.market_id === marketId);

      for (const alert of marketAlerts) {
        const triggered = 
          (alert.direction === 'above' && currentPrice >= alert.threshold) ||
          (alert.direction === 'below' && currentPrice <= alert.threshold);

        if (triggered) {
          const thresholdPct = escapeMarkdown((alert.threshold * 100).toFixed(0) + '%');
          const currentPct = escapeMarkdown((currentPrice * 100).toFixed(1) + '%');
          const emoji = alert.direction === 'above' ? '📈' : '📉';

          const msg = `*🔔 Alert Triggered\\!*

${emoji} *${escapeMarkdown(truncate(alert.market_name, 45))}*

Target: ${thresholdPct}
Current: *${currentPct}*

_Alert removed\\._`;

          try {
            await bot.api.sendMessage(alert.telegram_chat_id, msg, {
              parse_mode: 'MarkdownV2',
            });
          } catch (sendErr) {
            console.error(`Failed to send alert:`, sendErr.message);
          }

          await triggerAlert(alert.id);
          console.log(`Alert ${alert.id.slice(0, 8)} triggered`);
        }
      }

      // Rate limit protection
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`Alert check error for ${marketId}:`, err.message);
    }
  }
}

function startAlertPolling() {
  console.log('🔔 Starting alert polling (60s interval)');
  
  // Initial check after 30s
  setTimeout(() => checkAlerts().catch(console.error), 30000);
  
  // Then every 60 seconds
  setInterval(() => checkAlerts().catch(console.error), CONFIG.ALERT_CHECK_INTERVAL_MS);
}

// ============ ERROR HANDLING ============

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// ============ LAUNCH ============

console.log('🚀 Starting PolyPulse Premium...');

bot.start({
  onStart: async (botInfo) => {
    console.log(`✅ Bot running as @${botInfo.username}`);
    
    // Register commands with Telegram
    await bot.api.setMyCommands([
      { command: 'start', description: 'Welcome message' },
      { command: 'help', description: 'List all commands' },
      { command: 'trending', description: 'See hottest markets' },
      { command: 'price', description: 'Check market odds' },
      { command: 'search', description: 'Find markets by keyword' },
      { command: 'alert', description: 'Set a price alert' },
      { command: 'alerts', description: 'View my alerts' },
      { command: 'watch', description: 'Track a market' },
      { command: 'watchlist', description: 'See watched markets' },
      { command: 'account', description: 'Check subscription status' },
      { command: 'upgrade', description: 'Get Premium ($9.99/mo)' },
    ]);
    console.log('📋 Commands registered with Telegram');
    
    startAlertPolling();
  },
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
