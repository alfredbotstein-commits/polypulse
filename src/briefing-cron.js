// Morning Briefing Cron Job
// Runs hourly to send personalized briefings to premium users
// Call: node src/briefing-cron.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getUsersForBriefing,
  markBriefingSent,
  getWatchlist,
  getUserAlerts,
  supabase,
} from './db.js';
import {
  searchMarketsFulltext,
  getTrendingMarkets,
  parseOutcomes,
} from './polymarket.js';
import { formatMorningBriefing, escapeMarkdown, truncate } from './format.js';

// Initialize bot for sending
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Get current UTC hour
 */
function getCurrentUTCHour() {
  return new Date().getUTCHours();
}

/**
 * Fetch user's watchlist with current prices
 */
async function getWatchlistWithPrices(userId) {
  const watchlist = await getWatchlist(userId);
  if (!watchlist || watchlist.length === 0) return [];

  const items = [];
  for (const item of watchlist.slice(0, 5)) { // Max 5 items in briefing
    try {
      const markets = await searchMarketsFulltext(item.market_id, 1);
      if (markets.length > 0) {
        const outcomes = parseOutcomes(markets[0]);
        const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
        items.push({
          name: item.market_name,
          currentPrice: yesOutcome?.price || 0,
          addedPrice: item.added_price || 0,
          overnight: true,
        });
      }
    } catch (err) {
      console.error(`Error fetching watchlist item ${item.market_id}:`, err.message);
    }
    // Rate limit protection
    await new Promise(r => setTimeout(r, 200));
  }

  return items;
}

/**
 * Get alerts triggered in the last 24 hours
 */
async function getTriggeredAlertsLast24h(userId) {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('pp_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('triggered', true)
    .gte('triggered_at', yesterday)
    .order('triggered_at', { ascending: false })
    .limit(5);

  return data || [];
}

/**
 * Get top movers (markets with biggest 24h changes)
 */
async function getTopMovers() {
  try {
    // Get trending markets and sort by price change
    const markets = await getTrendingMarkets(20);
    
    // Sort by absolute price change
    const sorted = markets
      .map(m => ({
        ...m,
        absChange: Math.abs(m.oneDayPriceChange || 0),
      }))
      .sort((a, b) => b.absChange - a.absChange)
      .slice(0, 5);

    return sorted.map(m => {
      const outcomes = parseOutcomes(m);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      const currentPrice = yesOutcome?.price || 0.5;
      const change = m.oneDayPriceChange || 0;
      
      return {
        question: m.question,
        currentPrice,
        yesterdayPrice: currentPrice - change,
      };
    });
  } catch (err) {
    console.error('Error getting top movers:', err.message);
    return [];
  }
}

/**
 * Get whale events from last 12 hours (if table exists)
 */
async function getRecentWhaleEvents() {
  try {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('pp_whale_events')
      .select('*')
      .gte('detected_at', twelveHoursAgo)
      .order('amount_usd', { ascending: false })
      .limit(5);

    if (error) {
      // Table might not exist yet (P2 feature)
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Send briefing to a single user
 */
async function sendBriefingToUser(briefing) {
  const telegramId = briefing.user_id;
  console.log(`Preparing briefing for user ${telegramId}...`);

  try {
    // Gather all briefing data
    const [watchlistItems, triggeredAlerts, topMovers, whaleEvents] = await Promise.all([
      getWatchlistWithPrices(briefing.user.id),
      getTriggeredAlertsLast24h(briefing.user.id),
      getTopMovers(),
      getRecentWhaleEvents(),
    ]);

    // Build briefing data
    const data = {
      watchlistItems,
      triggeredAlerts,
      topMovers,
      whaleEvents,
      newMarkets: [], // TODO: Implement new market detection
    };

    // Check if we have any content worth sending
    if (
      watchlistItems.length === 0 &&
      triggeredAlerts.length === 0 &&
      topMovers.length === 0
    ) {
      console.log(`No meaningful content for user ${telegramId}, skipping...`);
      await markBriefingSent(telegramId);
      return;
    }

    // Format and send
    const message = formatMorningBriefing(data);
    
    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });

    console.log(`✅ Briefing sent to user ${telegramId}`);
    await markBriefingSent(telegramId);

  } catch (err) {
    console.error(`❌ Failed to send briefing to ${telegramId}:`, err.message);
    
    // If blocked by user, we might want to disable their briefing
    if (err.description?.includes('blocked') || err.description?.includes('deactivated')) {
      console.log(`User ${telegramId} has blocked the bot or is deactivated`);
    }
  }
}

/**
 * Main cron job function
 */
async function runBriefingCron() {
  const utcHour = getCurrentUTCHour();
  console.log(`\n📬 Running briefing cron at UTC hour ${utcHour}`);
  console.log(`Current time: ${new Date().toISOString()}`);

  try {
    // Get all users who should receive briefing this hour
    const users = await getUsersForBriefing(utcHour);
    console.log(`Found ${users.length} users to send briefings to`);

    if (users.length === 0) {
      console.log('No users need briefing at this hour. Done.');
      return;
    }

    // Send briefings with rate limiting
    for (const briefing of users) {
      await sendBriefingToUser(briefing);
      // Rate limit: 1 briefing per second max
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n✅ Briefing cron complete. Sent ${users.length} briefings.`);

  } catch (err) {
    console.error('Briefing cron error:', err);
    process.exit(1);
  }
}

// Run immediately when called
runBriefingCron()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
