# PolyPulse P4: Smart Alerts — Setup Instructions

## 1. Apply the Database Schema

Run the following SQL in your **Supabase SQL Editor**:

```sql
-- ============================================
-- POLYPULSE V2 P4: SMART ALERTS
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

CREATE INDEX IF NOT EXISTS idx_pp_market_volume_snapshots_cleanup 
ON pp_market_volume_snapshots(snapshot_at);

-- Enable RLS
ALTER TABLE pp_smart_alert_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_smart_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_volume_snapshots ENABLE ROW LEVEL SECURITY;
```

## 2. New Bot Commands

The following commands are now available:

| Command | Description |
|---------|-------------|
| `/smartalerts` | View smart alert settings |
| `/smartalert volume on` | Enable volume spike alerts |
| `/smartalert volume off` | Disable volume spike alerts |
| `/smartalert momentum on` | Enable momentum alerts |
| `/smartalert momentum off` | Disable momentum alerts |
| `/smartalert divergence on` | Enable divergence alerts |
| `/smartalert divergence off` | Disable divergence alerts |
| `/smartalert categories crypto,politics` | Set new market alert categories |

## 3. Start the Smart Alert Monitor

Run the monitor as a background process:

```bash
npm run smartalerts
```

The monitor:
- Polls every 5 minutes
- Tracks 50 trending markets
- Detects volume spikes (3x+ normal)
- Detects momentum moves (10%+ in 4 hours)
- Notifies when new markets appear in subscribed categories
- Automatically cleans up old data

## 4. Alert Types

### Volume Spike Alert 📊
Triggered when a market sees 3x+ its normal hourly volume.

### Momentum Alert 🚀
Triggered when a market moves 10%+ in 4 hours.

### Divergence Alert ⚠️
(Coming soon) Triggered when correlated markets decouple.

### New Market Alert 🆕
Triggered when a new market appears in the user's subscribed categories.

**Available categories:**
- crypto
- politics
- sports
- tech
- economics
- entertainment
- world

## 5. Premium Only

All smart alert features are premium-only. Free users will see an upsell message.

## 6. Files Changed

- `src/db.js` — Added smart alert database functions
- `src/format.js` — Added smart alert formatting
- `src/index.js` — Added /smartalert and /smartalerts commands
- `src/smart-alert-monitor.js` — New background monitor
- `package.json` — Added `npm run smartalerts` script
- `schema-p4-smart-alerts.sql` — Database migration
