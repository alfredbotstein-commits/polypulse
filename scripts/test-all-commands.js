#!/usr/bin/env node
// Test all PolyPulse v2 command handlers
// This tests the actual command logic with mocked Telegram context

import 'dotenv/config';
import * as db from '../src/db.js';
import * as polymarket from '../src/polymarket.js';
import * as format from '../src/format.js';

const TEST_USER_ID = 999999999;
const TEST_CHAT_ID = 999999999;

// Cleanup test user first
async function cleanup() {
  console.log('🧹 Cleaning up test data...\n');
  // Delete test user's data from all tables
  const tables = [
    'pp_users', 'pp_alerts', 'pp_watchlist', 'pp_positions', 
    'pp_smart_alerts', 'pp_category_subs', 'pp_predictions'
  ];
  for (const table of tables) {
    try {
      const { error } = await db.supabase
        .from(table)
        .delete()
        .eq(table === 'pp_users' ? 'telegram_id' : 'user_id', TEST_USER_ID);
      if (error && !error.message.includes('does not exist')) {
        console.log(`  Warning: ${table}: ${error.message}`);
      }
    } catch (e) {
      // Ignore
    }
  }
}

// Mock context factory
function createMockCtx(command, args = '', isPremium = false) {
  const mockUser = { id: TEST_USER_ID, is_premium: isPremium, usage_reset_at: new Date() };
  
  return {
    from: { id: TEST_USER_ID, username: 'test_user' },
    chat: { id: TEST_CHAT_ID },
    user: mockUser,
    isPremium,
    match: args,
    message: { text: `/${command} ${args}`.trim() },
    reply: async (msg, opts) => {
      return { text: msg, opts };
    },
    replyWithChatAction: async () => {},
  };
}

