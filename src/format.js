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

// ============ PORTFOLIO TRACKER ============

/**
 * Format portfolio view with P&L
 */
export function formatPortfolio(positions, totalStats) {
  if (!positions || positions.length === 0) {
    return `💼 *Your Portfolio*

_No open positions\\._

*Log a trade:*
\`/buy bitcoin\\-100k 100 0\\.54\` — Log buying 100 shares at 54¢
\`/sell bitcoin\\-100k 50 0\\.73\` — Log selling 50 shares at 73¢

_Track your real Polymarket positions and see real\\-time P&L\\._`;
  }

  let msg = `💼 *YOUR PORTFOLIO*\n\n`;

  // Position list
  positions.forEach((pos, i) => {
    const name = truncate(pos.market_title, 35);
    const shares = pos.pnl.shares.toFixed(0);
    const entryPct = (pos.pnl.entryPrice * 100).toFixed(0);
    const currentPct = (pos.pnl.currentPrice * 100).toFixed(0);
    const pnl = pos.pnl.pnl >= 0 ? `+$${pos.pnl.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl.pnl).toFixed(2)}`;
    const pnlPct = pos.pnl.pnlPercent >= 0 ? `+${pos.pnl.pnlPercent.toFixed(1)}%` : `${pos.pnl.pnlPercent.toFixed(1)}%`;
    const emoji = pos.pnl.pnl >= 0 ? '🟢' : '🔴';

    msg += `*${i + 1}\\.* ${escapeMarkdown(name)}\n`;
    msg += `   ${pos.side} ${shares} @ ${entryPct}¢ → ${currentPct}¢\n`;
    msg += `   ${emoji} *${escapeMarkdown(pnl)}* \\(${escapeMarkdown(pnlPct)}\\)\n\n`;
  });

  // Summary
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *Total invested:* $${escapeMarkdown(totalStats.invested.toFixed(2))}\n`;
  msg += `📊 *Current value:* $${escapeMarkdown(totalStats.currentValue.toFixed(2))}\n`;
  
  const totalPnlStr = totalStats.pnl >= 0 
    ? `+$${totalStats.pnl.toFixed(2)}` 
    : `-$${Math.abs(totalStats.pnl).toFixed(2)}`;
  const totalPnlPct = totalStats.pnlPercent >= 0 
    ? `+${totalStats.pnlPercent.toFixed(1)}%` 
    : `${totalStats.pnlPercent.toFixed(1)}%`;
  const totalEmoji = totalStats.pnl >= 0 ? '🟢' : '🔴';

  msg += `${totalEmoji} *Total P&L:* ${escapeMarkdown(totalPnlStr)} \\(${escapeMarkdown(totalPnlPct)}\\)\n\n`;

  // Best/worst
  if (positions.length > 1) {
    const sorted = [...positions].sort((a, b) => b.pnl.pnlPercent - a.pnl.pnlPercent);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best.pnl.pnlPercent > 0) {
      msg += `📈 *Best:* ${escapeMarkdown(truncate(best.market_title, 25))} \\(${escapeMarkdown(`+${best.pnl.pnlPercent.toFixed(1)}%`)}\\)\n`;
    }
    if (worst.pnl.pnlPercent < 0) {
      msg += `📉 *Worst:* ${escapeMarkdown(truncate(worst.market_title, 25))} \\(${escapeMarkdown(`${worst.pnl.pnlPercent.toFixed(1)}%`)}\\)\n`;
    }
  }

  return msg;
}

/**
 * Format quick P&L summary
 */
export function formatPnLSummary(totalStats, positionCount) {
  const pnlStr = totalStats.pnl >= 0 
    ? `+$${totalStats.pnl.toFixed(2)}` 
    : `-$${Math.abs(totalStats.pnl).toFixed(2)}`;
  const pctStr = totalStats.pnlPercent >= 0 
    ? `+${totalStats.pnlPercent.toFixed(1)}%` 
    : `${totalStats.pnlPercent.toFixed(1)}%`;
  const emoji = totalStats.pnl >= 0 ? '🟢' : '🔴';

  let msg = `${emoji} *Quick P&L*\n\n`;
  msg += `*Total P&L:* ${escapeMarkdown(pnlStr)} \\(${escapeMarkdown(pctStr)}\\)\n`;
  msg += `*Invested:* $${escapeMarkdown(totalStats.invested.toFixed(2))}\n`;
  msg += `*Current:* $${escapeMarkdown(totalStats.currentValue.toFixed(2))}\n`;
  msg += `*Positions:* ${positionCount} open\n\n`;
  msg += `_See details: /portfolio_`;

  return msg;
}

/**
 * Format buy confirmation
 */
export function formatBuyConfirmation(position, isNewPosition) {
  const shares = parseFloat(position.shares).toFixed(0);
  const entryPct = (parseFloat(position.entry_price) * 100).toFixed(0);
  const cost = (parseFloat(position.shares) * parseFloat(position.entry_price)).toFixed(2);

  let msg = `✅ *${isNewPosition ? 'Position opened' : 'Added to position'}\\!*\n\n`;
  msg += `📊 ${escapeMarkdown(truncate(position.market_title, 50))}\n`;
  msg += `${escapeMarkdown(position.side)} ${shares} shares @ ${entryPct}¢\n`;
  msg += `Cost basis: $${escapeMarkdown(cost)}\n\n`;
  msg += `_View portfolio: /portfolio_`;

  return msg;
}

/**
 * Format sell confirmation
 */
export function formatSellConfirmation(position, soldShares, sellPrice, pnl, fullyClosed) {
  const shares = parseFloat(soldShares).toFixed(0);
  const pricePct = (parseFloat(sellPrice) * 100).toFixed(0);
  const proceeds = (parseFloat(soldShares) * parseFloat(sellPrice)).toFixed(2);
  
  const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
  const emoji = pnl >= 0 ? '🟢' : '🔴';

  let msg = `✅ *${fullyClosed ? 'Position closed' : 'Partial sell'}\\!*\n\n`;
  msg += `📊 ${escapeMarkdown(truncate(position.market_title, 50))}\n`;
  msg += `Sold ${shares} shares @ ${pricePct}¢\n`;
  msg += `Proceeds: $${escapeMarkdown(proceeds)}\n`;
  msg += `${emoji} P&L on sale: ${escapeMarkdown(pnlStr)}\n`;

  if (!fullyClosed) {
    const remaining = parseFloat(position.shares).toFixed(0);
    msg += `\n_${remaining} shares remaining\\._`;
  }

  msg += `\n\n_View portfolio: /portfolio_`;

  return msg;
}

/**
 * Format portfolio upsell for free users
 */
export function formatPortfolioUpsell() {
  return `💼 *Portfolio Tracker*

Track your real Polymarket positions with real\\-time P&L\\.

*What you can do:*
• Log buys and sells
• See live P&L on each position
• Get alerts when positions hit targets

*Free:* 1 position max
*Premium:* Unlimited positions \\+ P&L alerts

_Upgrade to track your full portfolio → /upgrade_`;
}

// ============ SMART ALERTS ============

/**
 * Format smart alert settings display
 */
export function formatSmartAlertSettings(prefs, isPremiumUser) {
  if (!isPremiumUser) {
    return `🧠 *Smart Alerts — Premium Only*

Get notified about patterns that signal something big is happening\\.

*Alert types:*
📊 *Volume Spike* — 3x\\+ normal volume in an hour
🚀 *Momentum* — 10%\\+ move in 4 hours
⚠️ *Divergence* — Correlated markets decouple
🆕 *New Market* — New markets in your categories

_Upgrade to Premium to enable → /upgrade_`;
  }

  // Build status for each alert type
  const types = [
    { key: 'volume_spike', name: 'Volume Spike', emoji: '📊', desc: '3x+ normal volume' },
    { key: 'momentum', name: 'Momentum', emoji: '🚀', desc: '10%+ in 4 hours' },
    { key: 'divergence', name: 'Divergence', emoji: '⚠️', desc: 'Correlated markets decouple' },
    { key: 'new_market', name: 'New Market', emoji: '🆕', desc: 'Markets in your categories' },
  ];

  let msg = `🧠 *Smart Alerts*\n\n`;

  types.forEach(type => {
    const pref = prefs.find(p => p.alert_type === type.key);
    const enabled = pref?.enabled ?? false;
    const status = enabled ? '✅' : '❌';
    
    msg += `${type.emoji} *${escapeMarkdown(type.name)}*: ${status}\n`;
    msg += `   _${escapeMarkdown(type.desc)}_\n`;
    
    // Show categories if new_market
    if (type.key === 'new_market' && pref?.params?.categories?.length) {
      const cats = pref.params.categories.join(', ');
      msg += `   Categories: ${escapeMarkdown(cats)}\n`;
    }
    msg += `\n`;
  });

  msg += `*Commands:*\n`;
  msg += `\`/smartalert volume on\` — Enable volume alerts\n`;
  msg += `\`/smartalert momentum off\` — Disable momentum\n`;
  msg += `\`/smartalert categories crypto,politics\`\n`;
  msg += `\`/smartalerts\` — View this status`;

  return msg;
}

