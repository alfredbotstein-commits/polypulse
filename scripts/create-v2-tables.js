import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function apply() {
  // Direct PostgreSQL connection to Supabase
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://postgres.euyrskubpiexkdqrtcxh:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  // Try with connection string from URL
  const supabaseUrl = process.env.SUPABASE_URL;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
  
  // Build direct connection URL
  const dbUrl = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || 'missing_password'}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  console.log('Project:', projectRef);
  console.log('Attempting database connection...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!\n');

    const sql = `
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
    `;

    await client.query(sql);
    console.log('✅ V2 tables created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('password')) {
      console.log('\nSet DATABASE_URL or SUPABASE_DB_PASSWORD in .env');
    }
  } finally {
    await client.end();
  }
}

apply();
