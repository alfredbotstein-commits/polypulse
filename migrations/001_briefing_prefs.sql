-- Morning Briefing Preferences
-- Stores user timezone and delivery preferences for daily digest

CREATE TABLE IF NOT EXISTS pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY REFERENCES pp_users(telegram_id),
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8,
    categories TEXT[] DEFAULT '{}',
    last_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for hourly briefing job (find users who need briefing this hour)
CREATE INDEX IF NOT EXISTS idx_pp_briefing_enabled_hour 
ON pp_briefing_prefs(enabled, send_hour) 
WHERE enabled = true;

-- Add telegram_id to pp_users if not exists (needed for foreign key)
-- This should already exist, but ensure referential integrity