/**
 * Format volume spike alert
 */
export function formatVolumeSpikeAlert(market, currentVolume, avgVolume, multiplier, priceChange) {
  const volCurrent = formatVolume(currentVolume);
  const volAvg = formatVolume(avgVolume);
  
  const pricePct = ((priceChange || 0) * 100).toFixed(0);
  const priceStr = priceChange >= 0 ? `+${pricePct}%` : `${pricePct}%`;
  const priceEmoji = priceChange > 0 ? '📈' : priceChange < 0 ? '📉' : '';

  let msg = `📊 *VOLUME SPIKE*\n\n`;
  msg += `"${escapeMarkdown(truncate(market.question, 60))}" just saw *${multiplier.toFixed(1)}x* normal volume\\!\n\n`;
  msg += `*This hour:* ${escapeMarkdown(volCurrent)}\n`;
  msg += `*Avg hourly:* ${escapeMarkdown(volAvg)}\n`;
  
  if (priceChange !== null) {
    msg += `${priceEmoji} *Price change:* ${escapeMarkdown(priceStr)}\n`;
  }

  msg += `\n_Something is happening\\. Check the news\\._\n`;
  msg += `→ /price ${escapeMarkdown(market.slug || market.id || 'market')}`;

  return msg;
}

/**
 * Format momentum alert
 */
