# P5: Category Subscriptions - Setup Guide

## What This Adds

Users can subscribe to entire categories instead of individual markets:
- **Commands**: `/categories`, `/subscribe`, `/unsubscribe`, `/mysubs`
- **Categories**: crypto, politics, sports, tech, economics, entertainment, world
- **Limits**: Free users get 1 category, Premium users get unlimited

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Category subscriptions table
CREATE TABLE IF NOT EXISTS pp_category_subs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Market categories lookup (for auto-categorization)
CREATE TABLE IF NOT EXISTS pp_market_categories (
    market_id TEXT NOT NULL,
    category TEXT NOT NULL,
    market_title TEXT,
    categorized_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (market_id, category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_user ON pp_category_subs(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_category_subs_category ON pp_category_subs(category);
CREATE INDEX IF NOT EXISTS idx_pp_market_categories_category ON pp_market_categories(category);
CREATE INDEX IF NOT EXISTS idx_pp_market_categories_market ON pp_market_categories(market_id);

-- RLS
ALTER TABLE pp_category_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pp_market_categories ENABLE ROW LEVEL SECURITY;
```

Or run the migration file:
```bash
psql $DATABASE_URL -f schema-p5-categories.sql
```

## Verify Installation

```sql
-- Check tables exist
SELECT * FROM information_schema.tables WHERE table_name LIKE 'pp_category%';

-- Check columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'pp_category_subs';
```

## Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/categories` | List all categories (shows ✅ for subscribed) | `/categories` |
| `/subscribe` | Subscribe to category(ies) | `/subscribe crypto` or `/subscribe politics,sports` |
| `/unsubscribe` | Unsubscribe from a category | `/unsubscribe crypto` |
| `/mysubs` | View your subscriptions | `/mysubs` |

## How It Works

1. **Auto-categorization**: Markets are automatically categorized based on keywords in their titles
2. **Subscription limits**: Free users can subscribe to 1 category, Premium users get unlimited
3. **Category alerts**: (Future) Users will receive alerts for new markets and big moves in their subscribed categories

## Testing

```bash
# Restart the bot
npm start

# Then test in Telegram:
# /categories - should list all 7 categories
# /subscribe crypto - should work for free users
# /subscribe sports - should fail for free users (at limit)
# /mysubs - should show crypto
# /unsubscribe crypto - should work
```
