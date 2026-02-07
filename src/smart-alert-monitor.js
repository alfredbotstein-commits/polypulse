// PolyPulse Smart Alert Monitor
// Detects volume spikes, momentum moves, and other patterns
// Run with: npm run smartalerts

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getSmartAlertSubscribers,
  hasRecentSmartAlert,
  logSmartAlert,
  storeVolumeSnapshot,
  getAverageHourlyVolume,
  getPriceHistory,
  cleanupOldSnapshots,
  cleanupOldAlertHistory,
} from './db.js';
import {
  getTrendingMarkets,
  searchMarketsFulltext,
  parseOutcomes,
} from './polymarket.js';
import {
  formatVolumeSpikeAlert,
  formatMomentumAlert,
  formatNewMarketAlert,
} from './format.js';

// Initialize bot for sending messages
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Configuration
const CONFIG = {
  POLL_INTERVAL_MS: 5 * 60 * 1000,  // Check every 5 minutes
  VOLUME_SPIKE_THRESHOLD: 3,         // 3x normal volume
  MOMENTUM_THRESHOLD: 0.10,          // 10% move
  MOMENTUM_HOURS: 4,                 // Within 4 hours
  MAX_ALERTS_PER_CYCLE: 5,           // Don't spam
  TRACKED_MARKETS_COUNT: 50,         // Number of markets to track
};

// Track seen markets to detect new ones
let knownMarketIds = new Set();
let isFirstRun = true;

/**
 * Main monitoring loop
 */
