// PolyPulse Whale Monitor
// Monitors Polymarket for large bets and alerts subscribers
// Run as: node src/whale-monitor.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getWhaleAlertSubscribers,
  recordWhaleSent,
  logWhaleEvent,
  getMarketWhaleStats,
  getRecentWhaleEvents,
} from './db.js';
import { formatWhaleAlert } from './format.js';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Polymarket Data API endpoint (correct endpoint for trades)
const DATA_API = 'https://data-api.polymarket.com';

// Default minimum bet size to track ($10K)
// Premium users can configure their own threshold (min $10K)
const DEFAULT_MIN_WHALE_AMOUNT = 10000;

// Track seen transactions to avoid duplicates
const seenTxHashes = new Set();
const MAX_SEEN_SIZE = 10000;  // Prevent memory leak

// Last poll timestamp
let lastPollTime = Date.now();

/**
 * Fetch recent trades from Polymarket Data API
 * GET https://data-api.polymarket.com/trades?limit=X
 * 
 * Response format:
 * {
 *   proxyWallet: "0x...",
 *   side: "BUY" | "SELL",
 *   size: 1000,        // number of shares
 *   price: 0.62,       // price per share (0-1)
 *   timestamp: 1770477499,
 *   title: "Market question",
 *   slug: "market-slug",
 *   outcome: "Yes",    // which outcome they bet on
 *   transactionHash: "0x...",
 *   name: "TraderName",
 *   ...
 * }
 */
async function fetchRecentTrades(limit = 200) {
  try {
    const response = await fetch(`${DATA_API}/trades?limit=${limit}`);
    
    if (!response.ok) {
      console.error('Trade API error:', response.status);
      return [];
    }

    const trades = await response.json();
    return trades || [];
  } catch (error) {
    console.error('Error fetching trades:', error.message);
    return [];
  }
}

/**
 * Filter and process whale trades
 * Trade value in USD = size * price
 */
async function processWhaleTrades(trades, minAmount = DEFAULT_MIN_WHALE_AMOUNT) {
  const whaleTrades = [];

  for (const trade of trades) {
    // Skip if no transaction hash or already seen
    const txHash = trade.transactionHash;
    if (!txHash || seenTxHashes.has(txHash)) continue;
    
    // Calculate trade value in USD
    // Trade amount = shares * price
    const shares = parseFloat(trade.size || 0);
    const price = parseFloat(trade.price || 0);
    const amountUsd = shares * price;

    // Skip if below threshold
    if (amountUsd < minAmount) continue;

    // Mark as seen
    seenTxHashes.add(txHash);
    
    // Cleanup old hashes to prevent memory leak
    if (seenTxHashes.size > MAX_SEEN_SIZE) {
      const toDelete = Array.from(seenTxHashes).slice(0, 1000);
      toDelete.forEach(h => seenTxHashes.delete(h));
    }

    // Determine if this is a YES or NO bet
    // BUY on "Yes" = betting YES, SELL on "Yes" = betting NO
    // BUY on "No" = betting NO, SELL on "No" = betting YES
    const outcome = (trade.outcome || '').toLowerCase();
    const side = trade.side?.toUpperCase() === 'BUY' ? 'buy' : 'sell';
    
    let betSide;
    if (outcome === 'yes') {
      betSide = side === 'buy' ? 'YES' : 'NO';
    } else if (outcome === 'no') {
      betSide = side === 'buy' ? 'NO' : 'YES';
    } else {
      // For non-binary markets, use the outcome name
      betSide = trade.outcome || 'UNKNOWN';
    }

    // Build whale event
    const whaleEvent = {
      marketId: trade.slug || trade.conditionId || 'unknown',
      marketTitle: trade.title || 'Unknown Market',
      amountUsd,
      shares,
      price,
      side: betSide,
      outcome: trade.outcome,
      tradeSide: trade.side, // Original BUY/SELL
      oddsAfter: price,
      txHash,
      timestamp: trade.timestamp,
      traderName: trade.name || trade.pseudonym || null,
      traderWallet: trade.proxyWallet || null,
    };

    whaleTrades.push(whaleEvent);
  }

  return whaleTrades;
}

/**
 * Get whale tier emoji based on amount
 */
