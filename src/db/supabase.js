import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// ============ USER OPERATIONS ============

/**
 * Get or create user by Telegram ID
 */
export async function getOrCreateUser(telegramId, chatId, username = null) {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId.toString())
    .single();
  
  if (existing) {
    // Update chat_id and username if changed
    if (existing.chat_id !== chatId.toString() || existing.username !== username) {
      await supabase
        .from('users')
        .update({ chat_id: chatId.toString(), username })
        .eq('telegram_id', telegramId.toString());
    }
    return existing;
  }
  
  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId.toString(),
      chat_id: chatId.toString(),
      username,
      subscription_status: 'free',
      usage_counts: { trending: 0, price: 0, search: 0 },
      usage_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  
  return newUser;
}

/**
 * Get user by Telegram ID
 */
export async function getUser(telegramId) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId.toString())
    .single();
  
  return data;
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeId(stripeCustomerId) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  
  return data;
}

/**
 * Update user's Stripe customer ID
 */
export async function setStripeCustomerId(telegramId, stripeCustomerId) {
  await supabase
    .from('users')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('telegram_id', telegramId.toString());
}

/**
 * Upgrade user to premium
 */
export async function upgradeUser(telegramId, stripeSubscriptionId) {
  await supabase
    .from('users')
    .update({
      subscription_status: 'premium',
      stripe_subscription_id: stripeSubscriptionId,
      subscription_started_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId.toString());
}

/**
 * Downgrade user to free
 */
export async function downgradeUser(telegramId) {
  await supabase
    .from('users')
    .update({
      subscription_status: 'free',
      subscription_ended_at: new Date().toISOString(),
    })
    .eq('telegram_id', telegramId.toString());
}

/**
 * Check and increment usage counter
 * Returns { allowed: boolean, remaining: number }
 */
export async function checkAndIncrementUsage(telegramId, action, limit) {
  const user = await getUser(telegramId);
  if (!user) return { allowed: false, remaining: 0 };
  
  // Premium users have unlimited
  if (user.subscription_status === 'premium') {
    return { allowed: true, remaining: Infinity };
  }
  
  const today = new Date().toISOString().split('T')[0];
  let counts = user.usage_counts || {};
  
  // Reset counts if new day
  if (user.usage_date !== today) {
    counts = { trending: 0, price: 0, search: 0 };
    await supabase
      .from('users')
      .update({ usage_counts: counts, usage_date: today })
      .eq('telegram_id', telegramId.toString());
  }
  
  const currentCount = counts[action] || 0;
  const remaining = limit - currentCount;
  
  if (remaining <= 0) {
    return { allowed: false, remaining: 0 };
  }
  
  // Increment
  counts[action] = currentCount + 1;
  await supabase
    .from('users')
    .update({ usage_counts: counts })
    .eq('telegram_id', telegramId.toString());
  
  return { allowed: true, remaining: remaining - 1 };
}

/**
 * Check if user is premium
 */
export async function isPremium(telegramId) {
  const user = await getUser(telegramId);
  return user?.subscription_status === 'premium';
}

// ============ ALERT OPERATIONS ============

/**
 * Create an alert
 */
export async function createAlert({ userId, chatId, marketId, marketSlug, marketName, threshold, direction, condition }) {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: userId.toString(),
      chat_id: chatId.toString(),
      market_id: marketId,
      market_slug: marketSlug,
      market_name: marketName,
      threshold,
      direction,
      condition: condition || 'cross',
      active: true,
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
    .from('alerts')
    .select('*')
    .eq('user_id', userId.toString())
    .eq('active', true)
    .order('created_at', { ascending: false });
  
  return data || [];
}

/**
 * Get all active alerts
 */
export async function getAllActiveAlerts() {
  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('active', true);
  
  return data || [];
}

/**
 * Deactivate an alert
 */
export async function deactivateAlert(alertId) {
  await supabase
    .from('alerts')
    .update({ active: false, triggered_at: new Date().toISOString() })
    .eq('id', alertId);
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId, userId) {
  const { data } = await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId.toString())
    .select();
  
  return data?.length > 0;
}

/**
 * Count user's active alerts
 */
export async function countUserAlerts(userId) {
  const { count } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId.toString())
    .eq('active', true);
  
  return count || 0;
}

// ============ WATCHLIST OPERATIONS ============

/**
 * Add to watchlist
 */
export async function addToWatchlist(userId, marketId, marketSlug, marketName) {
  const { data, error } = await supabase
    .from('watchlist')
    .upsert({
      user_id: userId.toString(),
      market_id: marketId,
      market_slug: marketSlug,
      market_name: marketName,
    }, { onConflict: 'user_id,market_id' })
    .select()
    .single();
  
  if (error && !error.message.includes('duplicate')) throw error;
  return data;
}

/**
 * Get user's watchlist
 */
export async function getWatchlist(userId) {
  const { data } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId.toString())
    .order('created_at', { ascending: false });
  
  return data || [];
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(userId, marketId) {
  const { data } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId.toString())
    .eq('market_id', marketId)
    .select();
  
  return data?.length > 0;
}

// ============ PORTFOLIO OPERATIONS ============

/**
 * Add a position
 */
export async function addPosition({ userId, marketId, marketSlug, marketName, side, entryPrice, shares }) {
  const { data, error } = await supabase
    .from('positions')
    .insert({
      user_id: userId.toString(),
      market_id: marketId,
      market_slug: marketSlug,
      market_name: marketName,
      side,
      entry_price: entryPrice,
      shares: shares || 1,
      open: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get user's open positions
 */
export async function getPositions(userId) {
  const { data } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId.toString())
    .eq('open', true)
    .order('created_at', { ascending: false });
  
  return data || [];
}

/**
 * Close a position
 */
export async function closePosition(positionId, userId, exitPrice) {
  const { data } = await supabase
    .from('positions')
    .update({ 
      open: false, 
      exit_price: exitPrice,
      closed_at: new Date().toISOString()
    })
    .eq('id', positionId)
    .eq('user_id', userId.toString())
    .select();
  
  return data?.[0];
}

// ============ DIGEST PREFERENCES ============

/**
 * Set digest preferences
 */
export async function setDigestPreferences(userId, hour, enabled = true) {
  await supabase
    .from('users')
    .update({ 
      digest_enabled: enabled, 
      digest_hour: hour 
    })
    .eq('telegram_id', userId.toString());
}

/**
 * Get users due for digest at a specific hour
 */
export async function getUsersForDigest(hour) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('subscription_status', 'premium')
    .eq('digest_enabled', true)
    .eq('digest_hour', hour);
  
  return data || [];
}
