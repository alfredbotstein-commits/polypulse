# POLYPULSE v2 — RETENTION & LTV FEATURE SPEC

**Goal:** Make PolyPulse a daily habit that users can't cancel. Every feature below exists to increase time-in-bot and reduce churn.

**Principle:** Free tier gets them in the door. Premium tier makes them dependent. They should feel BLIND without PolyPulse.

---

## PRIORITY 1: MORNING BRIEFING (Daily Habit Engine)

**What:** Every morning at 8am in the user's timezone, premium users receive a personalized Telegram message with everything they need to know.

**Why this is #1:** A product people see every morning never gets cancelled. This is the habit loop. If PolyPulse is the first thing they check with coffee, churn drops to near zero.

**Message format:**
```
☀️ Good morning — here's your PolyPulse briefing

📊 YOUR WATCHLIST
• Bitcoin > $100K by Dec — 73% (+4% overnight)
• Trump wins 2028 — 34% (-2% overnight)  
• Fed cuts rates March — 81% (no change)

🔔 ALERTS TRIGGERED OVERNIGHT
• ⚡ Bitcoin > $100K crossed your 70% threshold at 3:14am

🐋 WHALE MOVES (Last 12h)
• $85K dropped on YES for "ETH ETF approved" (was 52%, now 61%)
• $120K dropped on NO for "TikTok banned" (was 38%, now 29%)

🔥 BIGGEST MOVERS (24h)
• "Apple AR glasses 2026" — 41% → 67% (+26%)
• "UFC 320 main event" — 55% → 38% (-17%)
• "Ethereum > $5K March" — 28% → 41% (+13%)

📈 NEW MARKETS WORTH WATCHING
• "Will Nvidia hit $200 by Q2?" — opened at 44%
• "Next Supreme Court retirement 2026?" — opened at 22%

Have a great day. Reply /price [market] for real-time odds.
```

**Implementation:**
- Supabase table: `pp_briefing_preferences` (user_id, timezone, enabled, categories[])
- Cron job runs every hour, checks which users need briefing in current hour
- Pulls: user's watchlist + overnight alert triggers + whale moves + top movers + new markets
- Default timezone: UTC. Users set with `/timezone EST` or `/timezone PST`
- Command: `/briefing on` / `/briefing off` / `/briefing time 7am`
- Premium only

**Retention impact:** HIGH — creates daily touchpoint. Users who get daily digests retain 3-5x longer than those who don't.

---

## PRIORITY 2: WHALE ALERTS (Unique Alpha)

**What:** When someone places a large bet ($50K+) on any Polymarket market, notify premium users instantly.

**Why:** Whale moves are the #1 signal traders watch. Nobody else offers this on Telegram. This is the feature that makes PolyPulse worth $9.99/mo by itself. It's alpha you can't get anywhere else without manually watching the blockchain.

**Message format:**
```
🐋 WHALE ALERT

$120,000 just dropped on YES
Market: "Trump wins 2028"
Odds moved: 31% → 34% (+3%)
Time: 2 minutes ago

This is the 3rd whale buy on YES in 24 hours.
Total whale volume (24h): $340K YES / $85K NO

→ /price trump-wins-2028
```

**Implementation:**
- Monitor Polymarket's on-chain activity or API for large transactions
- Threshold tiers:
  - 🐋 Whale: $50K+
  - 🦈 Shark: $100K+  
  - 🏦 Institution: $500K+
- Supabase table: `pp_whale_events` (market_id, amount, side, timestamp, odds_before, odds_after)
- Users can filter: `/whale on` (all), `/whale 100k` (only $100K+), `/whale off`
- Premium only
- Rate limit: max 10 whale alerts per hour per user (prevent spam during volatile periods)

**Retention impact:** HIGH — this is unique alpha. Users literally can't get this elsewhere without building their own monitoring. Worth the subscription alone.

---

## PRIORITY 3: PORTFOLIO TRACKER (Money on the Line)