function getWhaleTier(amountUsd) {
  if (amountUsd >= 1000000) return '🐋🐋🐋';  // Mega whale: $1M+
  if (amountUsd >= 500000) return '🐋🐋';     // Big whale: $500K+
  if (amountUsd >= 100000) return '🐋';       // Whale: $100K+
  if (amountUsd >= 50000) return '🦈';        // Shark: $50K+
  if (amountUsd >= 10000) return '🐬';        // Dolphin: $10K+
  return '🐟';                                 // Fish: < $10K
}

/**
 * Send whale alert to a user
 */
async function sendWhaleAlert(telegramId, event, stats) {
  try {
    const tier = getWhaleTier(event.amountUsd);
    const message = formatWhaleAlert(event, stats, tier);
    
    await bot.api.sendMessage(
      telegramId,
      message,
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );
    await recordWhaleSent(telegramId);
    console.log(`Sent whale alert to ${telegramId}: ${tier} $${event.amountUsd.toLocaleString()}`);
    return true;
  } catch (error) {
    console.error(`Failed to send whale alert to ${telegramId}:`, error.message);
    return false;
  }
}

/**
 * Process a single whale event - log and notify subscribers
 */
async function handleWhaleEvent(event) {
  const tier = getWhaleTier(event.amountUsd);
  console.log(`${tier} Whale detected: $${event.amountUsd.toLocaleString()} on ${event.side} for "${event.marketTitle}"`);

  // Log to database
  try {
    await logWhaleEvent(event);
  } catch (error) {
    console.error('Failed to log whale event:', error.message);
  }

  // Get market stats for context
  const stats = await getMarketWhaleStats(event.marketId);

  // Find subscribers who want this alert
  const subscribers = await getWhaleAlertSubscribers(event.amountUsd);
  console.log(`Found ${subscribers.length} subscribers for this whale`);

  // Send alerts
  for (const sub of subscribers) {
    await sendWhaleAlert(sub.telegramId, event, stats);
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }
}

/**
 * Main polling loop
 */
async function pollForWhales() {
  try {
    const trades = await fetchRecentTrades(200);
    console.log(`Fetched ${trades.length} trades`);
    
    const whaleTrades = await processWhaleTrades(trades, DEFAULT_MIN_WHALE_AMOUNT);
    console.log(`Found ${whaleTrades.length} whale trades`);

    for (const whale of whaleTrades) {
      await handleWhaleEvent(whale);
    }
  } catch (error) {
    console.error('Poll error:', error);
  }
}

/**
 * Get recent whale events for display (for /whales command)
 * Fetches from database + live API
 */
export async function getRecentWhales(minAmount = 10000, limit = 10) {
  // First, get from database
  const dbEvents = await getRecentWhaleEvents(24, limit);
  
  // Also fetch fresh from API
  const trades = await fetchRecentTrades(500);
  const freshWhales = await processWhaleTrades(trades, minAmount);
  
  // Combine and deduplicate by tx hash
  const seen = new Set();
  const combined = [];
  
  // Add fresh whales first (more recent)
  for (const whale of freshWhales) {
    if (!seen.has(whale.txHash)) {
      seen.add(whale.txHash);
      combined.push(whale);
    }
  }
  
  // Add database events
  for (const event of dbEvents) {
    if (!seen.has(event.tx_hash)) {
      seen.add(event.tx_hash);
      combined.push({
        marketId: event.market_id,
        marketTitle: event.market_title,
        amountUsd: parseFloat(event.amount_usd),
        side: event.side,
        txHash: event.tx_hash,
        timestamp: new Date(event.detected_at).getTime() / 1000,
      });
    }
  }
  
  // Sort by amount descending and limit
  return combined
    .filter(w => w.amountUsd >= minAmount)
    .sort((a, b) => b.amountUsd - a.amountUsd)
    .slice(0, limit);
}

/**
 * Start the whale monitor
 */
async function start() {
  console.log('🐋 PolyPulse Whale Monitor starting...');
  console.log(`Default minimum whale amount: $${DEFAULT_MIN_WHALE_AMOUNT.toLocaleString()}`);
  console.log(`Data API: ${DATA_API}/trades`);

  // Initial poll
  await pollForWhales();

  // Poll every 30 seconds
  setInterval(pollForWhales, 30 * 1000);

  console.log('Whale monitor running. Polling every 30 seconds.');
}

// Start if run directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  start().catch(console.error);
}

export { pollForWhales, handleWhaleEvent, fetchRecentTrades, processWhaleTrades, getWhaleTier };
