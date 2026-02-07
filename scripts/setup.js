#!/usr/bin/env node
// PolyPulse Setup Script
// Tests Supabase connection and verifies tables exist

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const TABLES = ['pp_users', 'pp_alerts', 'pp_watchlist', 'pp_positions'];

async function checkTables() {
  console.log('🔗 PolyPulse Setup Check\n');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('');
  
  let allOk = true;
  
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    
    if (error) {
      console.log(`❌ ${table}: NOT FOUND`);
      allOk = false;
    } else {
      console.log(`✅ ${table}: exists (${data.length} rows)`);
    }
  }
  
  console.log('');
  
  if (!allOk) {
    console.log('⚠️  Some tables are missing!');
    console.log('');
    console.log('To fix, run schema.sql in Supabase SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new');
    console.log('2. Paste the contents of ~/clawd/polypulse/schema.sql');
    console.log('3. Click "Run"');
    console.log('');
    console.log('Then run this script again to verify.');
    process.exit(1);
  }
  
  console.log('✅ All tables ready! Run: npm start');
  process.exit(0);
}

checkTables().catch(err => {
  console.error('Setup error:', err.message);
  process.exit(1);
});