**What:** Users input their actual Polymarket positions. PolyPulse tracks real-time P&L and notifies them of significant changes.

**Why:** When your own money is at stake, you check obsessively. A portfolio tracker turns PolyPulse from "nice to have" into "essential tool for managing my positions." Users with money on the line don't cancel.

**Commands:**
```
/portfolio                     — View all positions with P&L
/buy bitcoin-100k 100 0.54     — Log: bought 100 shares at 54¢
/sell bitcoin-100k 50 0.73     — Log: sold 50 shares at 73¢
/pnl                           — Quick P&L summary
```

**Portfolio view format:**
```
💼 YOUR PORTFOLIO

Position               Shares  Entry   Now     P&L
Bitcoin > $100K        100     $0.54   $0.73   +$19.00 (+35.2%)
Trump wins 2028        200     $0.31   $0.34   +$6.00 (+9.7%)
ETH ETF approved       150     $0.48   $0.61   +$19.50 (+27.1%)

Total invested: $213.00
Current value:  $257.50
Total P&L:      +$44.50 (+20.9%)

📊 Best position: Bitcoin > $100K (+35.2%)
📉 Worst position: Trump wins 2028 (+9.7%)
```

**Smart notifications (premium):**
- Position hits +50% or -30% from entry → alert
- Position odds cross 90% or drop below 10% → "consider taking profit / cutting loss"
- Market resolution approaching → "Your Bitcoin position resolves in 3 days"

**Implementation:**
- Supabase table: `pp_positions` (user_id, market_id, shares, entry_price, side, timestamp)
- Supabase table: `pp_trades` (user_id, market_id, action, shares, price, timestamp) — trade history
- P&L calculated in real-time using current odds from Polymarket API
- Premium only (free users can log 1 position as teaser)

**Retention impact:** VERY HIGH — money on the line = compulsive checking = never cancels.

---

## PRIORITY 4: SMART ALERTS (Beyond Basic Price)

**What:** Alerts that go beyond simple "notify me when odds hit X." Smart alerts detect patterns that indicate something meaningful is happening.

**Why:** Basic alerts are table stakes. Smart alerts make users feel like they have an unfair advantage. "How did you know that market was about to move?" "PolyPulse told me volume was spiking."

**Alert types:**

**Volume Spike Alert:**
```
📊 VOLUME SPIKE

"ETH ETF approved" just saw 5x normal volume in the last hour
Volume: $340K (vs $65K hourly average)
Odds: 52% → 58% (+6%)

Something is happening. Check the news.
→ /price eth-etf
```

**Momentum Alert:**
```
🚀 MOMENTUM ALERT

"Apple AR glasses 2026" has moved +15% in 4 hours
41% → 56% on increasing volume
This is the fastest move in this market's history.

→ /price apple-ar
```

**Divergence Alert:**
```
⚠️ DIVERGENCE ALERT  

"Fed cuts rates March" odds (81%) diverge from 
related market "Inflation drops below 3%" (34%)
These usually move together. One of them may be mispriced.

→ /price fed-cuts
→ /price inflation-3pct
```

**New Market Alert (by category):**
```
🆕 NEW MARKET IN YOUR CATEGORIES

Category: Crypto
"Will Solana hit $300 by June 2026?"
Opening odds: 22% YES
Volume so far: $45K

→ /price solana-300
→ /watch solana-300
```

**Implementation:**
- Volume spike: compare current hour volume vs 24h average. Alert at 3x+
- Momentum: detect moves of 10%+ in 4 hours or less
- Divergence: maintain correlation map of related markets, alert when they decouple
- New markets: Polymarket API, match against user's category preferences
- Commands: `/smartalert volume on`, `/smartalert momentum on`, `/smartalert categories crypto,politics`
- Supabase table: `pp_smart_alert_prefs` (user_id, alert_type, enabled, params)
- Premium only

**Retention impact:** MEDIUM-HIGH — makes users feel they have an edge. The "how did you know?" factor.

---

## PRIORITY 5: CATEGORY SUBSCRIPTIONS (Reduce Friction)

