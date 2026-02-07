// Apply briefing preferences table migration
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sql = `
CREATE TABLE IF NOT EXISTS pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY REFERENCES pp_users(telegram_id),
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8,
    categories TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_briefing_enabled_hour 
ON pp_briefing_prefs(enabled, send_hour) 
WHERE enabled = true;
`;

async function applyMigration() {
  console.log('Applying briefing preferences migration...');
  console.log('SQL to execute:');
  console.log(sql);
  console.log('\n---');
  console.log('Note: Supabase REST API does not support raw SQL execution.');
  console.log('Please run this SQL in your Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql');
  
  // Test if table already exists
  const { error } = await supabase
    .from('pp_briefing_prefs')
    .select('user_id')
    .limit(1);
  
  if (error && error.code === 'PGRST204') {
    console.log('\n✅ Table pp_briefing_prefs already exists (empty)');
  } else if (error) {
    console.log('\n❌ Table does not exist yet. Please create it via SQL Editor.');
  } else {
    console.log('\n✅ Table pp_briefing_prefs exists and has data');
  }
}

applyMigration();