// Test runner
async function test(name, fn) {
  try {
    const result = await fn();
    const status = result?.error ? '⚠️' : '✅';
    const detail = result?.text ? result.text.substring(0, 80).replace(/\n/g, ' ') : '';
    console.log(`${status} ${name}${detail ? ': ' + detail + '...' : ''}`);
    return { name, ok: !result?.error, result };
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    return { name, ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('\n🧪 PolyPulse V2 Full Command Test\n');
  console.log('='.repeat(70) + '\n');
  
  await cleanup();
  
  // Create test user first and get their UUID
  console.log('👤 Creating test user...\n');
  const testUser = await db.getOrCreateUser(TEST_USER_ID, 'test_user');
  const TEST_USER_UUID = testUser.id;  // UUID for tables that need it
  console.log(`   telegram_id: ${TEST_USER_ID}, uuid: ${TEST_USER_UUID}\n`);
  
  const results = [];
  
  // === BASIC COMMANDS ===
  console.log('📋 Basic Commands\n');
  
  results.push(await test('formatWelcome', () => {
    const msg = format.formatWelcome();
    return { text: msg };
  }));
  
  // === MARKET DATA ===
  console.log('\n📊 Market Data (requires Polymarket API)\n');
  
  results.push(await test('getTrendingMarkets', async () => {
    const markets = await polymarket.getTrendingMarkets(3);
    return { text: `Found ${markets.length} trending markets` };
  }));
  
  results.push(await test('searchMarkets', async () => {
    const markets = await polymarket.searchMarketsFulltext('bitcoin', 3);
    return { text: `Found ${markets.length} results for "bitcoin"` };
  }));
  
  results.push(await test('formatTrending', async () => {
    const markets = await polymarket.getTrendingMarkets(3);
    const msg = format.formatTrending(markets);
    return { text: msg };
  }));
  
  // === ALERTS ===
  console.log('\n🔔 Alerts\n');
  
  results.push(await test('createAlert', async () => {
    const markets = await polymarket.searchMarketsFulltext('bitcoin', 1);
    if (!markets.length) return { error: 'No markets found' };
    
    await db.createAlert(
      TEST_USER_UUID,  // UUID for pp_alerts
      TEST_CHAT_ID, 
      markets[0].id || markets[0].slug,
      markets[0].question,
      0.6,
      'above'
    );
    return { text: 'Alert created' };
  }));
  
  results.push(await test('getUserAlerts', async () => {
    const alerts = await db.getUserAlerts(TEST_USER_UUID);  // UUID
    return { text: `User has ${alerts.length} alerts` };
  }));
  
  results.push(await test('countUserAlerts', async () => {
    const count = await db.countUserAlerts(TEST_USER_UUID);  // UUID
    return { text: `Alert count: ${count}` };
  }));
  
  // === WATCHLIST ===
  console.log('\n📋 Watchlist\n');
  
  results.push(await test('addToWatchlist', async () => {
    const markets = await polymarket.searchMarketsFulltext('trump', 1);
    if (!markets.length) return { error: 'No markets found' };
    
    await db.addToWatchlist(
      TEST_USER_UUID,  // UUID for pp_watchlist
      markets[0].id || markets[0].slug,
      markets[0].question,
      0.5
    );
    return { text: 'Added to watchlist' };
  }));
  
  results.push(await test('getWatchlist', async () => {
    const list = await db.getWatchlist(TEST_USER_UUID);  // UUID
    return { text: `Watchlist has ${list.length} items` };
  }));
  
  results.push(await test('countWatchlist', async () => {
    const count = await db.countWatchlist(TEST_USER_UUID);  // UUID
    return { text: `Watchlist count: ${count}` };
  }));
  
  // === PORTFOLIO (P3) ===
  console.log('\n💼 Portfolio (P3)\n');
  
  results.push(await test('createPosition', async () => {
    const markets = await polymarket.searchMarketsFulltext('bitcoin', 1);
    if (!markets.length) return { error: 'No markets found' };
    
    await db.createPosition(
      TEST_USER_ID,
      markets[0].id || markets[0].slug,
      markets[0].question,
      'YES',
      100,
      0.54
    );
    return { text: 'Position created' };
  }));
  
  results.push(await test('getPositions', async () => {
    const positions = await db.getPositions(TEST_USER_ID);
    return { text: `User has ${positions.length} positions` };
  }));
  
  results.push(await test('countOpenPositions', async () => {
    const count = await db.countOpenPositions(TEST_USER_ID);
    return { text: `Open positions: ${count}` };
  }));
  
  results.push(await test('formatPortfolio', async () => {
    const positions = await db.getPositions(TEST_USER_ID);
    const enriched = positions.map(p => ({
      ...p,
      pnl: db.calculatePositionPnL(p, 0.60)
    }));
    const msg = format.formatPortfolio(enriched, { invested: 54, currentValue: 60, pnl: 6, pnlPercent: 11.1 });
    return { text: msg };
  }));
  
  // === SMART ALERTS (P4) ===
  console.log('\n🧠 Smart Alerts (P4)\n');
  
  results.push(await test('setSmartAlertEnabled', async () => {
    await db.setSmartAlertEnabled(TEST_USER_ID, 'volume_spike', true);
    return { text: 'Volume spike alerts enabled' };
  }));
  
  results.push(await test('getSmartAlertPrefs', async () => {
    const prefs = await db.getSmartAlertPrefs(TEST_USER_ID);
    return { text: `Has ${prefs.length} smart alert prefs` };
  }));
  
  results.push(await test('setSmartAlertParams', async () => {
    await db.setSmartAlertParams(TEST_USER_ID, 'new_market', { categories: ['crypto', 'politics'] });
    return { text: 'New market categories set' };
  }));
  
  results.push(await test('formatSmartAlertSettings', async () => {
    const prefs = await db.getSmartAlertPrefs(TEST_USER_ID);
    const msg = format.formatSmartAlertSettings(prefs, true);
    return { text: msg };
  }));
  
  // === CATEGORY SUBSCRIPTIONS (P5) ===
  console.log('\n📁 Category Subscriptions (P5)\n');
  
  results.push(await test('VALID_CATEGORIES', () => {
    return { text: `Categories: ${db.VALID_CATEGORIES.join(', ')}` };
  }));
  
  results.push(await test('addCategorySub', async () => {
    await db.addCategorySub(TEST_USER_ID, 'crypto');
    return { text: 'Subscribed to crypto' };
  }));
  
  results.push(await test('getCategorySubs', async () => {
    const subs = await db.getCategorySubs(TEST_USER_ID);
    return { text: `Has ${subs.length} category subs` };
  }));
  
  results.push(await test('countCategorySubs', async () => {
    const count = await db.countCategorySubs(TEST_USER_ID);
    return { text: `Category sub count: ${count}` };
  }));
  
  results.push(await test('formatMySubs', async () => {
    const subs = await db.getCategorySubs(TEST_USER_ID);
    const msg = format.formatMySubs(subs, true);
    return { text: msg };
  }));
  
  // === PREDICTIONS (P6) ===
  console.log('\n🎯 Predictions (P6)\n');
  
  results.push(await test('createPrediction', async () => {
    const markets = await polymarket.searchMarketsFulltext('bitcoin', 1);
    if (!markets.length) return { error: 'No markets found' };
    
    await db.createPrediction(
      TEST_USER_ID,
      markets[0].id || markets[0].slug,
      markets[0].question,
      'YES',
      0.55
    );
    return { text: 'Prediction created' };
  }));
  
  results.push(await test('hasUserPredicted', async () => {
    const markets = await polymarket.searchMarketsFulltext('bitcoin', 1);
    if (!markets.length) return { error: 'No markets found' };
    
    const has = await db.hasUserPredicted(TEST_USER_ID, markets[0].id || markets[0].slug);
    return { text: `Has predicted: ${has}` };
  }));
  
  results.push(await test('getUserPredictions', async () => {
    const predictions = await db.getUserPredictions(TEST_USER_ID);
    return { text: `Has ${predictions.length} predictions` };
  }));
  
  results.push(await test('getUserPredictionStats', async () => {
    const stats = await db.getUserPredictionStats(TEST_USER_ID);
    return { text: `Total: ${stats.allTime.total}, Correct: ${stats.allTime.correct}` };
  }));
  
  results.push(await test('getLeaderboard', async () => {
    const leaders = await db.getLeaderboard(10);
    return { text: `Leaderboard has ${leaders.length} entries` };
  }));
  
  results.push(await test('formatPredictions', async () => {
    const predictions = await db.getUserPredictions(TEST_USER_ID);
    const stats = await db.getUserPredictionStats(TEST_USER_ID);
    const msg = format.formatPredictions(predictions, stats);
    return { text: msg };
  }));
  
  // === BRIEFING ===
  console.log('\n📬 Briefing\n');
  
  results.push(await test('upsertBriefingPrefs', async () => {
    await db.upsertBriefingPrefs(TEST_USER_ID, { enabled: true, send_hour: 8, timezone: 'America/Chicago' });
    return { text: 'Briefing prefs set' };
  }));
  
  results.push(await test('getBriefingPrefs', async () => {
    const prefs = await db.getBriefingPrefs(TEST_USER_ID);
    return { text: `Briefing enabled: ${prefs?.enabled}, hour: ${prefs?.send_hour}` };
  }));
  
  // === WHALE ALERTS ===
  console.log('\n🐋 Whale Alerts\n');
  
  results.push(await test('setWhaleEnabled', async () => {
    await db.setWhaleEnabled(TEST_USER_ID, true, 100000);
    return { text: 'Whale alerts enabled at $100K' };
  }));
  
  results.push(await test('getWhalePrefs', async () => {
    const prefs = await db.getWhalePrefs(TEST_USER_ID);
    return { text: `Whale enabled: ${prefs?.enabled}, min: $${prefs?.min_amount}` };
  }));
  
  // === SUMMARY ===
  console.log('\n' + '='.repeat(70));
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${results.length} tests\n`);
  
  if (failed > 0) {
    console.log('❌ Failed:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || 'unknown'}`);
    });
    console.log('');
  }
  
  // Cleanup
  await cleanup();
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
