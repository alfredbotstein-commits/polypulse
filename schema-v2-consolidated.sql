-- ============================================
-- POLYPULSE V2 CONSOLIDATED SCHEMA
-- All tables needed for v2 features
-- Generated: 2026-02-06
-- ============================================

-- ===== BASE TABLES (P1/P2) =====

-- Morning briefing preferences
CREATE TABLE IF NOT EXISTS pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8,
    categories TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Whale events log
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

-- User whale alert preferences
CREATE TABLE IF NOT EXISTS pp_whale_prefs (
    user_id BIGINT PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    min_amount_usd NUMERIC DEFAULT 50000,
    alerts_sent_today INTEGER DEFAULT 0,
    last_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== P3: PORTFOLIO TRACKER =====

-- Drop old positions table if exists with wrong structure
DROP TABLE IF EXISTS pp_trades CASCADE;
DROP TABLE IF EXISTS pp_positions CASCADE;

-- Portfolio positions (updated structure)
CREATE TABLE pp_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    side TEXT NOT NULL DEFAULT 'YES',
    shares NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Trade history
CREATE TABLE pp_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    position_id UUID REFERENCES pp_positions(id),
    action TEXT NOT NULL,
    shares NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== P4: SMART ALERTS =====

-- Smart alert preferences
CREATE TABLE IF NOT EXISTS pp_smart_alert_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('volume_spike', 'momentum', 'divergence', 'new_market')),
    enabled BOOLEAN DEFAULT true,
    params JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, alert_type)
);

-- Track sent smart alerts
CREATE TABLE IF NOT EXISTS pp_smart_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    alert_type TEXT NOT NULL,
    market_id TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Market volume snapshots
CREATE TABLE IF NOT EXISTS pp_market_volume_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    volume_usd NUMERIC NOT NULL,
    price NUMERIC,
    snapshot_at TIMESTAMPTZ DEFAULT now()
);

-- ===== P5: CATEGORY SUBSCRIPTIONS =====

CREATE TABLE IF NOT EXISTS pp_category_subs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

CREATE TABLE IF NOT EXISTS pp_market_categories (
    market_id TEXT NOT NULL,
    category TEXT NOT NULL,
    market_title TEXT,
    categorized_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (market_id, category)
);

-- ===== P6: PREDICTIONS/LEADERBOARD =====

CREATE TABLE IF NOT EXISTS pp_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    prediction TEXT NOT NULL,
    odds_at_prediction NUMERIC,
    resolved BOOLEAN DEFAULT false,
    correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Add prediction columns to pp_users if not exists
ALTER TABLE pp_users 
    ADD COLUMN IF NOT EXISTS prediction_streak INTEGER DEFAULT 0;
ALTER TABLE pp_users 
    ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE pp_users 
    ADD COLUMN IF NOT EXISTS total_predictions INTEGER DEFAULT 0;
ALTER TABLE pp_users 
    ADD COLUMN IF NOT EXISTS correct_predictions INTEGER DEFAULT 0;

-- ===== INDEXES =====

-- Briefing
CREATE INDEX IF NOT EXISTS idx_pp_briefing_prefs_enabled ON pp_briefing_prefs(enabled) WHERE enabled = TRUE;

-- Whale
CREATE INDEX IF NOT EXISTS idx_pp_whale_events_detected ON pp_whale_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_pp_whale_prefs_enabled ON pp_whale_prefs(enabled) WHERE enabled = TRUE;

-- Portfolio
CREATE INDEX IF NOT EXISTS idx_pp_positions_user ON pp_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_positions_status ON pp_positions(status);
CREATE INDEX IF NOT EXISTS idx_pp_trades_user ON pp_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_trades_position ON pp_trades(position_id);

-- Smart Alerts
CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_prefs_user ON pp_smart_alert_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_prefs_enabled ON pp_smart_alert_prefs(enabled, alert_type) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_history_user_market ON pp_smart_alert_history(user_id, market_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_pp_smart_alert_history_sent ON pp_smart_alert_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_pp_market_volume_snapshots_market ON pp_market_volume_snapshots(market_id, snapshot_at);

-- Categories
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_user ON pp_category_subs(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_category ON pp_category_subs(category);
CREATE INDEX IF NOT EXISTS idx_pp_market_categories_category ON pp_market_categories(category);

-- Predictions
CREATE INDEX IF NOT EXISTS idx_pp_predictions_user_id ON pp_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_market_id ON pp_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_resolved ON pp_predictions(resolved);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_leaderboard ON pp_predictions(user_id, resolved, correct, created_at);

-- ===== RLS =====
ALTER TABLE pp_briefing_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_whale_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_whale_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_smart_alert_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_smart_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_volume_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_category_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_predictions ENABLE ROW LEVEL SECURITY;
