// Setup script for pp_briefing_prefs table
// Checks if table exists and outputs SQL if needed

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CREATE_TABLE_SQL = `
-- =====================================================
-- POLYPULSE V2: MORNING BRIEFING TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY REFERENCES pp_users(telegram_id),
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8 CHECK (send_hour >= 0 AND send_hour <= 23),
    categories TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient briefing queries
CREATE INDEX IF NOT EXISTS idx_pp_briefing_enabled_hour 
ON pp_briefing_prefs(enabled, send_hour) 
WHERE enabled = true;

-- Enable RLS
ALTER TABLE pp_briefing_prefs ENABLE ROW LEVEL SECURITY;
`;

async function checkTable() {
  console.log('🔍 Checking if pp_briefing_prefs table exists...\n');

  try {
    // Try to select from the table
    const { data, error } = await supabase
      .from('pp_briefing_prefs')
      .select('user_id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116' || 
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('Could not find')) {
        console.log('❌ Table pp_briefing_prefs does NOT exist.\n');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new\n');
        console.log('------- COPY BELOW THIS LINE -------');
        console.log(CREATE_TABLE_SQL);
        console.log('------- COPY ABOVE THIS LINE -------\n');
        return false;
      }
      
      // Some other error
      console.log('⚠️  Error checking table:', error.message);
      if (error.code) console.log('Code:', error.code);
      if (error.hint) console.log('Hint:', error.hint);
      return false;
    }

    console.log('✅ Table pp_briefing_prefs exists!');
    console.log(`   Found ${data?.length || 0} rows (limit 1)`);
    return true;

  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

// Run check
checkTable().then(exists => {
  process.exit(exists ? 0 : 1);
});
