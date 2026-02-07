-- ============================================
-- POLYPULSE V2 P4: SMART ALERTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Smart alert preferences table
CREATE TABLE IF NOT EXISTS pp_smart_alert_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('volume_spike', 'momentum', 'divergence', 'new_market')),
    enabled BOOLEAN DEFAULT true,
    params JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, alert_type)
);

-- Track sent smart alerts to prevent duplicates
CREATE TABLE IF NOT EXISTS pp_smart_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    market_id TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Market volume snapshots for detecting spikes
CREATE TABLE IF NOT EXISTS pp_market_volume_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    volume_usd NUMERIC NOT NULL,
    price NUMERIC,
    snapshot_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_prefs_user 
ON pp_smart_alert_prefs(user_id);

CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_prefs_enabled 
ON pp_smart_alert_prefs(enabled, alert_type) 
WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_history_user_market 
ON pp_smart_alert_history(user_id, market_id, alert_type);

CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_history_sent 
ON pp_smart_alert_history(sent_at);

CREATE INDEX IF NOT EXISTS idx_pp_market_volume_snapshots_market 
ON pp_market_volume_snapshots(market_id, snapshot_at);

-- Clean up old snapshots (keep 48 hours)
CREATE INDEX IF NOT EXISTS idx_pp_market_volume_snapshots_cleanup 
ON pp_market_volume_snapshots(snapshot_at);

-- Enable RLS
ALTER TABLE pp_smart_alert_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_smart_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_volume_snapshots ENABLE ROW LEVEL SECURITY;
