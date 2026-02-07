// Apply V2 schema tables to Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function apply() {
  console.log('Checking V2 tables...\n');
  
  // Verify tables exist by querying them
  const { error: e1 } = await supabase.from('pp_briefing_prefs').select('user_id').limit(1);
  console.log('pp_briefing_prefs:', e1 ? `❌ ${e1.message}` : '✓ exists');
  
  const { error: e2 } = await supabase.from('pp_whale_events').select('id').limit(1);
  console.log('pp_whale_events:', e2 ? `❌ ${e2.message}` : '✓ exists');
  
  const { error: e3 } = await supabase.from('pp_whale_prefs').select('user_id').limit(1);
  console.log('pp_whale_prefs:', e3 ? `❌ ${e3.message}` : '✓ exists');
  
  if (e1 || e2 || e3) {
    console.log('\n⚠️  Some tables are missing!');
    console.log('Run the following SQL in Supabase SQL Editor:\n');
    console.log(`
-- V2 Tables for PolyPulse

CREATE TABLE IF NOT EXISTS pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8,
    categories TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pp_whale_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    amount_usd NUMERIC NOT NULL,
    side TEXT NOT NULL,
    odds_before NUMERIC,
    odds_after NUMERIC,
    tx_hash TEXT,
    detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pp_whale_prefs (
    user_id BIGINT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    min_amount_usd NUMERIC DEFAULT 50000,
    alerts_sent_today INTEGER DEFAULT 0,
    last_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_briefing_prefs_enabled ON pp_briefing_prefs(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_pp_whale_events_detected ON pp_whale_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_pp_whale_prefs_enabled ON pp_whale_prefs(enabled) WHERE enabled = TRUE;
    `);
  } else {
    console.log('\n✅ All V2 tables exist!');
  }
}

apply().catch(console.error);
