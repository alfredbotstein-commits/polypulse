# PolyPulse Product Specification
## Premium Intelligence Product — Scott's Quality Standard

*Source: Scott's message 2026-02-06*

---

## THE EXPERIENCE

When a user first messages @GetPolyPulse_bot, this is what happens:

### 1. START — Clean, warm welcome
"Welcome to PolyPulse 📊
Real-time Polymarket intelligence, delivered instantly.
Try it now: type /trending to see what's hot."

That's it. No essay. No 15 commands listed. One action. Get them hooked.

### 2. /trending — Beautifully formatted list
Each market shows:
- Market name (clean, readable)
- Current odds (formatted as percentages with directional arrows ↑↓)
- 24h volume (human readable — "$1.2M" not "1247832")
- 24h change (color-coded: 🟢 up, 🔴 down)
- A one-line insight ("Surging after Reuters report" or "Steady despite volatility")

### 3. /price [market] — Rich market detail
- Current YES/NO odds
- 24h trend with sparkline (use unicode blocks ▁▂▃▅▇ to show movement)
- Volume
- Key recent trades (whale activity if any)
- Related markets ("You might also watch: ETH 10K, BTC 150K")

### 4. /alert — Premium upsell
"🔔 Alerts are a Premium feature.
Get instant notifications when markets move — so you never miss a trade.

✨ Premium includes:
• Unlimited price alerts
• Whale movement notifications
• Daily market digests
• Volume anomaly detection
• Priority support

$9.99/month — cancel anytime.
→ /upgrade to start your free trial"

### 5. /upgrade — Stripe checkout flow
Bot generates unique Stripe Checkout URL → User taps → Browser opens → Payment → Webhook confirms → Bot says "Welcome to Premium! 🎉"

---

## PAYMENT FLOW

- User types /upgrade → Bot generates Stripe Checkout URL
- User taps link → Opens in mobile browser
- Pays via Stripe (card, Apple Pay, Google Pay)
- Stripe webhook hits server → Flips status in database
- Bot confirms: "Welcome to Premium! 🎉 Your alerts are now active."

For subscriptions: /account shows status, next billing date, link to Stripe customer portal for cancel/update.

**We never make cancellation hard.**

---

## QUALITY STANDARDS

Every response must be:
- **Beautifully formatted** (consistent spacing, purposeful emojis, clean alignment)
- **Fast** (under 2 seconds response time)
- **Accurate** (real-time data, not stale cache)
- **Helpful** (every response ends with subtle next action)
- **Human** (personality — confident, sharp, helpful, never robotic)

### Error handling:
- Market not found? → "Couldn't find that market. Try /search [keywords] or /trending to browse."
- API down? → "Polymarket data is temporarily unavailable. We're on it — try again in a few minutes."
- Rate limited? → "You've hit your daily limit (10 queries). Upgrade to Premium for unlimited access → /upgrade"

---

## PREMIUM FEATURES

### 1. /alert [market] [condition]
e.g., `/alert "Bitcoin 100K" > 70%`
- Instant Telegram notification when odds cross threshold
- Supports: above, below, change-by-percentage triggers
- Free users: 1 alert. Premium: unlimited.

### 2. /digest
Daily morning briefing at user's preferred time:
- Top 5 movers overnight
- Any triggered alerts
- New high-volume markets
- Clean daily brief format

### 3. /watchlist (Premium only)
- `/watch "Bitcoin 100K"` adds to watchlist
- `/watchlist` shows all watched markets with current odds + changes

### 4. /whale [market] (Premium only)
- Recent large trades
- Surfaces big money movements

### 5. /portfolio (Premium only)
- Track hypothetical positions
- "I bought YES at 45%" → bot tracks P&L as odds move

---

## TIERS

### Free
- /trending (3x per day)
- /price (10 queries per day)
- /search (5 per day)
- 1 alert

### Premium ($9.99/mo)
- Everything unlimited
- All alert types
- Daily digest
- Watchlist
- Whale tracking
- Portfolio tracking
- Priority response times

**Free tier must be genuinely useful — not crippled. People upgrade because they want MORE, not because free is broken.**

---

## TECHNICAL

- **Database:** Supabase
- **Payments:** Stripe + webhooks
- **Hosting:** Mac Mini initially, Netlify serverless for webhooks
- **Bot framework:** node-telegram-bot-api or grammy
- **Polymarket API:** Direct REST, cache trending 60s to avoid rate limits
- **Alert engine:** Cron checking watched markets every 60 seconds

---

## THE STANDARD

> This bot should feel like it was built by a team of 10 at a well-funded startup, not hacked together by a solo dev. Every interaction should make the user think "this is really well done."

**That's the bar. Best-in-industry. Award-winning. No compromises.**
