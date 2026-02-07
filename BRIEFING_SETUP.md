# Morning Briefing Setup Instructions

## 1. Create the Database Table

Run this SQL in Supabase SQL Editor:
**https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new**

```sql
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
```

## 2. Verify Table Creation

```bash
npm run verify
# or
node scripts/setup-briefing-table.js
```

## 3. Test Briefing Commands

The bot now supports:
- `/briefing` - View briefing settings
- `/briefing on` - Enable daily briefing
- `/briefing off` - Disable briefing  
- `/briefing time 7am` - Set delivery time
- `/timezone EST` - Set timezone

## 4. Set Up Cron Job

The briefing cron should run every hour:

```bash
# Add to crontab:
0 * * * * cd /path/to/polypulse && node src/briefing-cron.js >> /var/log/polypulse-briefing.log 2>&1
```

Or use a cloud scheduler (Railway, Render, Vercel cron, etc.)

## 5. Test Briefing Message

Send a test briefing to yourself:
```bash
npm run briefing:test <your-telegram-id>
```

Get your Telegram ID by messaging @userinfobot

---

## New Commands Added

| Command | Description |
|---------|-------------|
| `/briefing` | View/manage morning briefing |
| `/briefing on` | Enable daily briefing |
| `/briefing off` | Disable briefing |
| `/briefing time 7am` | Set delivery time |
| `/timezone EST` | Set your timezone |

Supported timezones: UTC, GMT, EST, EDT, CST, CDT, MST, MDT, PST, PDT, PT, ET, CT, MT, CET, CEST, BST, IST, JST, KST, HKT, SGT, AEST, AEDT, AWST
