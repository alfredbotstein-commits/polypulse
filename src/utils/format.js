/**
 * PolyPulse Premium Formatting Utilities
 * Beautiful, consistent, human-readable output
 */

import { CONFIG } from '../config.js';

/**
 * Format volume as human-readable string
 * 1247832 → "$1.2M"
 */
export function formatVolume(volume) {
  if (!volume || volume === 0) return '$0';
  
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${Math.round(volume)}`;
}

/**
 * Format price as percentage
 * 0.65 → "65%"
 */
export function formatPercent(price) {
  if (price === null || price === undefined) return '—';
  const pct = typeof price === 'string' ? parseFloat(price) * 100 : price * 100;
  return `${Math.round(pct)}%`;
}

/**
 * Format price change with directional arrow
 * +0.05 → "↑ +5%"
 * -0.03 → "↓ -3%"
 */
export function formatChange(change) {
  if (!change || change === 0) return '→ 0%';
  
  const pct = change * 100;
  if (pct > 0) {
    return `↑ +${pct.toFixed(1)}%`;
  } else {
    return `↓ ${pct.toFixed(1)}%`;
  }
}

/**
 * Get color-coded emoji for change
 * Positive → 🟢, Negative → 🔴, Neutral → ⚪
 */
export function getChangeEmoji(change) {
  if (!change) return '⚪';
  if (change > 0.02) return '🟢';  // >2% up
  if (change < -0.02) return '🔴'; // >2% down
  return '⚪';
}

/**
 * Generate sparkline from price history
 * Uses unicode block characters: ▁▂▃▄▅▆▇█
 * Returns string like "▁▂▃▅▇▅▃"
 */
export function generateSparkline(prices, length = 7) {
  if (!prices || prices.length === 0) return '▅▅▅▅▅▅▅';
  
  const chars = CONFIG.SPARKLINE_CHARS;
  const data = prices.slice(-length);
  
  if (data.length === 0) return chars[4].repeat(7);
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.01; // Avoid division by zero
  
  return data.map(p => {
    const normalized = (p - min) / range;
    const index = Math.min(Math.floor(normalized * chars.length), chars.length - 1);
    return chars[index];
  }).join('');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape Telegram Markdown V2 special characters
 */
export function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format a market for display in messages
 */
export function formatMarketLine(market, index = null) {
  const name = truncate(market.question || market.market_name, 55);
  const odds = formatPercent(market.yesPrice || market.price);
  const change = market.priceChange24h || market.oneDayPriceChange || 0;
  const changeEmoji = getChangeEmoji(change);
  const changeStr = formatChange(change);
  const volume = formatVolume(market.volume24hr || 0);
  
  const prefix = index !== null ? `${index + 1}.` : '•';
  
  return `${prefix} *${escapeMarkdown(name)}*
   ${changeEmoji} ${odds} ${changeStr}  •  24h: ${volume}`;
}

/**
 * Format detailed market view
 */
export function formatMarketDetail(market, priceHistory = []) {
  const name = escapeMarkdown(market.question);
  const yesPrice = formatPercent(market.yesPrice);
  const noPrice = formatPercent(market.noPrice);
  const volume = formatVolume(market.volumeNum || market.volume || 0);
  const volume24h = formatVolume(market.volume24hr || 0);
  const change = market.priceChange24h || market.oneDayPriceChange || 0;
  const changeStr = formatChange(change);
  const changeEmoji = getChangeEmoji(change);
  const sparkline = generateSparkline(priceHistory);
  
  return `📊 *${name}*

✅ YES: *${yesPrice}*  •  ❌ NO: *${noPrice}*

📈 24h Trend: ${sparkline} ${changeStr}
💰 Volume: ${volume} \\(24h: ${volume24h}\\)`;
}

/**
 * Generate a one-line insight based on market data
 */
export function generateInsight(market) {
  const change = market.priceChange24h || market.oneDayPriceChange || 0;
  const volume = market.volume24hr || 0;
  const avgVolume = market.avgVolume24hr || volume; // Fallback
  
  // Volume spike
  if (volume > avgVolume * 2) {
    return '🔥 Unusual volume spike';
  }
  
  // Big mover
  if (change > 0.1) {
    return '🚀 Surging today';
  } else if (change < -0.1) {
    return '📉 Sharp decline';
  } else if (change > 0.05) {
    return '📈 Strong momentum';
  } else if (change < -0.05) {
    return '⚠️ Weakening';
  }
  
  // Stable
  if (Math.abs(change) < 0.01) {
    return '➡️ Holding steady';
  }
  
  return '📊 Normal activity';
}

/**
 * Format time remaining until date
 */
export function formatTimeRemaining(endDate) {
  if (!endDate) return '';
  
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end - now;
  
  if (diffMs < 0) return 'Ended';
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 30) {
    return `${Math.floor(days / 30)}mo remaining`;
  } else if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else {
    return `${hours}h remaining`;
  }
}

/**
 * Format P&L for portfolio
 * Returns styled string with emoji
 */
export function formatPnL(entryPrice, currentPrice, shares = 1) {
  const entry = typeof entryPrice === 'string' ? parseFloat(entryPrice) : entryPrice;
  const current = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;
  
  const pnlPercent = ((current - entry) / entry) * 100;
  const pnlAbsolute = (current - entry) * shares;
  
  const emoji = pnlPercent > 0 ? '📈' : pnlPercent < 0 ? '📉' : '➡️';
  const sign = pnlPercent > 0 ? '+' : '';
  
  return `${emoji} ${sign}${pnlPercent.toFixed(1)}%`;
}

/**
 * Format a beautiful divider
 */
export function divider() {
  return '─────────────────';
}

/**
 * Format subscription status
 */
export function formatSubscriptionStatus(user) {
  if (user.subscription_status === 'premium') {
    const startDate = user.subscription_started_at 
      ? new Date(user.subscription_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Active';
    return `✨ *Premium Member*\nSince: ${startDate}`;
  }
  return '📭 Free Plan';
}
