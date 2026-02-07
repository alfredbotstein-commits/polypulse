-- PolyPulse Database Schema
-- Run this in your Supabase SQL editor
-- Prefix: pp_ to keep separate from other apps in same project

-- Users table (core subscription management)
CREATE TABLE IF NOT EXISTS pp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  premium_until TIMESTAMPTZ,
  daily_usage JSONB DEFAULT '{"trending": 0, "price": 0, "search": 0}'::jsonb,
  usage_reset_at TIMESTAMPTZ DEFAULT NOW(),
  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_hour INTEGER DEFAULT 13, -- UTC hour for daily digest
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table (market price alerts)
CREATE TABLE IF NOT EXISTS pp_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pp_users(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  market_id TEXT NOT NULL,
  market_name TEXT NOT NULL,
  threshold DECIMAL(5,4) NOT NULL, -- 0.0000 to 0.9999
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist table (premium feature)
CREATE TABLE IF NOT EXISTS pp_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pp_users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL,
  market_name TEXT NOT NULL,
  added_price DECIMAL(5,4), -- price when added
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, market_id)
);

-- Portfolio positions (premium feature)
CREATE TABLE IF NOT EXISTS pp_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pp_users(id) ON DELETE CASCADE,
  market_id TEXT NOT NULL,
  market_name TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  entry_price DECIMAL(5,4) NOT NULL,
  shares DECIMAL(12,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pp_users_telegram_id ON pp_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_pp_users_stripe_customer ON pp_users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_pp_alerts_user_id ON pp_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_alerts_not_triggered ON pp_alerts(triggered) WHERE triggered = FALSE;
CREATE INDEX IF NOT EXISTS idx_pp_watchlist_user_id ON pp_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_positions_user_id ON pp_positions(user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION pp_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS pp_users_updated_at ON pp_users;
CREATE TRIGGER pp_users_updated_at
  BEFORE UPDATE ON pp_users
  FOR EACH ROW
  EXECUTE FUNCTION pp_update_updated_at();

-- Row Level Security (optional but recommended)
ALTER TABLE pp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_positions ENABLE ROW LEVEL SECURITY;
