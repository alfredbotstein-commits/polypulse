-- ============================================
-- POLYPULSE V2 P5: CATEGORY SUBSCRIPTIONS
-- Run this in Supabase SQL editor
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

-- ============================================
-- VERIFICATION QUERIES (run after creation)
-- ============================================
-- SELECT * FROM information_schema.tables WHERE table_name LIKE 'pp_category%';
-- SELECT * FROM information_schema.columns WHERE table_name = 'pp_category_subs';
-- SELECT * FROM information_schema.columns WHERE table_name = 'pp_market_categories';
