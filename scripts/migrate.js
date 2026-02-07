// Run database migrations
// Usage: node scripts/migrate.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('🔗 Testing Supabase connection...');
  console.log(`   URL: ${process.env.SUPABASE_URL}`);
  
  // Try to query the pp_users table
  const { data, error } = await supabase
    .from('pp_users')
    .select('id')
    .limit(1);
  
  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.log('⚠️  Tables not found. Please run schema.sql in Supabase SQL Editor:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Open your project → SQL Editor');
      console.log('   3. Paste contents of schema.sql and run');
      console.log('\n📄 Schema file: ~/clawd/polypulse/schema.sql');
      return false;
    }
    console.error('❌ Connection error:', error.message);
    return false;
  }
  
  console.log('✅ Connected! Tables exist.');
  console.log(`   Found ${data.length} users`);
  return true;
}

async function main() {
  const ok = await testConnection();
  process.exit(ok ? 0 : 1);
}

main().catch(console.error);