**What:** Instead of watching individual markets, subscribe to entire categories. Get all updates in your areas of interest automatically.

**Why:** Setting up individual alerts is friction. Most users won't do it. Category subscriptions are one command and you're done — instant value with zero setup.

**Commands:**
```
/categories                           — List available categories
/subscribe crypto                     — Subscribe to all crypto markets
/subscribe politics,sports            — Subscribe to multiple
/unsubscribe crypto                   — Unsubscribe
/mysubs                               — View active subscriptions
```

**Categories:**
- 🪙 Crypto (Bitcoin, Ethereum, DeFi, regulations)
- 🏛️ Politics (US elections, policy, international)
- ⚽ Sports (UFC, NFL, NBA, soccer, Olympics)
- 💻 Tech (product launches, IPOs, AI milestones)
- 🌍 World Events (geopolitics, climate, science)
- 💰 Economics (Fed, inflation, GDP, employment)
- 🎬 Entertainment (awards, box office, celebrity)

**What subscribers get:**
- Daily category digest in morning briefing
- Alerts when any market in category moves 10%+
- New market notifications in category
- Weekly category summary

**Implementation:**
- Supabase table: `pp_category_subs` (user_id, category, created_at)
- Markets tagged by category in `pp_market_categories` (market_id, category)
- Category tagging can be automated — match market title keywords to categories
- Free users: 1 category. Premium: unlimited.

**Retention impact:** MEDIUM — reduces onboarding friction, increases daily value delivery.

---

## PRIORITY 6: PREDICTION LEADERBOARD (Gamification)

**What:** Track users' prediction accuracy over time. Show leaderboards. Create competition.

**Why:** Gamification creates emotional investment beyond the functional value. People don't cancel products where they have a "streak" or "rank." Plus, bragging rights drive word-of-mouth sharing.

**Commands:**
```
/predict bitcoin-100k yes            — Make a prediction (free, no money)
/predictions                         — View your prediction history
/accuracy                            — Your accuracy stats
/leaderboard                         — Top predictors this month
```

**Accuracy view:**
```
🎯 YOUR PREDICTION ACCURACY

All-time: 67% correct (42/63 predictions)
This month: 73% correct (11/15)
Streak: 🔥 5 correct in a row

Best category: Crypto (78%)
Worst category: Politics (54%)

Rank: #47 out of 1,203 predictors

→ /leaderboard to see the top 10
```

**Leaderboard:**
```
🏆 TOP PREDICTORS — February 2026

 1. @crypto_whale_99    — 89% (18/20)  🥇
 2. @polymarket_pro     — 85% (23/27)  🥈
 3. @odds_master        — 82% (14/17)  🥉
 4. @degen_trader_tx    — 80% (12/15)
 5. @market_sage        — 78% (21/27)
 ...
 47. @you               — 73% (11/15)

Make more predictions to climb! → /predict
```

**Implementation:**
- Supabase table: `pp_predictions` (user_id, market_id, prediction, timestamp, resolved, correct)
- Resolution: when Polymarket resolves a market, check all predictions
- Leaderboard: monthly reset, minimum 10 predictions to qualify
- Free users can predict (drives engagement). Leaderboard is premium.
- Share feature: generate image of your accuracy stats for Twitter/social sharing

**Retention impact:** MEDIUM — gamification drives engagement and word-of-mouth. Users with a rank/streak don't cancel.

---

## FREE vs PREMIUM TIER STRUCTURE

| Feature | Free | Premium ($9.99/mo) |
|---------|------|-------------------|
| /price (real-time odds) | ✅ Unlimited | ✅ Unlimited |
| /trending (top markets) | ✅ 3/day | ✅ Unlimited |
| /alert (basic price alerts) | ✅ 2 alerts | ✅ Unlimited alerts |
| /watch (watchlist) | ✅ 3 markets | ✅ Unlimited |
| Morning Briefing | ❌ | ✅ Daily personalized digest |
| Whale Alerts | ❌ | ✅ Real-time $50K+ moves |
| Portfolio Tracker | 1 position | ✅ Unlimited positions + P&L |
| Smart Alerts (volume, momentum) | ❌ | ✅ All alert types |
| Category Subscriptions | 1 category | ✅ Unlimited categories |
| Predictions | ✅ Can predict | ✅ + Leaderboard + accuracy stats |
| Priority support | ❌ | ✅ |

