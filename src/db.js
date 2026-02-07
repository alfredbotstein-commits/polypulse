// PolyPulse Database Layer
// Supabase client + user management
// Tables prefixed with pp_ to share Supabase project with other apps

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============ USER MANAGEMENT ============

/**
 * Get or create user by Telegram ID
 */
export async function getOrCreateUser(telegramId, username = null) {
  // Try to find existing user
  let { data: user } = await supabase
    .from('pp_users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!user) {
    // Create new user
    const { data: newUser, error } = await supabase
      .from('pp_users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        subscription_status: 'free',
        daily_usage: { trending: 0, price: 0, search: 0 },
        usage_reset_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    user = newUser;
  } else if (username && user.telegram_username !== username) {
    // Update username if changed
    await supabase
      .from('pp_users')
      .update({ telegram_username: username })
      .eq('id', user.id);
  }

  return user;
}

/**
 * Check if user is premium
 */
export function isPremium(user) {
  if (user.subscription_status !== 'premium') return false;
  if (user.premium_until && new Date(user.premium_until) < new Date()) {
    return false;
  }
  return true;
}

/**
 * Get user's remaining usage for a feature
 */
export async function checkUsage(user, feature) {
  // Premium users have unlimited
  if (isPremium(user)) {
    return { allowed: true, remaining: Infinity };
  }

  const limit = CONFIG.FREE_LIMITS[feature];
  if (!limit) return { allowed: true, remaining: Infinity };

  // Check if we need to reset daily usage
  const resetAt = new Date(user.usage_reset_at);
  const now = new Date();
  const hoursSinceReset = (now - resetAt) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    // Reset usage
    await supabase
      .from('pp_users')
      .update({
        daily_usage: { trending: 0, price: 0, search: 0 },
        usage_reset_at: now.toISOString(),
      })
      .eq('id', user.id);
    
    return { allowed: true, remaining: limit };
  }

  const used = user.daily_usage?.[feature] || 0;
  const remaining = limit - used;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
    used,
  };
}

/**
 * Increment usage counter for a feature
 */
export async function incrementUsage(user, feature) {
  const currentUsage = user.daily_usage || {};
  const newUsage = {
    ...currentUsage,
    [feature]: (currentUsage[feature] || 0) + 1,
  };

  await supabase
    .from('pp_users')
    .update({ daily_usage: newUsage })
    .eq('id', user.id);
}

/**
 * Update user's Stripe customer ID
 */
export async function setStripeCustomer(telegramId, customerId) {
  await supabase
    .from('pp_users')
    .update({ stripe_customer_id: customerId })
    .eq('telegram_id', telegramId);
}

/**
 * Activate premium subscription
 */
export async function activatePremium(stripeCustomerId, subscriptionId) {
  const { data: user, error } = await supabase
    .from('pp_users')
    .update({
      subscription_status: 'premium',
      stripe_subscription_id: subscriptionId,
      premium_until: null, // Ongoing subscription
    })
    .eq('stripe_customer_id', stripeCustomerId)
    .select()
    .single();

  if (error) throw error;
  return user;
}

/**
 * Cancel premium subscription
 */