export function formatMomentumAlert(market, oldPrice, newPrice, hoursElapsed) {
  const change = (newPrice - oldPrice) * 100;
  const changeStr = change >= 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
  const emoji = change > 0 ? '🚀' : '📉';
  const direction = change > 0 ? 'surged' : 'dropped';

  let msg = `${emoji} *MOMENTUM ALERT*\n\n`;
  msg += `"${escapeMarkdown(truncate(market.question, 60))}" has ${direction} *${escapeMarkdown(Math.abs(change).toFixed(0))}%* in ${hoursElapsed.toFixed(1)} hours\\!\n\n`;
  msg += `*Then:* ${(oldPrice * 100).toFixed(0)}%\n`;
  msg += `*Now:* ${(newPrice * 100).toFixed(0)}%\n`;
  msg += `*Move:* ${escapeMarkdown(changeStr)}\n\n`;
  msg += `_This is one of the fastest moves in this market's history\\._\n`;
  msg += `→ /price ${escapeMarkdown(market.slug || market.id || 'market')}`;

  return msg;
}

/**
 * Format divergence alert
 */
export function formatDivergenceAlert(market1, market2, correlation) {
  let msg = `⚠️ *DIVERGENCE ALERT*\n\n`;
  msg += `These usually\\-correlated markets are moving apart:\n\n`;
  msg += `📊 "${escapeMarkdown(truncate(market1.question, 40))}" — *${(market1.price * 100).toFixed(0)}%*\n`;
  msg += `📊 "${escapeMarkdown(truncate(market2.question, 40))}" — *${(market2.price * 100).toFixed(0)}%*\n\n`;
  msg += `_Historical correlation: ${(correlation * 100).toFixed(0)}%_\n`;
  msg += `_One of them may be mispriced\\._\n\n`;
  msg += `→ /price ${escapeMarkdown(market1.slug || 'market1')}\n`;
  msg += `→ /price ${escapeMarkdown(market2.slug || 'market2')}`;

  return msg;
}

/**
 * Format new market alert
 */
