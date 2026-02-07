/**
 * PolyPulse Alert Engine
 * Monitors markets and triggers notifications
 */

import { CONFIG } from '../config.js';
import { getAllActiveAlerts, deactivateAlert } from '../db/supabase.js';
import { getMarket } from './polymarket.js';
import { formatPercent, escapeMarkdown, truncate } from '../utils/format.js';

let botInstance = null;
let isRunning = false;
let checkInterval = null;

/**
 * Initialize the alert engine with bot instance
 */
export function initAlertEngine(bot) {
  botInstance = bot;
}

/**
 * Start the alert checking loop
 */
export function startAlertEngine() {
  if (isRunning) {
    console.log('⚠️ Alert engine already running');
    return;
  }
  
  isRunning = true;
  console.log('🔔 Alert engine started (checking every 60s)');
  
  // Initial check after 30 seconds
  setTimeout(() => {
    checkAlerts().catch(err => console.error('Alert check error:', err));
  }, 30000);
  
  // Regular interval
  checkInterval = setInterval(() => {
    checkAlerts().catch(err => console.error('Alert check error:', err));
  }, CONFIG.ALERT_CHECK_INTERVAL_MS);
}

/**
 * Stop the alert engine
 */
export function stopAlertEngine() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  isRunning = false;
  console.log('🔔 Alert engine stopped');
}

/**
 * Check all active alerts
 */
async function checkAlerts() {
  if (!botInstance) {
    console.error('Alert engine: bot not initialized');
    return;
  }
  
  const alerts = await getAllActiveAlerts();
  
  if (alerts.length === 0) return;
  
  console.log(`📊 Checking ${alerts.length} alerts...`);
  
  // Group alerts by market to minimize API calls
  const marketIds = [...new Set(alerts.map(a => a.market_id || a.market_slug))];
  const marketData = {};
  
  // Fetch market data
  for (const id of marketIds) {
    try {
      const market = await getMarket(id);
      if (market) {
        marketData[id] = market;
      }
      // Small delay between requests
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`Failed to fetch market ${id}:`, err.message);
    }
  }
  
  // Check each alert
  for (const alert of alerts) {
    const marketId = alert.market_id || alert.market_slug;
    const market = marketData[marketId];
    
    if (!market) continue;
    
    const currentPrice = market.yesPrice;
    if (currentPrice === null) continue;
    
    const triggered = checkTrigger(alert, currentPrice);
    
    if (triggered) {
      await sendAlertNotification(alert, market, currentPrice);
      await deactivateAlert(alert.id);
      console.log(`🔔 Alert #${alert.id} triggered at ${formatPercent(currentPrice)}`);
    }
  }
}

/**
 * Check if an alert should trigger
 */
function checkTrigger(alert, currentPrice) {
  const threshold = alert.threshold;
  const direction = alert.direction;
  
  switch (direction) {
    case 'above':
      return currentPrice >= threshold;
    case 'below':
      return currentPrice <= threshold;
    case 'change':
      // For percentage change alerts, we'd need historical tracking
      // Simplified: treat as 'above' for now
      return currentPrice >= threshold;
    default:
      return false;
  }
}

/**
 * Send notification to user
 */
async function sendAlertNotification(alert, market, currentPrice) {
  const thresholdPct = formatPercent(alert.threshold);
  const currentPct = formatPercent(currentPrice);
  const marketName = truncate(escapeMarkdown(alert.market_name || market.question), 50);
  const directionEmoji = alert.direction === 'above' ? '📈' : '📉';
  const triggerVerb = alert.direction === 'above' ? 'crossed above' : 'dropped below';
  
  const message = `🔔 *Alert Triggered\\!*

${directionEmoji} *${marketName}*

The market ${triggerVerb} your target\\.

🎯 Target: ${thresholdPct}
📍 Current: *${currentPct}*

[View on Polymarket](https://polymarket\\.com/event/${market.slug || ''})

_This alert has been removed\\. Set another with /alert_`;

  try {
    await botInstance.api.sendMessage(alert.chat_id, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error(`Failed to send alert to ${alert.chat_id}:`, err.message);
    
    // If blocked by user, we should probably clean up their alerts
    if (err.message?.includes('blocked') || err.message?.includes('chat not found')) {
      // Could deactivate all user's alerts here
    }
  }
}

/**
 * Manually trigger an alert check (for testing)
 */
export async function manualCheck() {
  await checkAlerts();
}

export default {
  initAlertEngine,
  startAlertEngine,
  stopAlertEngine,
  manualCheck,
};
