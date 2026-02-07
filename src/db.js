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

export { supabase };