export function formatNewMarketAlert(market, category) {
  const price = market.price || 0.5;
  const volume = market.volume24hr || market.volumeNum || 0;

  let msg = `🆕 *NEW MARKET IN YOUR CATEGORIES*\n\n`;
  msg += `Category: ${escapeMarkdown(category)}\n`;
  msg += `"${escapeMarkdown(truncate(market.question, 60))}"\n\n`;
  msg += `*Opening odds:* ${(price * 100).toFixed(0)}% YES\n`;
  if (volume > 0) {
    msg += `*Volume so far:* ${escapeMarkdown(formatVolume(volume))}\n`;
  }
  msg += `\n→ /price ${escapeMarkdown(market.slug || market.id || 'market')}\n`;
  msg += `→ /watch ${escapeMarkdown(market.slug || market.id || 'market')}`;

  return msg;
}

/**
 * Format smart alert toggle confirmation
 */
export function formatSmartAlertToggled(alertType, enabled) {
  const types = {
    volume_spike: { name: 'Volume Spike', emoji: '📊' },
    momentum: { name: 'Momentum', emoji: '🚀' },
    divergence: { name: 'Divergence', emoji: '⚠️' },
    new_market: { name: 'New Market', emoji: '🆕' },
  };

  const type = types[alertType] || { name: alertType, emoji: '🔔' };

  if (enabled) {
    return `${type.emoji} *${escapeMarkdown(type.name)} alerts enabled\\!*\n\n_You'll be notified when these patterns are detected\\._`;
  } else {
    return `❌ *${escapeMarkdown(type.name)} alerts disabled*\n\n_Re\\-enable anytime: /smartalert ${alertType.replace('_', '')} on_`;
  }
}

/**
 * Format categories set confirmation
 */
export function formatCategoriesSet(categories) {
  const catList = categories.join(', ');
  
  return `🆕 *New Market categories updated\\!*

You'll receive alerts for new markets in:
${escapeMarkdown(catList)}

_Available: crypto, politics, sports, tech, economics, entertainment_`;
}

// ============ CATEGORY SUBSCRIPTIONS ============

/**
 * Category info for display
 */
const CATEGORY_INFO = {
  crypto: { name: 'Crypto', emoji: '🪙', desc: 'Bitcoin, Ethereum, DeFi, regulations' },
  politics: { name: 'Politics', emoji: '🏛️', desc: 'US elections, policy, international' },
  sports: { name: 'Sports', emoji: '⚽', desc: 'UFC, NFL, NBA, soccer, Olympics' },
  tech: { name: 'Tech', emoji: '💻', desc: 'Product launches, IPOs, AI milestones' },
  world: { name: 'World Events', emoji: '🌍', desc: 'Geopolitics, climate, science' },
  economics: { name: 'Economics', emoji: '💰', desc: 'Fed, inflation, GDP, employment' },
  entertainment: { name: 'Entertainment', emoji: '🎬', desc: 'Awards, box office, celebrity' },
};

/**
 * Format available categories list
 */
export function formatCategoriesList() {
  let msg = `📂 *Available Categories*\n\n`;
  msg += `Subscribe to entire categories to get:\n`;
  msg += `• Daily category digest in morning briefing\n`;
  msg += `• Alerts when any market moves 10%\\+\n`;
  msg += `• Notifications for new markets\n\n`;

  for (const [key, info] of Object.entries(CATEGORY_INFO)) {
    msg += `${info.emoji} *${escapeMarkdown(info.name)}*\n`;
    msg += `   _${escapeMarkdown(info.desc)}_\n\n`;
  }

  msg += `*Commands:*\n`;
  msg += `\`/subscribe crypto\` — Subscribe to a category\n`;
  msg += `\`/subscribe politics,sports\` — Multiple at once\n`;
  msg += `\`/unsubscribe crypto\` — Unsubscribe\n`;
  msg += `\`/mysubs\` — View your subscriptions\n\n`;
  msg += `_Free: 1 category\\. Premium: unlimited\\._`;

  return msg;
}

/**
 * Format user's category subscriptions
 */
