-- =====================================================
-- POLYPULSE V2: MORNING BRIEFING TABLE
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql
-- =====================================================

-- Morning Briefing Preferences table
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

-- Verify creation
SELECT 'pp_briefing_prefs table created successfully' as status;
