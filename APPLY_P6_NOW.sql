-- PolyPulse P6: Predictions & Leaderboard
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new

-- 1. Create predictions table
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

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_pp_predictions_user_id ON pp_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_market_id ON pp_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_resolved ON pp_predictions(resolved);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_leaderboard ON pp_predictions(user_id, resolved, correct, created_at);

-- 3. Add prediction columns to pp_users
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS prediction_streak INTEGER DEFAULT 0;
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS total_predictions INTEGER DEFAULT 0;
ALTER TABLE pp_users ADD COLUMN IF NOT EXISTS correct_predictions INTEGER DEFAULT 0;

-- 4. Enable RLS
ALTER TABLE pp_predictions ENABLE ROW LEVEL SECURITY;

-- Done! All P6 schema applied.