async function runMonitor() {
  console.log('🧠 Smart Alert Monitor started');
  console.log(`   Volume spike threshold: ${CONFIG.VOLUME_SPIKE_THRESHOLD}x`);
  console.log(`   Momentum threshold: ${CONFIG.MOMENTUM_THRESHOLD * 100}% in ${CONFIG.MOMENTUM_HOURS}h`);
  console.log(`   Poll interval: ${CONFIG.POLL_INTERVAL_MS / 1000}s`);

  // Initial run
  await checkSmartAlerts();

  // Then run on interval
  setInterval(async () => {
    try {
      await checkSmartAlerts();
    } catch (err) {
      console.error('Smart alert check failed:', err);
    }
  }, CONFIG.POLL_INTERVAL_MS);

  // Cleanup old data once per hour
  setInterval(async () => {
    try {
      await cleanupOldSnapshots();
      await cleanupOldAlertHistory();
      console.log('🧹 Cleaned up old snapshots and history');
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  }, 60 * 60 * 1000);
}

/**
 * Check all smart alert types
 */
async function checkSmartAlerts() {
  console.log(`\n[${new Date().toISOString()}] Checking smart alerts...`);

  try {
    // Get trending/active markets to monitor
    const markets = await getTrendingMarkets(CONFIG.TRACKED_MARKETS_COUNT);
    
    if (!markets || markets.length === 0) {
      console.log('No markets to check');
      return;
    }

    console.log(`Checking ${markets.length} markets`);

    // Store volume snapshots for all markets
    for (const market of markets) {
      const marketId = market.id || market.slug;
      const volume = market.volumeNum || market.volume24hr || 0;
      const outcomes = parseOutcomes(market);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      const price = yesOutcome?.price || null;
      
      await storeVolumeSnapshot(marketId, volume, price);
    }

    // Check for volume spikes
    await checkVolumeSpikes(markets);

    // Check for momentum moves
    await checkMomentum(markets);

    // Check for new markets
    await checkNewMarkets(markets);

    console.log('Smart alert check complete');
  } catch (err) {
    console.error('Error in checkSmartAlerts:', err);
  }
}

/**
 * Check for volume spikes (3x+ normal volume)
 */
async function checkVolumeSpikes(markets) {
  const subscribers = await getSmartAlertSubscribers('volume_spike');
  
  if (subscribers.length === 0) {
    return;
  }

  console.log(`Checking volume spikes for ${subscribers.length} subscribers`);

  let alertsSent = 0;

  for (const market of markets) {
    if (alertsSent >= CONFIG.MAX_ALERTS_PER_CYCLE) break;

    const marketId = market.id || market.slug;
    const currentVolume = market.volume24hr || 0;
    
    // Get average hourly volume
    const avgHourlyVolume = await getAverageHourlyVolume(marketId);
    
    if (!avgHourlyVolume || avgHourlyVolume < 1000) {
      // Skip markets with insufficient data or very low volume
      continue;
    }

    // Estimate current hour's volume (this is approximate)
    // In production, you'd want more precise hourly tracking
    const estimatedHourlyVolume = currentVolume / 24;  // Very rough estimate
    const multiplier = estimatedHourlyVolume / avgHourlyVolume;

    if (multiplier >= CONFIG.VOLUME_SPIKE_THRESHOLD) {
      console.log(`📊 Volume spike detected: ${market.question} (${multiplier.toFixed(1)}x)`);

      // Get price change
      const priceHistory = await getPriceHistory(marketId, 1);
      let priceChange = null;
      if (priceHistory.length >= 2) {
        const oldPrice = priceHistory[0].price;
        const outcomes = parseOutcomes(market);
        const currentPrice = outcomes.find(o => o.name.toLowerCase() === 'yes')?.price || oldPrice;
        priceChange = currentPrice - oldPrice;
      }

      // Send to subscribers
      for (const sub of subscribers) {
        // Check if we already sent this alert recently
        if (await hasRecentSmartAlert(sub.telegramId, 'volume_spike', marketId, 4)) {
          continue;
        }

        try {
          const msg = formatVolumeSpikeAlert(
            market,
            estimatedHourlyVolume,
            avgHourlyVolume,
            multiplier,
            priceChange
          );
          
          await bot.api.sendMessage(sub.telegramId, msg, { parse_mode: 'MarkdownV2' });
          await logSmartAlert(sub.telegramId, 'volume_spike', marketId, { multiplier });
          alertsSent++;
          
          console.log(`   Sent to user ${sub.telegramId}`);
          
          // Rate limit
          await sleep(100);
        } catch (err) {
          console.error(`Failed to send volume spike alert to ${sub.telegramId}:`, err.message);
        }
      }
    }
  }
}

/**
 * Check for momentum moves (10%+ in 4 hours)
 */
async function checkMomentum(markets) {
  const subscribers = await getSmartAlertSubscribers('momentum');
  
  if (subscribers.length === 0) {
    return;
  }

  console.log(`Checking momentum for ${subscribers.length} subscribers`);

  let alertsSent = 0;

  for (const market of markets) {
    if (alertsSent >= CONFIG.MAX_ALERTS_PER_CYCLE) break;

    const marketId = market.id || market.slug;
    
    // Get price history for last 4 hours
    const priceHistory = await getPriceHistory(marketId, CONFIG.MOMENTUM_HOURS);
    
    if (priceHistory.length < 2) {
      continue;
    }

    // Find the oldest price and current price
    const oldestEntry = priceHistory[0];
    const outcomes = parseOutcomes(market);
    const currentPrice = outcomes.find(o => o.name.toLowerCase() === 'yes')?.price || null;
    
    if (!currentPrice) continue;

    const priceMove = currentPrice - oldestEntry.price;
    const hoursElapsed = (Date.now() - oldestEntry.time.getTime()) / (1000 * 60 * 60);

    if (Math.abs(priceMove) >= CONFIG.MOMENTUM_THRESHOLD && hoursElapsed <= CONFIG.MOMENTUM_HOURS) {
      console.log(`🚀 Momentum detected: ${market.question} (${(priceMove * 100).toFixed(1)}% in ${hoursElapsed.toFixed(1)}h)`);

      // Send to subscribers
      for (const sub of subscribers) {
        // Check if we already sent this alert recently
        if (await hasRecentSmartAlert(sub.telegramId, 'momentum', marketId, 4)) {
          continue;
        }

        try {
          const msg = formatMomentumAlert(market, oldestEntry.price, currentPrice, hoursElapsed);
          
          await bot.api.sendMessage(sub.telegramId, msg, { parse_mode: 'MarkdownV2' });
          await logSmartAlert(sub.telegramId, 'momentum', marketId, { priceMove, hoursElapsed });
          alertsSent++;
          
          console.log(`   Sent to user ${sub.telegramId}`);
          
          // Rate limit
          await sleep(100);
        } catch (err) {
          console.error(`Failed to send momentum alert to ${sub.telegramId}:`, err.message);
        }
      }
    }
  }
}

/**
 * Check for new markets in subscribed categories
 */
async function checkNewMarkets(markets) {
  const subscribers = await getSmartAlertSubscribers('new_market');
  
  if (subscribers.length === 0) {
    return;
  }

  // Build current market ID set
  const currentMarketIds = new Set(markets.map(m => m.id || m.slug));

  // Find new markets (not in our known set)
  const newMarkets = [];
  for (const market of markets) {
    const marketId = market.id || market.slug;
    if (!knownMarketIds.has(marketId)) {
      newMarkets.push(market);
    }
  }

  // Update known markets
  knownMarketIds = currentMarketIds;

  // Skip notifications on first run (don't flood users with all existing markets)
  if (isFirstRun) {
    console.log(`First run: Tracking ${knownMarketIds.size} markets as baseline`);
    isFirstRun = false;
    return;
  }

  if (newMarkets.length === 0) {
    return;
  }

  console.log(`🆕 Found ${newMarkets.length} new markets`);

  let alertsSent = 0;

  for (const market of newMarkets) {
    if (alertsSent >= CONFIG.MAX_ALERTS_PER_CYCLE) break;

    const marketId = market.id || market.slug;
    const marketTitle = market.question?.toLowerCase() || '';
    
    // Detect category from market title
    const detectedCategory = detectCategory(marketTitle);

    for (const sub of subscribers) {
      const userCategories = sub.params?.categories || [];
      
      // Check if this market matches user's categories
      if (userCategories.length === 0) {
        continue; // User hasn't set categories
      }

      const matchedCategory = userCategories.find(cat => cat === detectedCategory);
      
      if (!matchedCategory) {
        continue;
      }

      // Check if we already sent this alert
      if (await hasRecentSmartAlert(sub.telegramId, 'new_market', marketId, 24)) {
        continue;
      }

      try {
        const outcomes = parseOutcomes(market);
        const yesPrice = outcomes.find(o => o.name.toLowerCase() === 'yes')?.price || 0.5;
        
        const msg = formatNewMarketAlert(
          { ...market, price: yesPrice },
          matchedCategory
        );
        
        await bot.api.sendMessage(sub.telegramId, msg, { parse_mode: 'MarkdownV2' });
        await logSmartAlert(sub.telegramId, 'new_market', marketId, { category: matchedCategory });
        alertsSent++;
        
        console.log(`   Sent new market alert to user ${sub.telegramId} (${matchedCategory})`);
        
        // Rate limit
        await sleep(100);
      } catch (err) {
        console.error(`Failed to send new market alert to ${sub.telegramId}:`, err.message);
      }
    }
  }
}

/**
 * Detect category from market title
 */
function detectCategory(title) {
  const lowerTitle = title.toLowerCase();
  
  // Crypto keywords
  if (/bitcoin|btc|ethereum|eth|crypto|defi|solana|sol|nft|blockchain|binance|coinbase/.test(lowerTitle)) {
    return 'crypto';
  }
  
  // Politics keywords
  if (/trump|biden|election|president|congress|senate|democrat|republican|vote|governor|mayor|political/.test(lowerTitle)) {
    return 'politics';
  }
  
  // Sports keywords
  if (/nba|nfl|ufc|mlb|nhl|soccer|football|basketball|tennis|golf|olympics|super bowl|world cup|champion/.test(lowerTitle)) {
    return 'sports';
  }
  
  // Tech keywords
  if (/apple|google|microsoft|meta|nvidia|ai|artificial intelligence|openai|chatgpt|tesla|spacex|iphone|android/.test(lowerTitle)) {
    return 'tech';
  }
  
  // Economics keywords
  if (/fed|federal reserve|inflation|gdp|interest rate|recession|unemployment|economy|stock|s&p|nasdaq/.test(lowerTitle)) {
    return 'economics';
  }
  
  // Entertainment keywords
  if (/oscar|grammy|emmy|movie|film|actor|actress|celebrity|tv show|netflix|disney|box office|album/.test(lowerTitle)) {
    return 'entertainment';
  }
  
  // World events
  if (/war|ukraine|russia|china|climate|un|united nations|nato|treaty|summit/.test(lowerTitle)) {
    return 'world';
  }
  
  return 'other';
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the monitor
runMonitor().catch(console.error);
