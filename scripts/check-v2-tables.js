#!/usr/bin/env node
// Check which v2 tables exist in Supabase

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const V2_TABLES = [
  'pp_users',           // base
  'pp_alerts',          // base
  'pp_watchlist',       // base
  'pp_briefing_prefs',  // P1
  'pp_whale_events',    // P2
  'pp_whale_prefs',     // P2
  'pp_positions',       // P3
  'pp_trades',          // P3
  'pp_smart_alert_prefs',      // P4
  'pp_smart_alert_history',    // P4
  'pp_market_volume_snapshots',// P4
  'pp_category_subs',   // P5
  'pp_market_categories',// P5
  'pp_predictions',     // P6
];

async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { exists: false, error: error.message };
      }
      return { exists: false, error: error.message };
    }
    return { exists: true };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function main() {
  console.log('🔍 Checking PolyPulse v2 tables in Supabase...\n');
  
  const results = [];
  const missing = [];
  
  for (const table of V2_TABLES) {
    const result = await checkTable(table);
    results.push({ table, ...result });
    
    if (result.exists) {
      console.log(`✅ ${table}`);
    } else {
      console.log(`❌ ${table} - ${result.error || 'missing'}`);
      missing.push(table);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (missing.length === 0) {
    console.log('\n🎉 All v2 tables exist! Ready for testing.');
  } else {
    console.log(`\n⚠️  ${missing.length} tables missing.`);
    console.log('\nRun the consolidated schema in Supabase SQL Editor:');
    console.log('  File: /Users/albert/clawd/polypulse/schema-v2-consolidated.sql');
    console.log('  URL: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new');
  }
}

main().catch(console.error);
