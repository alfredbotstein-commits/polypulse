// PolyPulse Whale Monitor
// Monitors Polymarket for large bets ($50K+) and alerts subscribers
// Run as: node src/whale-monitor.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getWhaleAlertSubscribers,
  recordWhaleSent,
  logWhaleEvent,
  getMarketWhaleStats,
} from './db.js';
import { formatWhaleAlert } from './format.js';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Polymarket CLOB API endpoint
const CLOB_API = 'https://clob.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';

// Minimum bet size to track ($50K)
const MIN_WHALE_AMOUNT = 50000;

// Track seen transactions to avoid duplicates
const seenTxHashes = new Set();
const MAX_SEEN_SIZE = 10000;  // Prevent memory leak

// Last poll timestamp
let lastPollTime = Date.now();

/**
 * Fetch recent large trades from Polymarket
 * Uses the CLOB API to get recent fills
 */
async function fetchRecentTrades() {
  try {
    // Get recent trades across all markets
    // The CLOB API provides trade data with amounts
    const response = await fetch(`${GAMMA_API}/trades?limit=100`);
    
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
 */
async function processWhaleTrades(trades) {
  const whaleTrades = [];

  for (const trade of trades) {
    // Skip if already seen
    if (trade.id && seenTxHashes.has(trade.id)) continue;
    
    // Calculate trade value in USD
    // Trade amount = shares * price
    const shares = parseFloat(trade.size || trade.amount || 0);
    const price = parseFloat(trade.price || 0);
    const amountUsd = shares * price;

    // Skip if below threshold
    if (amountUsd < MIN_WHALE_AMOUNT) continue;

    // Mark as seen
    if (trade.id) {
      seenTxHashes.add(trade.id);
      // Cleanup old hashes
      if (seenTxHashes.size > MAX_SEEN_SIZE) {
        const toDelete = Array.from(seenTxHashes).slice(0, 1000);
        toDelete.forEach(h => seenTxHashes.delete(h));
      }
    }

    // Build whale event
    const whaleEvent = {
      marketId: trade.market || trade.condition_id || 'unknown',
      marketTitle: trade.market_slug || trade.question || 'Unknown Market',
      amountUsd,
      side: trade.side?.toUpperCase() === 'BUY' ? 'YES' : 'NO',
      oddsBefore: trade.price_before || null,
      oddsAfter: trade.price || price,
      txHash: trade.id || trade.transaction_hash || null,
    };

    whaleTrades.push(whaleEvent);
  }

  return whaleTrades;
}

/**
 * Send whale alert to a user
 */
async function sendWhaleAlert(telegramId, event, stats) {
  try {
    await bot.api.sendMessage(
      telegramId,
      formatWhaleAlert(event, stats),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    );
    await recordWhaleSent(telegramId);
    console.log(`Sent whale alert to ${telegramId}: $${event.amountUsd.toLocaleString()}`);
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
  console.log(`🐋 Whale detected: $${event.amountUsd.toLocaleString()} on ${event.side} for "${event.marketTitle}"`);

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
    const trades = await fetchRecentTrades();
    const whaleTrades = await processWhaleTrades(trades);

    for (const whale of whaleTrades) {
      await handleWhaleEvent(whale);
    }
  } catch (error) {
    console.error('Poll error:', error);
  }
}

/**
 * Alternative: WebSocket monitoring for real-time alerts
 * (More complex but faster than polling)
 */
async function connectWebSocket() {
  // Polymarket doesn't have a public WebSocket for trades yet
  // This is a placeholder for future implementation
  console.log('WebSocket mode not yet implemented, using polling');
}

/**
 * Start the whale monitor
 */
async function start() {
  console.log('🐋 PolyPulse Whale Monitor starting...');
  console.log(`Minimum whale amount: $${MIN_WHALE_AMOUNT.toLocaleString()}`);

  // Initial poll
  await pollForWhales();

  // Poll every 30 seconds
  setInterval(pollForWhales, 30 * 1000);

  console.log('Whale monitor running. Polling every 30 seconds.');
}

// Start if run directly
start().catch(console.error);

export { pollForWhales, handleWhaleEvent };