**Free tier strategy:** Give enough to be useful and create the habit. The limits should feel frustrating — "I wish I could set more than 2 alerts" is the exact moment someone upgrades.

---

## IMPLEMENTATION PRIORITY

Isaiah builds in this order:

| Priority | Feature | Effort | LTV Impact | Revenue Impact |
|----------|---------|--------|------------|---------------|
| P1 | Morning Briefing | 1-2 days | 🔥🔥🔥🔥🔥 | Creates daily habit |
| P2 | Whale Alerts | 1-2 days | 🔥🔥🔥🔥 | Unique alpha, worth $9.99 alone |
| P3 | Portfolio Tracker | 2-3 days | 🔥🔥🔥🔥 | Money on the line = never cancel |
| P4 | Smart Alerts | 2-3 days | 🔥🔥🔥 | Competitive advantage |
| P5 | Category Subscriptions | 1 day | 🔥🔥 | Reduces friction, increases value |
| P6 | Leaderboard | 2-3 days | 🔥🔥 | Gamification + word of mouth |

**Total: ~10-14 days for full v2**

P1 and P2 should ship within the first week. These two alone justify the $9.99/mo and will be the primary retention drivers.

---

## DATABASE SCHEMA ADDITIONS

```sql
-- Morning briefing preferences
CREATE TABLE pp_briefing_prefs (
    user_id BIGINT PRIMARY KEY REFERENCES pp_users(telegram_id),
    enabled BOOLEAN DEFAULT true,
    timezone TEXT DEFAULT 'UTC',
    send_hour INTEGER DEFAULT 8,
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Whale events
CREATE TABLE pp_whale_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    amount_usd NUMERIC NOT NULL,
    side TEXT NOT NULL,  -- 'YES' or 'NO'
    odds_before NUMERIC,
    odds_after NUMERIC,
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- User whale alert preferences
CREATE TABLE pp_whale_prefs (
    user_id BIGINT PRIMARY KEY REFERENCES pp_users(telegram_id),
    enabled BOOLEAN DEFAULT true,
    min_amount_usd NUMERIC DEFAULT 50000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Portfolio positions
CREATE TABLE pp_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    side TEXT NOT NULL,
    shares NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    status TEXT DEFAULT 'open',  -- 'open', 'closed'
    created_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Trade history
CREATE TABLE pp_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    position_id UUID REFERENCES pp_positions(id),
    action TEXT NOT NULL,  -- 'buy', 'sell'
    shares NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Smart alert preferences
CREATE TABLE pp_smart_alert_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    alert_type TEXT NOT NULL,  -- 'volume_spike', 'momentum', 'divergence', 'new_market'
    enabled BOOLEAN DEFAULT true,
    params JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Category subscriptions
CREATE TABLE pp_category_subs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES pp_users(telegram_id),
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Market categories
CREATE TABLE pp_market_categories (
    market_id TEXT NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (market_id, category)
);

-- Predictions
CREATE TABLE pp_predictions (
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
```

---

## THE RETENTION FLYWHEEL

```
Morning Briefing (daily habit)
    ↓
User sees whale moves + market movers
    ↓
Checks portfolio P&L
    ↓
Sets new alerts on interesting markets
    ↓
Makes predictions (gamification)
    ↓
Shares accuracy on social (word of mouth)
    ↓
New users join → repeat
```

Every feature feeds into the next. The morning briefing drives engagement with whale alerts and portfolio. Portfolio tracking drives alert creation. Predictions drive social sharing. Social sharing drives acquisition.

**This is how you get LTV that justifies $9.99/mo. The bot becomes indispensable.**