export function formatMySubs(subs, isPremium) {
  if (!subs || subs.length === 0) {
    return `📭 *No category subscriptions*

Subscribe to categories to get daily digests and alerts for all markets in that category\\.

_See available: /categories_`;
  }

  const limit = isPremium ? '∞' : '1';
  let msg = `📂 *Your Subscriptions \\(${subs.length}/${limit}\\)*\n\n`;

  for (const sub of subs) {
    const info = CATEGORY_INFO[sub.category] || { emoji: '📊', name: sub.category };
    const since = new Date(sub.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    msg += `${info.emoji} *${escapeMarkdown(info.name)}*\n`;
    msg += `   _Since ${escapeMarkdown(since)}_\n\n`;
  }

  msg += `*What you get:*\n`;
  msg += `• Category digest in morning briefing\n`;
  msg += `• Alerts when markets move 10%\\+\n`;
  msg += `• New market notifications\n\n`;

  msg += `_Unsubscribe: /unsubscribe crypto_`;

  return msg;
}

/**
 * Format subscription confirmation
 */
export function formatSubscribeConfirm(categories) {
  if (categories.length === 1) {
    const cat = categories[0];
    const info = CATEGORY_INFO[cat] || { emoji: '📊', name: cat };
    
    return `✅ *Subscribed to ${info.emoji} ${escapeMarkdown(info.name)}\\!*

You'll now receive:
• Daily digest in morning briefing
• Alerts when markets move 10%\\+
• New market notifications

_View all: /mysubs_`;
  }

  // Multiple categories
  let catList = '';
  for (const cat of categories) {
    const info = CATEGORY_INFO[cat] || { emoji: '📊', name: cat };
    catList += `${info.emoji} ${escapeMarkdown(info.name)}\n`;
  }

  return `✅ *Subscribed to ${categories.length} categories\\!*

${catList}
You'll now receive:
• Daily digests in morning briefing
• Alerts when markets move 10%\\+
• New market notifications

_View all: /mysubs_`;
}

/**
 * Format unsubscribe confirmation
 */
export function formatUnsubscribeConfirm(category) {
  const info = CATEGORY_INFO[category] || { emoji: '📊', name: category };
  
  return `❌ *Unsubscribed from ${info.emoji} ${escapeMarkdown(info.name)}*

You'll no longer receive alerts for this category\\.

_Re\\-subscribe: /subscribe ${escapeMarkdown(category)}_`;
}

/**
 * Format category subscription upsell for free users
 */
export function formatCategoryUpsell() {
  return `📂 *Category Subscriptions*

Free tier: *1 category*
Premium: *Unlimited categories*

You're at your limit\\. Upgrade to subscribe to more categories, or unsubscribe from one first\\.

_Upgrade → /upgrade_
_Current subs → /mysubs_`;
}

/**
 * Format category move alert (when a market in subscribed category moves 10%+)
 */
export function formatCategoryMoveAlert(market, category, change) {
  const info = CATEGORY_INFO[category] || { emoji: '📊', name: category };
  const changeStr = change >= 0 ? `+${(change * 100).toFixed(0)}%` : `${(change * 100).toFixed(0)}%`;
  const emoji = change > 0 ? '🚀' : '📉';

  let msg = `${emoji} *CATEGORY ALERT*\n\n`;
  msg += `${info.emoji} *${escapeMarkdown(info.name)}*\n\n`;
  msg += `"${escapeMarkdown(truncate(market.question, 60))}" moved *${escapeMarkdown(changeStr)}*\n\n`;
  msg += `→ /price ${escapeMarkdown(market.slug || market.id || 'market')}`;

  return msg;
}

/**
 * Format category digest section for morning briefing
 */
export function formatCategoryDigest(categoryData) {
  // categoryData: { category: string, topMovers: [], newMarkets: [] }
  const info = CATEGORY_INFO[categoryData.category] || { emoji: '📊', name: categoryData.category };
  
  let msg = `\n${info.emoji} *${escapeMarkdown(info.name.toUpperCase())}*\n`;

  if (categoryData.topMovers && categoryData.topMovers.length > 0) {
    categoryData.topMovers.slice(0, 3).forEach(m => {
      const change = ((m.currentPrice - m.previousPrice) * 100).toFixed(0);
      const changeStr = change >= 0 ? `+${change}%` : `${change}%`;
      const name = truncate(m.question, 35);
      msg += `• ${escapeMarkdown(name)} — ${escapeMarkdown(changeStr)}\n`;
    });
  }

  if (categoryData.newMarkets && categoryData.newMarkets.length > 0) {
    msg += `_New:_\n`;
    categoryData.newMarkets.slice(0, 2).forEach(m => {
      const name = truncate(m.question, 35);
      const price = ((m.price || 0.5) * 100).toFixed(0);
      msg += `• ${escapeMarkdown(name)} — ${price}%\n`;
    });
  }

  return msg;
}

export { parseOutcomes };
