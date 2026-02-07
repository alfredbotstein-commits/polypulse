-- PolyPulse v2 Priority 6: Prediction Leaderboard Schema
-- Run this in Supabase SQL Editor

-- Predictions table
CREATE TABLE IF NOT EXISTS pp_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    prediction TEXT NOT NULL,  -- 'YES' or 'NO'
    odds_at_prediction NUMERIC,
    resolved BOOLEAN DEFAULT false,
    correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pp_predictions_user_id ON pp_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_market_id ON pp_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_resolved ON pp_predictions(resolved);
CREATE INDEX IF NOT EXISTS idx_pp_predictions_created_at ON pp_predictions(created_at);

-- Composite index for leaderboard queries (user accuracy this month)
CREATE INDEX IF NOT EXISTS idx_pp_predictions_leaderboard 
    ON pp_predictions(user_id, resolved, correct, created_at);

-- Add prediction streak tracking to users table (optional enhancement)
ALTER TABLE pp_users 
    ADD COLUMN IF NOT EXISTS prediction_streak INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_predictions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS correct_predictions INTEGER DEFAULT 0;

-- RLS policies
ALTER TABLE pp_predictions ENABLE ROW LEVEL SECURITY;

-- Users can read their own predictions
CREATE POLICY "Users can read own predictions" ON pp_predictions
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- Users can insert their own predictions
CREATE POLICY "Users can insert own predictions" ON pp_predictions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'service_role');

-- Only service role can update (for resolution)
CREATE POLICY "Service role can update predictions" ON pp_predictions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON pp_predictions TO service_role;
GRANT SELECT, INSERT ON pp_predictions TO authenticated;
