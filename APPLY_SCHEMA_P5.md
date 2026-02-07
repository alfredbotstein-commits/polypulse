# PolyPulse P5: Category Subscriptions — Schema Setup

## What Was Built

Priority 5: Category Subscriptions — allows users to subscribe to entire categories (crypto, politics, sports, etc.) instead of individual markets.

### New Commands
- `/categories` — List available categories with descriptions
- `/subscribe crypto` — Subscribe to a category
- `/subscribe politics,sports` — Subscribe to multiple categories
- `/unsubscribe crypto` — Unsubscribe from a category
- `/mysubs` — View active category subscriptions

### Categories Available
- 🪙 **Crypto** — Bitcoin, Ethereum, DeFi, regulations
- 🏛️ **Politics** — US elections, policy, international
- ⚽ **Sports** — UFC, NFL, NBA, soccer, Olympics
- 💻 **Tech** — Product launches, IPOs, AI milestones
- 🌍 **World Events** — Geopolitics, climate, science
- 💰 **Economics** — Fed, inflation, GDP, employment
- 🎬 **Entertainment** — Awards, box office, celebrity

### Subscriber Benefits
- Daily category digest in morning briefing
- Alerts when any market in category moves 10%+
- New market notifications in category

### Limits
- **Free users:** 1 category subscription
- **Premium users:** Unlimited categories

---

## Apply Schema

Run this in your Supabase SQL Editor:

```sql
-- ============================================
-- POLYPULSE V2 P5: CATEGORY SUBSCRIPTIONS
-- ============================================

-- Category subscriptions (users subscribe to entire categories)
CREATE TABLE IF NOT EXISTS pp_category_subs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Market categories (tag markets with categories for filtering)
CREATE TABLE IF NOT EXISTS pp_market_categories (
    market_id TEXT NOT NULL,
    category TEXT NOT NULL,
    market_title TEXT,
    categorized_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (market_id, category)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_user ON pp_category_subs(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_category ON pp_category_subs(category);
CREATE INDEX IF NOT EXISTS idx_pp_market_categories_category ON pp_market_categories(category);
CREATE INDEX IF NOT EXISTS idx_pp_market_categories_market ON pp_market_categories(market_id);

-- Enable RLS
ALTER TABLE pp_category_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_categories ENABLE ROW LEVEL SECURITY;
```

---

## Verify Installation

After applying the schema, run these queries to confirm:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('pp_category_subs', 'pp_market_categories');

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pp_category_subs';
```

---

## Test Commands

1. `/categories` — Should show list of 7 categories
2. `/subscribe crypto` — Should subscribe (or show limit for free)
3. `/mysubs` — Should show your subscriptions
4. `/unsubscribe crypto` — Should unsubscribe

---

## Files Modified

- `src/db.js` — Added category subscription functions
- `src/format.js` — Added category formatting functions
- `src/index.js` — Added category commands
- `schema-p5-categories.sql` — Database schema
