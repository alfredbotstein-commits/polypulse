// PolyPulse Premium Bot
// Real-time Polymarket intelligence

import 'dotenv/config';
import { Bot, GrammyError, HttpError } from 'grammy';
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
} from './db.js';
import {
  searchMarketsFulltext,
  getTrendingMarkets,
  parseOutcomes,
} from './polymarket.js';
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

// /start - Clean welcome
bot.command('start', async (ctx) => {
  await ctx.reply(formatWelcome(), { parse_mode: 'MarkdownV2' });
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

*Account*
/account — Check my subscription status
/upgrade — Get Premium \\($9\\.99/mo\\)

_Free users: 3 alerts, 5 watchlist, 10 price checks/day_
_Premium: Unlimited \\+ Morning Briefing \\+ Whale Alerts_`;

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
    const markets = await searchMarketsFulltext(query, 5);
    
    if (markets.length === 0) {
      return ctx.reply(formatError('notFound'), { parse_mode: 'MarkdownV2' });
    }

    if (!ctx.isPremium) {
      await incrementUsage(ctx.user, 'search');
    }

    let msg = `*🔍 Results for "${escapeMarkdown(query)}"*\n\n`;
    
    markets.forEach((m, i) => {
      const outcomes = parseOutcomes(m);
      const yesPrice = outcomes.find(o => o.name.toLowerCase() === 'yes');
      msg += `*${i + 1}\\.* ${escapeMarkdown(truncate(m.question, 50))}\n`;
      msg += `   YES: *${escapeMarkdown(yesPrice?.pct || '—')}*\n\n`;
    });

    msg += `_Get details: /price trump_`;

    await ctx.reply(msg, {
      parse_mode: 'MarkdownV2',
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
  onStart: (botInfo) => {
    console.log(`✅ Bot running as @${botInfo.username}`);
    startAlertPolling();
  },
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