export async function cancelPremium(stripeCustomerId, endsAt = null) {
  await supabase
    .from('pp_users')
    .update({
      subscription_status: 'cancelled',
      premium_until: endsAt,
    })
    .eq('stripe_customer_id', stripeCustomerId);
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeId(stripeCustomerId) {
  const { data } = await supabase
    .from('pp_users')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  
  return data;
}

// ============ ALERTS ============

/**
 * Create a new alert
 */
export async function createAlert(userId, chatId, marketId, marketName, threshold, direction) {
  const { data, error } = await supabase
    .from('pp_alerts')
    .insert({
      user_id: userId,
      telegram_chat_id: chatId,
      market_id: marketId,
      market_name: marketName,
      threshold,
      direction,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's alerts
 */
export async function getUserAlerts(userId) {
  const { data } = await supabase
    .from('pp_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('triggered', false)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get all active alerts (for polling)
 */
export async function getAllActiveAlerts() {
  const { data } = await supabase
    .from('pp_alerts')
    .select('*, pp_users!inner(telegram_id)')
    .eq('triggered', false);

  return data || [];
}

/**
 * Mark alert as triggered
 */
export async function triggerAlert(alertId) {
  await supabase
    .from('pp_alerts')
    .update({
      triggered: true,
      triggered_at: new Date().toISOString(),
    })
    .eq('id', alertId);
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId, userId) {
  const { data, error } = await supabase
    .from('pp_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId)
    .select();

  return data?.length > 0;
}

/**
 * Count user's alerts
 */
export async function countUserAlerts(userId) {
  const { count } = await supabase
    .from('pp_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('triggered', false);

  return count || 0;
}

// ============ WATCHLIST ============

/**
 * Add to watchlist
 */
export async function addToWatchlist(userId, marketId, marketName, currentPrice) {
  const { data, error } = await supabase
    .from('pp_watchlist')
    .upsert({
      user_id: userId,
      market_id: marketId,
      market_name: marketName,
      added_price: currentPrice,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(userId, marketId) {
  await supabase
    .from('pp_watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('market_id', marketId);
}

/**
 * Get user's watchlist
 */
export async function getWatchlist(userId) {
  const { data } = await supabase
    .from('pp_watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Count user's watchlist items
 */
export async function countWatchlist(userId) {
  const { count } = await supabase
    .from('pp_watchlist')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  return count || 0;
}

/**
 * Find watchlist item by market ID prefix
 */
export async function findWatchlistItem(userId, marketIdPrefix) {
  const { data } = await supabase
    .from('pp_watchlist')
    .select('*')
    .eq('user_id', userId)
    .ilike('market_id', `${marketIdPrefix}%`);

  return data?.[0] || null;
}

// ============ DIGEST ============

/**
 * Get user's digest setting
 */
export async function getDigestSetting(userId) {
  const { data } = await supabase
    .from('pp_users')
    .select('digest_enabled, digest_hour')
    .eq('id', userId)
    .single();

  return data || { digest_enabled: false, digest_hour: 13 };
}

/**
 * Update user's digest setting
 */
export async function setDigestSetting(userId, enabled, hour = null) {
  const update = { digest_enabled: enabled };
  if (hour !== null) update.digest_hour = hour;

  await supabase
    .from('pp_users')
    .update(update)
    .eq('id', userId);
}

/**
 * Get all users with digest enabled (for cron job)
 */
export async function getDigestSubscribers(hour) {
  const { data } = await supabase
    .from('pp_users')
    .select('*')
    .eq('digest_enabled', true)
    .eq('digest_hour', hour)
    .eq('subscription_status', 'premium');

  return data || [];
}

// ============ BRIEFING PREFERENCES ============

/**
 * Get user's briefing preferences
 */
export async function getBriefingPrefs(telegramId) {
  const { data } = await supabase
    .from('pp_briefing_prefs')
    .select('*')
    .eq('user_id', telegramId)
    .single();

  return data || null;
}

/**
 * Create or update briefing preferences
 */
export async function upsertBriefingPrefs(telegramId, prefs) {
  const { data, error } = await supabase
    .from('pp_briefing_prefs')
    .upsert({
      user_id: telegramId,
      ...prefs,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Enable/disable briefing for a user
 */
export async function setBriefingEnabled(telegramId, enabled) {
  return upsertBriefingPrefs(telegramId, { enabled });
}

/**
 * Set briefing timezone
 */
export async function setBriefingTimezone(telegramId, timezone) {
  return upsertBriefingPrefs(telegramId, { timezone });
}

/**
 * Set briefing hour
 */
export async function setBriefingHour(telegramId, sendHour) {
  return upsertBriefingPrefs(telegramId, { send_hour: sendHour });
}

/**
 * Get all users who need briefing for a specific UTC hour
 * Accounts for timezone offsets
 */
export async function getUsersForBriefing(utcHour) {
  // Get all enabled briefings
  const { data: briefings } = await supabase
    .from('pp_briefing_prefs')
    .select('*, pp_users!inner(*)')
    .eq('enabled', true);

  if (!briefings || briefings.length === 0) return [];

  // Filter by timezone - check if it's the right hour in their timezone
  const usersToNotify = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const briefing of briefings) {
    // Check if user is premium
    if (briefing.pp_users.subscription_status !== 'premium') continue;

    // Calculate what hour it is in user's timezone
    const userLocalHour = getHourInTimezone(utcHour, briefing.timezone);
    
    // Check if this matches their preferred send hour
    if (userLocalHour === briefing.send_hour) {
      // Check if we already sent today
      if (briefing.last_sent_at) {
        const lastSent = new Date(briefing.last_sent_at).toISOString().split('T')[0];
        if (lastSent === today) continue; // Already sent today
      }
      
      usersToNotify.push({
        ...briefing,
        user: briefing.pp_users,
      });
    }
  }

  return usersToNotify;
}

/**
 * Mark briefing as sent for a user
 */
export async function markBriefingSent(telegramId) {
  await supabase
    .from('pp_briefing_prefs')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('user_id', telegramId);
}

/**
 * Get the hour in a specific timezone given a UTC hour
 */
function getHourInTimezone(utcHour, timezone) {
  // Common timezone offsets
  const offsets = {
    'UTC': 0,
    'GMT': 0,
    'EST': -5,
    'EDT': -4,
    'CST': -6,
    'CDT': -5,
    'MST': -7,
    'MDT': -6,
    'PST': -8,
    'PDT': -7,
    'PT': -8,
    'ET': -5,
    'CT': -6,
    'MT': -7,
    // Europe
    'CET': 1,
    'CEST': 2,
    'WET': 0,
    'EET': 2,
    'BST': 1,
    // Asia
    'IST': 5.5,
    'JST': 9,
    'KST': 9,
    'CST_CHINA': 8,
    'HKT': 8,
    'SGT': 8,
    // Australia
    'AEST': 10,
    'AEDT': 11,
    'AWST': 8,
  };

  // Normalize timezone string
  const tz = timezone.toUpperCase().replace(/[^A-Z]/g, '');
  const offset = offsets[tz] ?? 0;

  let localHour = utcHour + offset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;

  return Math.floor(localHour);
}

/**
 * Parse timezone string and validate
 */
export function parseTimezone(input) {
  const validTimezones = [
    'UTC', 'GMT', 'EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT',
    'PT', 'ET', 'CT', 'MT',
    'CET', 'CEST', 'WET', 'EET', 'BST',
    'IST', 'JST', 'KST', 'HKT', 'SGT',
    'AEST', 'AEDT', 'AWST',
  ];

  const normalized = input.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (validTimezones.includes(normalized)) {
    return normalized;
  }

  // Try common aliases
  const aliases = {
    'EASTERN': 'EST',
    'PACIFIC': 'PST',
    'CENTRAL': 'CST',
    'MOUNTAIN': 'MST',
  };

  return aliases[normalized] || null;
}

/**
 * Parse time string like "7am", "8:00", "14:00"
 */
export function parseTimeString(input) {
  const str = input.toLowerCase().trim();
  
  // Match patterns like "7am", "7 am", "7:00am", "7:00 am"
  const ampmMatch = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const period = ampmMatch[3];

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    if (hour >= 0 && hour <= 23) {
      return hour;
    }
  }

  return null;
}

// ============ WHALE ALERTS ============

/**
 * Get user's whale alert preferences
 */
export async function getWhalePrefs(telegramId) {
  const { data } = await supabase
    .from('pp_whale_prefs')
    .select('*')
    .eq('user_id', telegramId)
    .single();

  return data || null;
}

/**
 * Create or update whale alert preferences
 */
export async function upsertWhalePrefs(telegramId, prefs) {
  const { data, error } = await supabase
    .from('pp_whale_prefs')
    .upsert({
      user_id: telegramId,
      ...prefs,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Enable whale alerts with optional threshold
 */
export async function setWhaleEnabled(telegramId, enabled, minAmount = null) {
  const update = { enabled };
  if (minAmount !== null) update.min_amount_usd = minAmount;
  return upsertWhalePrefs(telegramId, update);
}

/**
 * Set whale alert minimum amount
 */
export async function setWhaleMinAmount(telegramId, minAmount) {
  return upsertWhalePrefs(telegramId, { min_amount_usd: minAmount });
}

/**
 * Get all users who should receive a whale alert for a given amount
 * Checks: enabled, premium, min_amount threshold, rate limit
 */
export async function getWhaleAlertSubscribers(amountUsd) {
  // Get all enabled whale prefs where amount >= their threshold
  const { data: prefs } = await supabase
    .from('pp_whale_prefs')
    .select('*, pp_users!inner(*)')
    .eq('enabled', true)
    .lte('min_amount_usd', amountUsd);

  if (!prefs || prefs.length === 0) return [];

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Filter by premium status and rate limit
  return prefs.filter(pref => {
    // Must be premium
    if (pref.pp_users.subscription_status !== 'premium') return false;

    // Rate limit: max 10 alerts per hour
    if (pref.last_alert_at) {
      const lastAlert = new Date(pref.last_alert_at);
      if (lastAlert > hourAgo && pref.alerts_sent_today >= 10) {
        return false;
      }
    }

    return true;
  }).map(pref => ({
    telegramId: pref.user_id,
    minAmount: pref.min_amount_usd,
    user: pref.pp_users,
  }));
}

/**
 * Record that we sent a whale alert to a user
 */
export async function recordWhaleSent(telegramId) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Get current prefs
  const prefs = await getWhalePrefs(telegramId);
  const lastSentDate = prefs?.last_alert_at 
    ? new Date(prefs.last_alert_at).toISOString().split('T')[0] 
    : null;

  // Reset counter if new day
  const alertsToday = lastSentDate === today 
    ? (prefs?.alerts_sent_today || 0) + 1 
    : 1;

  await supabase
    .from('pp_whale_prefs')
    .update({
      alerts_sent_today: alertsToday,
      last_alert_at: now.toISOString(),
    })
    .eq('user_id', telegramId);
}

/**
 * Log a whale event to the database
 */
export async function logWhaleEvent(event) {
  const { data, error } = await supabase
    .from('pp_whale_events')
    .insert({
      market_id: event.marketId,
      market_title: event.marketTitle,
      amount_usd: event.amountUsd,
      side: event.side,
      odds_before: event.oddsBefore,
      odds_after: event.oddsAfter,
      tx_hash: event.txHash,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get recent whale events (for briefing)
 */
export async function getRecentWhaleEvents(hours = 12, limit = 5) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('pp_whale_events')
    .select('*')
    .gte('detected_at', since)
    .order('amount_usd', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get whale stats for a market (24h)
 */
export async function getMarketWhaleStats(marketId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('pp_whale_events')
    .select('*')
    .eq('market_id', marketId)
    .gte('detected_at', since);

  if (!data || data.length === 0) {
    return { yesVolume: 0, noVolume: 0, count: 0 };
  }

  let yesVolume = 0;
  let noVolume = 0;

  for (const event of data) {
    if (event.side === 'YES') {
      yesVolume += parseFloat(event.amount_usd);
    } else {
      noVolume += parseFloat(event.amount_usd);
    }
  }

  return { yesVolume, noVolume, count: data.length };
}

// ============ PORTFOLIO TRACKER ============

/**
 * Get user's open positions
 */
export async function getPositions(telegramId, status = 'open') {
  const { data } = await supabase
    .from('pp_positions')
    .select('*')
    .eq('user_id', telegramId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get all positions (open + closed) for a user
 */
export async function getAllPositions(telegramId) {
  const { data } = await supabase
    .from('pp_positions')
    .select('*')
    .eq('user_id', telegramId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get position by ID
 */
export async function getPositionById(positionId) {
  const { data } = await supabase
    .from('pp_positions')
    .select('*')
    .eq('id', positionId)
    .single();

  return data || null;
}

/**
 * Find position by market ID for a user
 */
export async function findPositionByMarket(telegramId, marketId) {
  const { data } = await supabase
    .from('pp_positions')
    .select('*')
    .eq('user_id', telegramId)
    .ilike('market_id', `%${marketId}%`)
    .eq('status', 'open')
    .limit(1);

  return data?.[0] || null;
}

/**
 * Create a new position (buy)
 */
export async function createPosition(telegramId, marketId, marketTitle, side, shares, entryPrice) {
  const { data, error } = await supabase
    .from('pp_positions')
    .insert({
      user_id: telegramId,
      market_id: marketId,
      market_title: marketTitle,
      side: side.toUpperCase(),
      shares,
      entry_price: entryPrice,
      status: 'open',
    })
    .select()
    .single();

  if (error) throw error;

  // Log the trade
  await logTrade(telegramId, data.id, 'buy', shares, entryPrice);

  return data;
}

/**
 * Update position shares (add to existing position)
 */
export async function addToPosition(positionId, additionalShares, price, telegramId) {
  const position = await getPositionById(positionId);
  if (!position) throw new Error('Position not found');

  // Calculate new average entry price
  const totalCost = (position.shares * position.entry_price) + (additionalShares * price);
  const newShares = parseFloat(position.shares) + parseFloat(additionalShares);
  const newEntryPrice = totalCost / newShares;

  const { data, error } = await supabase
    .from('pp_positions')
    .update({
      shares: newShares,
      entry_price: newEntryPrice,
    })
    .eq('id', positionId)
    .select()
    .single();

  if (error) throw error;

  // Log the trade
  await logTrade(telegramId, positionId, 'buy', additionalShares, price);

  return data;
}

/**
 * Reduce position shares (sell)
 */
export async function reducePosition(positionId, sellShares, price, telegramId) {
  const position = await getPositionById(positionId);
  if (!position) throw new Error('Position not found');

  const currentShares = parseFloat(position.shares);
  const selling = parseFloat(sellShares);

  if (selling > currentShares) {
    throw new Error(`Cannot sell ${selling} shares, only ${currentShares} available`);
  }

  const remainingShares = currentShares - selling;

  // Log the trade first
  await logTrade(telegramId, positionId, 'sell', selling, price);

  if (remainingShares <= 0) {
    // Close the position
    const { data, error } = await supabase
      .from('pp_positions')
      .update({
        shares: 0,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', positionId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, fullyClosed: true };
  } else {
    // Partial sell
    const { data, error } = await supabase
      .from('pp_positions')
      .update({ shares: remainingShares })
      .eq('id', positionId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, fullyClosed: false };
  }
}

/**
 * Log a trade
 */
export async function logTrade(telegramId, positionId, action, shares, price) {
  const { data, error } = await supabase
    .from('pp_trades')
    .insert({
      user_id: telegramId,
      position_id: positionId,
      action,
      shares,
      price,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get trade history for a user
 */
export async function getTradeHistory(telegramId, limit = 20) {
  const { data } = await supabase
    .from('pp_trades')
    .select('*, pp_positions(market_title, side)')
    .eq('user_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get trade history for a position
 */
export async function getPositionTrades(positionId) {
  const { data } = await supabase
    .from('pp_trades')
    .select('*')
    .eq('position_id', positionId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * Count user's open positions
 */
export async function countOpenPositions(telegramId) {
  const { count } = await supabase
    .from('pp_positions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', telegramId)
    .eq('status', 'open');

  return count || 0;
}

/**
 * Calculate P&L for a position given current price
 */
export function calculatePositionPnL(position, currentPrice) {
  const shares = parseFloat(position.shares);
  const entryPrice = parseFloat(position.entry_price);
  const current = parseFloat(currentPrice);
  
  const costBasis = shares * entryPrice;
  const currentValue = shares * current;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? ((currentValue / costBasis) - 1) * 100 : 0;

  return {
    shares,
    entryPrice,
    currentPrice: current,
    costBasis,
    currentValue,
    pnl,
    pnlPercent,
  };
}

// ============ SMART ALERTS ============

/**
 * Valid smart alert types
 */
export const SMART_ALERT_TYPES = ['volume_spike', 'momentum', 'divergence', 'new_market'];

/**
 * Get user's smart alert preferences
 */
export async function getSmartAlertPrefs(telegramId) {
  const { data } = await supabase
    .from('pp_smart_alert_prefs')
    .select('*')
    .eq('user_id', telegramId);

  return data || [];
}

/**
 * Get a specific smart alert preference
 */
export async function getSmartAlertPref(telegramId, alertType) {
  const { data } = await supabase
    .from('pp_smart_alert_prefs')
    .select('*')
    .eq('user_id', telegramId)
    .eq('alert_type', alertType)
    .single();

  return data || null;
}

/**
 * Create or update a smart alert preference
 */
export async function upsertSmartAlertPref(telegramId, alertType, enabled, params = {}) {
  const { data, error } = await supabase
    .from('pp_smart_alert_prefs')
    .upsert({
      user_id: telegramId,
      alert_type: alertType,
      enabled,
      params,
    }, { onConflict: 'user_id,alert_type' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Enable/disable a smart alert type
 */
export async function setSmartAlertEnabled(telegramId, alertType, enabled) {
  const existing = await getSmartAlertPref(telegramId, alertType);
  return upsertSmartAlertPref(telegramId, alertType, enabled, existing?.params || {});
}

/**
 * Update smart alert params (like categories for new_market)
 */
export async function setSmartAlertParams(telegramId, alertType, params) {
  const existing = await getSmartAlertPref(telegramId, alertType);
  return upsertSmartAlertPref(telegramId, alertType, existing?.enabled ?? true, params);
}

/**
 * Get all premium users with a specific smart alert enabled
 */
export async function getSmartAlertSubscribers(alertType) {
  const { data } = await supabase
    .from('pp_smart_alert_prefs')
    .select('*, pp_users!inner(*)')
    .eq('alert_type', alertType)
    .eq('enabled', true);

  if (!data || data.length === 0) return [];

  // Filter for premium users only
  return data
    .filter(pref => pref.pp_users.subscription_status === 'premium')
    .map(pref => ({
      telegramId: pref.user_id,
      params: pref.params || {},
      user: pref.pp_users,
    }));
}

/**
 * Check if we already sent this alert to this user recently
 * Prevents duplicate alerts for the same market/event
 */
export async function hasRecentSmartAlert(telegramId, alertType, marketId, hoursBack = 4) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('pp_smart_alert_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', telegramId)
    .eq('alert_type', alertType)
    .eq('market_id', marketId)
    .gte('sent_at', since);

  return (count || 0) > 0;
}

/**
 * Log that we sent a smart alert
 */
export async function logSmartAlert(telegramId, alertType, marketId, details = {}) {
  const { error } = await supabase
    .from('pp_smart_alert_history')
    .insert({
      user_id: telegramId,
      alert_type: alertType,
      market_id: marketId,
      details,
    });

  if (error) console.error('Error logging smart alert:', error);
}

/**
 * Store market volume snapshot for spike detection
 */
export async function storeVolumeSnapshot(marketId, volumeUsd, price = null) {
  const { error } = await supabase
    .from('pp_market_volume_snapshots')
    .insert({
      market_id: marketId,
      volume_usd: volumeUsd,
      price,
    });

  if (error) console.error('Error storing volume snapshot:', error);
}

/**
 * Get volume snapshots for a market (for calculating average)
 */
export async function getVolumeSnapshots(marketId, hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('pp_market_volume_snapshots')
    .select('*')
    .eq('market_id', marketId)
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: true });

  return data || [];
}

/**
 * Calculate average hourly volume for a market
 */
export async function getAverageHourlyVolume(marketId) {
  const snapshots = await getVolumeSnapshots(marketId, 24);
  
  if (snapshots.length < 2) return null;

  // Calculate volume delta between snapshots
  let totalVolumeDelta = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const delta = parseFloat(snapshots[i].volume_usd) - parseFloat(snapshots[i-1].volume_usd);
    if (delta > 0) totalVolumeDelta += delta;
  }

  // Get hours spanned
  const firstTime = new Date(snapshots[0].snapshot_at);
  const lastTime = new Date(snapshots[snapshots.length - 1].snapshot_at);
  const hoursSpanned = (lastTime - firstTime) / (1000 * 60 * 60);

  if (hoursSpanned < 1) return null;

  return totalVolumeDelta / hoursSpanned;
}

/**
 * Get price snapshots for momentum detection
 */
export async function getPriceHistory(marketId, hoursBack = 4) {
  const snapshots = await getVolumeSnapshots(marketId, hoursBack);
  return snapshots
    .filter(s => s.price !== null)
    .map(s => ({
      price: parseFloat(s.price),
      time: new Date(s.snapshot_at),
    }));
}

/**
 * Clean up old volume snapshots (older than 48 hours)
 */
export async function cleanupOldSnapshots() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('pp_market_volume_snapshots')
    .delete()
    .lt('snapshot_at', cutoff);

  if (error) console.error('Error cleaning up snapshots:', error);
}

/**
 * Clean up old alert history (older than 7 days)
 */
export async function cleanupOldAlertHistory() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('pp_smart_alert_history')
    .delete()
    .lt('sent_at', cutoff);

  if (error) console.error('Error cleaning up alert history:', error);
}

// ============ CATEGORY SUBSCRIPTIONS ============

/**
 * Valid categories for subscription
 */
export const VALID_CATEGORIES = {
  crypto: { name: 'Crypto', emoji: '🪙', keywords: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'defi', 'nft', 'solana', 'sol', 'xrp', 'dogecoin', 'doge', 'altcoin', 'blockchain', 'token', 'coin'] },
  politics: { name: 'Politics', emoji: '🏛️', keywords: ['election', 'trump', 'biden', 'president', 'senate', 'congress', 'vote', 'democrat', 'republican', 'governor', 'mayor', 'political', 'policy', 'campaign'] },
  sports: { name: 'Sports', emoji: '⚽', keywords: ['ufc', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'baseball', 'tennis', 'golf', 'olympics', 'championship', 'super bowl', 'world cup', 'match', 'game', 'fight'] },
  tech: { name: 'Tech', emoji: '💻', keywords: ['apple', 'google', 'microsoft', 'ai', 'artificial intelligence', 'openai', 'nvidia', 'tesla', 'meta', 'amazon', 'ipo', 'launch', 'product', 'software', 'hardware'] },
  world: { name: 'World Events', emoji: '🌍', keywords: ['war', 'peace', 'climate', 'treaty', 'united nations', 'nato', 'china', 'russia', 'ukraine', 'israel', 'middle east', 'europe', 'asia', 'africa', 'geopolitical'] },
  economics: { name: 'Economics', emoji: '💰', keywords: ['fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'unemployment', 'recession', 'economy', 'stock', 'market', 'bond', 'treasury', 'central bank'] },
  entertainment: { name: 'Entertainment', emoji: '🎬', keywords: ['oscar', 'grammy', 'emmy', 'movie', 'film', 'music', 'celebrity', 'award', 'box office', 'album', 'concert', 'netflix', 'disney', 'streaming'] },
};

/**
 * Get user's category subscriptions
 */
export async function getCategorySubs(telegramId) {
  const { data } = await supabase
    .from('pp_category_subs')
    .select('*')
    .eq('user_id', telegramId)
    .order('created_at', { ascending: true });

  return data || [];
}

/**
 * Count user's category subscriptions
 */
export async function countCategorySubs(telegramId) {
  const { count } = await supabase
    .from('pp_category_subs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', telegramId);

  return count || 0;
}

/**
 * Subscribe to a category
 */
export async function addCategorySub(telegramId, category) {
  const { data, error } = await supabase
    .from('pp_category_subs')
    .upsert({
      user_id: telegramId,
      category: category.toLowerCase(),
    }, { onConflict: 'user_id,category' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unsubscribe from a category
 */
export async function removeCategorySub(telegramId, category) {
  const { data, error } = await supabase
    .from('pp_category_subs')
    .delete()
    .eq('user_id', telegramId)
    .eq('category', category.toLowerCase())
    .select();

  return data?.length > 0;
}

/**
 * Check if user is subscribed to a category
 */
export async function isSubscribedToCategory(telegramId, category) {
  const { count } = await supabase
    .from('pp_category_subs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', telegramId)
    .eq('category', category.toLowerCase());

  return (count || 0) > 0;
}

/**
 * Get all premium users subscribed to a specific category
 */
export async function getCategorySubscribers(category) {
  const { data } = await supabase
    .from('pp_category_subs')
    .select('*, pp_users!inner(*)')
    .eq('category', category.toLowerCase());

  if (!data || data.length === 0) return [];

  // Filter for premium users only
  return data
    .filter(sub => sub.pp_users.subscription_status === 'premium')
    .map(sub => ({
      telegramId: sub.user_id,
      user: sub.pp_users,
    }));
}

/**
 * Auto-categorize a market based on its title/question
 */
export function categorizeMarket(marketTitle) {
  const title = marketTitle.toLowerCase();
  const matchedCategories = [];

  for (const [catKey, catInfo] of Object.entries(VALID_CATEGORIES)) {
    for (const keyword of catInfo.keywords) {
      if (title.includes(keyword)) {
        matchedCategories.push(catKey);
        break; // Only add each category once
      }
    }
  }

  return matchedCategories;
}

/**
 * Store a market's category mapping
 */
export async function storeMarketCategory(marketId, category, marketTitle = null) {
  const { error } = await supabase
    .from('pp_market_categories')
    .upsert({
      market_id: marketId,
      category: category.toLowerCase(),
      market_title: marketTitle,
    }, { onConflict: 'market_id,category' });

  if (error) console.error('Error storing market category:', error);
}

/**
 * Get categories for a market
 */
export async function getMarketCategories(marketId) {
  const { data } = await supabase
    .from('pp_market_categories')
    .select('category')
    .eq('market_id', marketId);

  return (data || []).map(d => d.category);
}

/**
 * Get all markets in a category
 */
export async function getMarketsInCategory(category, limit = 50) {
  const { data } = await supabase
    .from('pp_market_categories')
    .select('*')
    .eq('category', category.toLowerCase())
    .order('categorized_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get users who should receive category alerts for a market
 * Checks which categories the market belongs to and returns subscribed premium users
 */
export async function getUsersForMarketCategoryAlert(marketId, marketTitle) {
  // First, categorize the market
  const categories = categorizeMarket(marketTitle);
  
  if (categories.length === 0) return [];

  // Store the categorizations
  for (const cat of categories) {
    await storeMarketCategory(marketId, cat, marketTitle);
  }

  // Get all subscribers for these categories
  const allSubscribers = new Map(); // Use map to deduplicate by telegramId

  for (const cat of categories) {
    const subscribers = await getCategorySubscribers(cat);
    for (const sub of subscribers) {
      if (!allSubscribers.has(sub.telegramId)) {
        allSubscribers.set(sub.telegramId, {
          ...sub,
          matchedCategories: [cat],
        });
      } else {
        allSubscribers.get(sub.telegramId).matchedCategories.push(cat);
      }
    }
  }

  return Array.from(allSubscribers.values());
}

export { supabase };
