// Test V2 Commands
// Quick test to verify all command handlers and DB functions work

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as db from '../src/db.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TEST_USER_ID = 123456789;

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`✓ ${name}`, result !== undefined ? '→' + JSON.stringify(result).substring(0, 60) : '');
    return { name, ok: true };
  } catch (err) {
    console.log(`✗ ${name} - ${err.message}`);
    return { name, ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('\n🧪 Testing PolyPulse V2 Database Functions\n');
  console.log('=' .repeat(60) + '\n');
  
  const results = [];
  
  // P3: Portfolio
  console.log('📊 P3: Portfolio\n');
  results.push(await test('getPositions', () => db.getPositions(TEST_USER_ID)));
  results.push(await test('countOpenPositions', () => db.countOpenPositions(TEST_USER_ID)));
  
  // P4: Smart Alerts
  console.log('\n🔔 P4: Smart Alerts\n');
  results.push(await test('getSmartAlertPrefs', () => db.getSmartAlertPrefs(TEST_USER_ID)));
  results.push(await test('SMART_ALERT_TYPES', () => Promise.resolve(db.SMART_ALERT_TYPES)));
  
  // P5: Categories
  console.log('\n📁 P5: Categories\n');
  results.push(await test('getCategorySubs', () => db.getCategorySubs(TEST_USER_ID)));
  results.push(await test('countCategorySubs', () => db.countCategorySubs(TEST_USER_ID)));
  results.push(await test('CATEGORIES', () => Promise.resolve(db.CATEGORIES)));
  
  // P6: Predictions
  console.log('\n🎯 P6: Predictions\n');
  results.push(await test('getUserPredictions', () => db.getUserPredictions(TEST_USER_ID)));
  results.push(await test('getLeaderboard', () => db.getLeaderboard(10)));
  results.push(await test('getUserPredictionStats', () => db.getUserPredictionStats(TEST_USER_ID)));
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n📋 Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    console.log('❌ Failed tests:');
    results.filter(r => !r.ok).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
