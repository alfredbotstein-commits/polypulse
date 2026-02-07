// Morning Briefing Generator
// Shared logic for generating personalized briefings
// Used by both cron job and on-demand /briefing command

import {
  getWatchlist,
  getRecentWhaleEvents,
  supabase,
} from './db.js';
import {
  searchMarketsFulltext,
  getTrendingMarkets,
  parseOutcomes,
  getNewMarkets,
} from './polymarket.js';
import { formatMorningBriefing, escapeMarkdown, truncate } from './format.js';

/**
 * Fetch user's watchlist with current prices and overnight changes
 */
export async function getWatchlistWithPrices(userId) {
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
    await new Promise(r => setTimeout(r, 100));
  }

  return items;
}

/**
 * Get alerts triggered in the last 24 hours
 */
export async function getTriggeredAlertsLast24h(userId) {
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
export async function getTopMovers() {
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
        volume24hr: m.volume24hr || m.volume,
      };
    });
  } catch (err) {
    console.error('Error getting top movers:', err.message);
    return [];
  }
}

/**
 * Get whale events from last 12 hours
 */
export async function getWhaleEventsForBriefing(hours = 12) {
  try {
    return await getRecentWhaleEvents(hours, 5);
  } catch {
    return [];
  }
}

/**
 * Get new interesting markets (created in last 24-48h with good volume)
 */
export async function getNewInterestingMarkets() {
  try {
    // Use the dedicated getNewMarkets function which handles
    // different date field names (createdAt, startDate, created_at)
    const newMarkets = await getNewMarkets(48, 10);
    
    // Filter to markets with at least some activity and return top 3
    return newMarkets
      .filter(m => (m.volume24hr || m.volumeNum || 0) >= 500)
      .slice(0, 3)
      .map(m => ({
        question: m.question,
        price: m.price || 0.5,
        volume: m.volume24hr || m.volumeNum || m.volume,
      }));
  } catch (err) {
    console.error('Error getting new markets:', err.message);
    return [];
  }
}

/**
 * Generate complete briefing data for a user
 * @param {number} userId - The user's internal UUID from pp_users
 * @param {number} telegramId - The user's telegram ID
 */
export async function generateBriefingData(userId, telegramId) {
  // Gather all briefing data in parallel
  const [watchlistItems, triggeredAlerts, topMovers, whaleEvents, newMarkets] = await Promise.all([
    getWatchlistWithPrices(userId),
    getTriggeredAlertsLast24h(userId),
    getTopMovers(),
    getWhaleEventsForBriefing(12),
    getNewInterestingMarkets(),
  ]);

  return {
    watchlistItems,
    triggeredAlerts,
    topMovers,
    whaleEvents,
    newMarkets,
  };
}

/**
 * Generate formatted briefing message for a user
 * @param {number} userId - The user's internal UUID from pp_users
 * @param {number} telegramId - The user's telegram ID
 * @returns {string|null} - Formatted message or null if no meaningful content
 */
export async function generateBriefingMessage(userId, telegramId) {
  const data = await generateBriefingData(userId, telegramId);

  // Check if we have any content worth sending
  if (
    data.watchlistItems.length === 0 &&
    data.triggeredAlerts.length === 0 &&
    data.topMovers.length === 0 &&
    data.whaleEvents.length === 0
  ) {
    return null;
  }

  return formatMorningBriefing(data);
}

export default {
  generateBriefingData,
  generateBriefingMessage,
  getWatchlistWithPrices,
  getTriggeredAlertsLast24h,
  getTopMovers,
  getWhaleEventsForBriefing,
  getNewInterestingMarkets,
};
