// PolyPulse Beautiful Formatting
// Every output must be premium quality

import { CONFIG, PREMIUM_FEATURES } from './config.js';

const SPARKLINE = CONFIG.SPARKLINE_CHARS;

/**
 * Escape special characters for Telegram MarkdownV2
 */
export function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format number as human-readable volume
 */
export function formatVolume(volume) {
  const num = parseFloat(volume) || 0;
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(0)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format price as percentage
 */
export function formatPercent(price) {
  const num = parseFloat(price) || 0;
  return `${(num * 100).toFixed(1)}%`;
}

/**
 * Generate sparkline from price history
 */
export function generateSparkline(prices) {
  if (!prices || prices.length < 2) return '';
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  
  return prices.map(p => {
    const normalized = (p - min) / range;
    const index = Math.min(SPARKLINE.length - 1, Math.floor(normalized * SPARKLINE.length));
    return SPARKLINE[index];
  }).join('');
}

/**
 * Get change indicator with color
 */
export function getChangeIndicator(change) {
  const pct = (change * 100).toFixed(1);
  if (change > 0.001) {
    return { emoji: '🟢', arrow: '↑', text: `+${pct}%`, direction: 'up' };
  } else if (change < -0.001) {
    return { emoji: '🔴', arrow: '↓', text: `${pct}%`, direction: 'down' };
  }
  return { emoji: '⚪', arrow: '→', text: '0%', direction: 'flat' };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLen = 50) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Generate market insight based on data
 */
export function generateInsight(market) {
  const change = market.oneDayPriceChange || 0;
  const volume = market.volume24hr || 0;
  
  if (Math.abs(change) > 0.1) {
    return change > 0 ? '🔥 Surging today' : '📉 Sharp decline';
  }
  if (volume > 500000) {
    return '💎 High volume activity';
  }
  if (Math.abs(change) < 0.01) {
    return '📊 Holding steady';
  }
  if (change > 0.03) {
    return '📈 Gaining momentum';
  }
  if (change < -0.03) {
    return '⚠️ Trending down';
  }
  return '👀 Worth watching';
}

// ============ MESSAGE TEMPLATES ============

/**
 * Welcome message (/start)
 */
export function formatWelcome() {
  return `*Welcome to PolyPulse\\!* 📊

Track prediction markets in real\\-time\\. Get instant odds on elections, crypto, sports, and more\\.

*Quick start:*
/trending — See what's hot right now
/price bitcoin — Check any market
/alert trump 70 — Get notified at your price

*All commands:* /help

_Free to use\\. Premium for unlimited alerts\\._`;
}

/**
 * Format trending markets
 */
export function formatTrending(markets) {
  if (!markets?.length) {
    return '📊 No trending markets found\\. Try again in a moment\\.';
  }

  let msg = `*🔥 Trending Markets*\n\n`;

  markets.forEach((market, i) => {
    const outcomes = parseOutcomes(market);
    const yesPrice = outcomes.find(o => o.name.toLowerCase() === 'yes');
    const change = getChangeIndicator(market.oneDayPriceChange || 0);
    const volume = formatVolume(market.volume24hr || 0);
    const insight = generateInsight(market);
    
    const question = truncate(market.question, 45);
    
    msg += `*${i + 1}\\. ${escapeMarkdown(question)}*\n`;
    msg += `   ${change.emoji} *${escapeMarkdown(yesPrice?.pct || '—')}* ${escapeMarkdown(change.text)} ${change.arrow}\n`;
    msg += `   💰 ${escapeMarkdown(volume)} · _${escapeMarkdown(insight)}_\n\n`;
  });

  msg += `_💡 Get details: /price Bitcoin_`;
  
  return msg;
}

/**
 * Format price detail for a market
 */
export function formatPrice(market, relatedMarkets = []) {
  const outcomes = parseOutcomes(market);
  const change = getChangeIndicator(market.oneDayPriceChange || 0);
  const volume = formatVolume(market.volume24hr || 0);
  const totalVol = formatVolume(market.volumeNum || 0);
  
  // Build sparkline (simulated for now - would need historical data)
  const basePrice = outcomes[0]?.price || 0.5;
  const fakeHistory = Array(8).fill(0).map((_, i) => 
    basePrice + (Math.random() - 0.5) * 0.1 * (i / 8)
  );
  fakeHistory.push(basePrice);
  const sparkline = generateSparkline(fakeHistory);

  let msg = `*📊 ${escapeMarkdown(truncate(market.question, 60))}*\n\n`;
  
  // Outcomes
  outcomes.forEach(outcome => {
    const emoji = outcome.name.toLowerCase() === 'yes' ? '✅' : 
                  outcome.name.toLowerCase() === 'no' ? '❌' : '🔹';
    msg += `${emoji} *${escapeMarkdown(outcome.name)}:* ${escapeMarkdown(outcome.pct)}\n`;
  });
  
  msg += `\n`;
  msg += `*24h Trend:* ${escapeMarkdown(sparkline)} ${change.emoji} ${escapeMarkdown(change.text)}\n`;
  msg += `*Volume:* ${escapeMarkdown(volume)} today · ${escapeMarkdown(totalVol)} total\n`;
  
  // Related markets
  if (relatedMarkets.length > 0) {
    msg += `\n_You might also watch:_\n`;
    relatedMarkets.slice(0, 2).forEach(m => {
      const q = truncate(m.question, 35);
      msg += `• ${escapeMarkdown(q)}\n`;
    });
  }
  
  // Polymarket link
  const slug = market.slug || market.id;
  if (slug) {
    msg += `\n[View on Polymarket](https://polymarket.com/event/${slug})`;
  }
  
  return msg;
}

/**
 * Format premium upsell
 */
export function formatPremiumUpsell(feature = 'alerts') {
  const featureEmoji = {
    alerts: '🔔',
    watchlist: '📋',
    whale: '🐋',
    portfolio: '💼',
    digest: '📬',
  };

  let msg = `${featureEmoji[feature] || '✨'} *${escapeMarkdown(feature.charAt(0).toUpperCase() + feature.slice(1))} is a Premium feature\\.*\n\n`;
  msg += `Get instant notifications when markets move — so you never miss a trade\\.\n\n`;
  msg += `*✨ Premium includes:*\n`;
  
  PREMIUM_FEATURES.forEach(f => {
    msg += `${escapeMarkdown(f)}\n`;
  });
  
  msg += `\n*$9\\.99/month* — cancel anytime\\.\n`;
  msg += `→ /upgrade to start`;
  
  return msg;
}

/**
 * Format rate limit message
 */
export function formatRateLimit(remaining, feature) {
  return `⏳ *You've used your free ${escapeMarkdown(feature)} queries for today\\.*

Resets in ~${remaining} hours\\.

Upgrade to Premium for unlimited access → /upgrade`;
}

/**
 * Format error message
 */
export function formatError(type) {
  const messages = {
    notFound: "🔍 Couldn't find that market\\. Try /search election or /trending to browse\\.",
    apiDown: "⚠️ Polymarket data is temporarily unavailable\\. We're on it — try again in a few minutes\\.",
    generic: "❌ Something went wrong\\. Please try again in a moment\\.",
  };
  return messages[type] || messages.generic;
}

/**
 * Format alert confirmation
 */
export function formatAlertCreated(market, threshold, direction, currentPrice) {
  const arrow = direction === 'above' ? '📈' : '📉';
  const directionText = direction === 'above' ? 'rises to' : 'drops to';
  const thresholdPct = escapeMarkdown((threshold * 100).toFixed(0) + '%');
  const currentPct = escapeMarkdown((currentPrice * 100).toFixed(1) + '%');
  
  return `✅ *Alert set\\!*

📊 *${escapeMarkdown(truncate(market.question, 50))}*

${arrow} I'll message you when YES ${directionText} *${thresholdPct}*
📍 Currently at *${currentPct}*

_Checking every minute\\. View alerts: /alerts_`;
}

/**
 * Format upgrade success
 */
export function formatUpgradeSuccess() {
  return `🎉 *Welcome to Premium\\!*

Your account has been upgraded\\. Here's what's now unlocked:

✅ Unlimited price queries
✅ Unlimited alerts  
✅ Watchlist \\& portfolio tracking
✅ Whale movement alerts
✅ Daily market digests

_Your alerts are now active\\._

Need help? Just ask\\!`;
}

/**
 * Format watchlist display
 */
export function formatWatchlist(items, maxItems) {
  let msg = `*📋 Your Watchlist \\(${items.length}/${maxItems}\\)*\n\n`;

  items.forEach((item, i) => {
    const name = truncate(item.market_name, 40);
    const currentPct = escapeMarkdown((item.currentPrice * 100).toFixed(1) + '%');
    const change = item.currentPrice - (item.added_price || 0);
    const changePct = escapeMarkdown((change * 100).toFixed(1) + '%');
    
    const changeEmoji = change > 0.001 ? '🟢' : change < -0.001 ? '🔴' : '⚪';
    const changeSign = change > 0 ? '+' : '';

    msg += `*${i + 1}\\.* ${escapeMarkdown(name)}\n`;
    msg += `   YES: *${currentPct}* ${changeEmoji} ${escapeMarkdown(changeSign)}${changePct} since added\n\n`;
  });

  msg += `_Remove: /unwatch bitcoin_`;
  return msg;
}

/**
 * Format watch added confirmation
 */
export function formatWatchAdded(market, currentPrice) {
  const pct = escapeMarkdown((currentPrice * 100).toFixed(1) + '%');
  return `✅ *Added to watchlist\\!*

📊 ${escapeMarkdown(truncate(market.question, 50))}
📍 Current: *${pct}*

_View your watchlist: /watchlist_`;
}

/**
 * Format digest status message
 */
export function formatDigestStatus(enabled) {
  if (enabled) {
    return `✅ *Daily Digest enabled\\!*

You'll receive a market summary every day at 8am EST\\.

Your digest includes:
• Watchlist price changes
• Triggered alerts summary  
• Top movers

_Disable anytime: /digest off_`;
  }

  return `❌ *Daily Digest disabled*

You won't receive daily summaries\\.

_Enable: /digest on_`;
}

/**
 * Format account status
 */
export function formatAccount(user, isPremium) {
  if (isPremium) {
    const memberSince = new Date(user.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return `*📊 Your Account*

Status: ✨ *Premium*
Member since: ${escapeMarkdown(memberSince)}

*Your Premium perks:*
• Unlimited price queries
• Unlimited alerts
• Daily market digests
• Priority support

_Thank you for your support\\!_`;
  }
  
  const usage = user.daily_usage || {};
  return `*📊 Your Account*

Status: Free tier

*Today's usage:*
• Trending: ${usage.trending || 0}/3
• Price checks: ${usage.price || 0}/10
• Searches: ${usage.search || 0}/5
• Alerts: 3 max

_Upgrade to Premium for unlimited access → /upgrade_`;
}

// ============ HELPERS ============

/**
 * Parse outcomes from market data
 */
function parseOutcomes(market) {
  try {
    const outcomes = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    
    return outcomes.map((name, i) => ({
      name,
      price: parseFloat(prices[i]) || 0,
      pct: formatPercent(prices[i] || 0),
    }));
  } catch {
    return [];
  }
}

/**
 * Format morning briefing message
 */
export function formatMorningBriefing(data) {
  const { watchlistItems, triggeredAlerts, whaleEvents, topMovers, newMarkets } = data;
  
  let msg = `☀️ *Good morning — here's your PolyPulse briefing*\n\n`;

  // Watchlist section
  if (watchlistItems && watchlistItems.length > 0) {
    msg += `📊 *YOUR WATCHLIST*\n`;
    watchlistItems.forEach(item => {
      const name = truncate(item.name, 35);
      const pct = (item.currentPrice * 100).toFixed(0);
      const change = item.currentPrice - item.addedPrice;
      const changePct = (change * 100).toFixed(0);
      const changeStr = change >= 0 ? `+${changePct}%` : `${changePct}%`;
      const changeLabel = item.overnight ? 'overnight' : 'since added';
      
      msg += `• ${escapeMarkdown(name)} — *${pct}%* \\(${escapeMarkdown(changeStr)} ${changeLabel}\\)\n`;
    });
    msg += `\n`;
  }

  // Triggered alerts
  if (triggeredAlerts && triggeredAlerts.length > 0) {
    msg += `🔔 *ALERTS TRIGGERED OVERNIGHT*\n`;
    triggeredAlerts.forEach(alert => {
      const name = truncate(alert.market_name, 35);
      const thresholdPct = (alert.threshold * 100).toFixed(0);
      const time = new Date(alert.triggered_at).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      msg += `• ⚡ ${escapeMarkdown(name)} crossed ${thresholdPct}% at ${escapeMarkdown(time)}\n`;
    });
    msg += `\n`;
  }

  // Whale moves (if available)
  if (whaleEvents && whaleEvents.length > 0) {
    msg += `🐋 *WHALE MOVES \\(Last 12h\\)*\n`;
    whaleEvents.slice(0, 3).forEach(whale => {
      const amount = formatVolume(whale.amount_usd);
      const name = truncate(whale.market_title, 30);
      const oldPct = (whale.odds_before * 100).toFixed(0);
      const newPct = (whale.odds_after * 100).toFixed(0);
      msg += `• ${escapeMarkdown(amount)} dropped on ${escapeMarkdown(whale.side)} for "${escapeMarkdown(name)}" \\(was ${oldPct}%, now ${newPct}%\\)\n`;
    });
    msg += `\n`;
  }

  // Top movers
  if (topMovers && topMovers.length > 0) {
    msg += `🔥 *BIGGEST MOVERS \\(24h\\)*\n`;
    topMovers.slice(0, 5).forEach(mover => {
      const name = truncate(mover.question, 35);
      const oldPct = ((mover.yesterdayPrice || 0.5) * 100).toFixed(0);
      const newPct = ((mover.currentPrice || 0.5) * 100).toFixed(0);
      const change = mover.currentPrice - (mover.yesterdayPrice || 0.5);
      const changePct = (change * 100).toFixed(0);
      const changeStr = change >= 0 ? `+${changePct}%` : `${changePct}%`;
      msg += `• "${escapeMarkdown(name)}" — ${oldPct}% → ${newPct}% \\(${escapeMarkdown(changeStr)}\\)\n`;
    });
    msg += `\n`;
  }

  // New markets
  if (newMarkets && newMarkets.length > 0) {
    msg += `📈 *NEW MARKETS WORTH WATCHING*\n`;
    newMarkets.slice(0, 3).forEach(market => {
      const name = truncate(market.question, 40);
      const pct = ((market.price || 0.5) * 100).toFixed(0);
      msg += `• "${escapeMarkdown(name)}" — opened at ${pct}%\n`;
    });
    msg += `\n`;
  }

  msg += `Have a great day\\! Reply /price \\[market\\] for real\\-time odds\\.`;
  
  return msg;
}

/**
 * Format briefing status/settings display
 */
export function formatBriefingSettings(prefs, isPremium) {
  if (!isPremium) {
    return `☀️ *Morning Briefing*

This premium feature delivers a personalized market digest every morning\\.

*What you'll receive:*
• Your watchlist with overnight changes
• Any alerts that triggered while you slept
• 🐋 Whale moves \\(big money bets\\)
• Top movers \\(biggest % changes\\)
• New markets worth watching

_Upgrade to Premium to enable → /upgrade_`;
  }

  const enabled = prefs?.enabled ?? false;
  const timezone = prefs?.timezone || 'UTC';
  const hour = prefs?.send_hour ?? 8;
  const hourDisplay = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;

  let msg = `☀️ *Morning Briefing*\n\n`;
  msg += `Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
  msg += `Timezone: ${escapeMarkdown(timezone)}\n`;
  msg += `Delivery time: ${escapeMarkdown(hourDisplay)} ${escapeMarkdown(timezone)}\n\n`;

  msg += `*What's included:*\n`;
  msg += `• Your watchlist with overnight changes\n`;
  msg += `• Alerts triggered while you slept\n`;
  msg += `• 🐋 Whale moves \\(big money bets\\)\n`;
  msg += `• Top 5 movers \\(24h\\)\n`;
  msg += `• New markets worth watching\n\n`;

  msg += `*Commands:*\n`;
  msg += `\`/briefing on\` — Enable daily briefing\n`;
  msg += `\`/briefing off\` — Disable briefing\n`;
  msg += `\`/briefing time 7am\` — Set delivery time\n`;
  msg += `\`/timezone PST\` — Set your timezone`;

  return msg;
}

/**
 * Format timezone confirmation
 */
export function formatTimezoneSet(timezone, hour) {
  const hourDisplay = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  
  return `🌍 *Timezone updated\\!*

Your timezone: *${escapeMarkdown(timezone)}*
Briefing time: *${escapeMarkdown(hourDisplay)} ${escapeMarkdown(timezone)}*

_Your morning briefing will arrive at this time daily\\._`;
}

/**
 * Format briefing time set confirmation  
 */
export function formatBriefingTimeSet(hour, timezone) {
  const hourDisplay = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  
  return `⏰ *Briefing time updated\\!*

New delivery time: *${escapeMarkdown(hourDisplay)} ${escapeMarkdown(timezone)}*

_Your morning briefing will arrive at this time daily\\._`;
}

// ============ WHALE ALERTS ============

/**
 * Format whale alert message
 */
export function formatWhaleAlert(event, stats = null) {
  const { marketTitle, amountUsd, side, oddsBefore, oddsAfter } = event;
  const amount = formatVolume(amountUsd);
  
  // Determine emoji based on amount
  let emoji = '🐋';  // Whale: $50K+
  if (amountUsd >= 500000) {
    emoji = '🏦';  // Institution: $500K+
  } else if (amountUsd >= 100000) {
    emoji = '🦈';  // Shark: $100K+
  }

  const oddsMove = oddsAfter && oddsBefore 
    ? (oddsAfter - oddsBefore) * 100 
    : null;
  const oddsMoveStr = oddsMove !== null 
    ? `${oddsMove >= 0 ? '+' : ''}${oddsMove.toFixed(1)}%`
    : '';
  
  let msg = `${emoji} *WHALE ALERT*\n\n`;
  msg += `*${escapeMarkdown(amount)}* just dropped on *${escapeMarkdown(side)}*\n`;
  msg += `Market: _${escapeMarkdown(truncate(marketTitle, 80))}_\n`;
  
  if (oddsBefore && oddsAfter) {
    msg += `Odds moved: ${formatPercent(oddsBefore)} → ${formatPercent(oddsAfter)} \\(${escapeMarkdown(oddsMoveStr)}\\)\n`;
  }
  
  msg += `Time: Just now\n`;

  // Add 24h stats if available
  if (stats && stats.count > 0) {
    msg += `\n_This is whale \\#${stats.count} on this market today\\._\n`;
    msg += `_24h whale volume: ${escapeMarkdown(formatVolume(stats.yesVolume))} YES / ${escapeMarkdown(formatVolume(stats.noVolume))} NO_`;
  }

  return msg;
}

/**
 * Format whale settings status
 */
export function formatWhaleSettings(prefs, isPremiumUser) {
  if (!isPremiumUser) {
    return `🐋 *Whale Alerts — Premium Only*

Get instant notifications when whales \\($50K\\+\\) make big moves on Polymarket\\.

*What you'll see:*
• 🐋 Whale moves \\($50K\\+\\)
• 🦈 Shark moves \\($100K\\+\\)
• 🏦 Institution moves \\($500K\\+\\)
• Market impact \\(odds before/after\\)

_Upgrade to Premium to enable → /upgrade_`;
  }

  const enabled = prefs?.enabled ?? false;
  const minAmount = prefs?.min_amount_usd ?? 50000;
  const minAmountDisplay = minAmount >= 1000000 
    ? `$${(minAmount / 1000000).toFixed(1)}M` 
    : `$${(minAmount / 1000).toFixed(0)}K`;

  let msg = `🐋 *Whale Alerts*\n\n`;
  msg += `Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
  msg += `Minimum bet: ${escapeMarkdown(minAmountDisplay)}\n`;
  msg += `Rate limit: 10 alerts/hour max\n\n`;

  msg += `*Commands:*\n`;
  msg += `\`/whale on\` — Enable alerts \\($50K\\+\\)\n`;
  msg += `\`/whale 100k\` — Only alert $100K\\+ bets\n`;
  msg += `\`/whale 500k\` — Only alert $500K\\+ bets\n`;
  msg += `\`/whale off\` — Disable alerts`;

  return msg;
}

/**
 * Format whale enabled confirmation
 */
export function formatWhaleEnabled(minAmount) {
  const minAmountDisplay = minAmount >= 1000000 
    ? `$${(minAmount / 1000000).toFixed(1)}M` 
    : `$${(minAmount / 1000).toFixed(0)}K`;
  
  let emoji = '🐋';
  if (minAmount >= 500000) emoji = '🏦';
  else if (minAmount >= 100000) emoji = '🦈';

  return `${emoji} *Whale alerts enabled\\!*

Minimum bet: *${escapeMarkdown(minAmountDisplay)}*
Rate limit: 10 alerts/hour max

_You'll be notified instantly when big money moves markets\\._`;
}

/**
 * Format whale disabled confirmation
 */
export function formatWhaleDisabled() {
  return `❌ *Whale alerts disabled*

_Re\\-enable anytime: /whale on_`;
}

export { parseOutcomes };
