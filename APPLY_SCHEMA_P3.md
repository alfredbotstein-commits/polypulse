# P3 Schema: Portfolio Tracker

Run this SQL in the Supabase Dashboard SQL Editor:

```sql
-- PolyPulse P3: Portfolio Tracker Tables

-- Portfolio positions
CREATE TABLE IF NOT EXISTS pp_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
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
CREATE TABLE IF NOT EXISTS pp_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    position_id UUID REFERENCES pp_positions(id),
    action TEXT NOT NULL,
    shares NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pp_positions_user ON pp_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_positions_status ON pp_positions(status);
CREATE INDEX IF NOT EXISTS idx_pp_trades_user ON pp_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_trades_position ON pp_trades(position_id);
```

## Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql
2. Paste the SQL above
3. Click "Run"

## Verify

After running, the tables should appear in Table Editor.
