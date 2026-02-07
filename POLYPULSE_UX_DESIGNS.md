# POLYPULSE UX DESIGNS
## Implementation-Ready Templates for Isaiah

**Author:** Raphael (Design Director)  
**Date:** 2026-02-07  
**Status:** COMPLETE — Ready for implementation

---

## 1. /start WELCOME FLOW

### Message Text (Exact Copy)
```
📊 PolyPulse — Real-time Polymarket intelligence

Track odds, set alerts, and never miss a market move.

What would you like to do?
```

### Button Layout (2x2 Grid)
```
Row 1: [🔥 Trending]  [🔍 Browse]
Row 2: [💼 Portfolio] [⭐ Premium]
```

### Button Callback Data
| Button | callback_data | Action |
|--------|---------------|--------|
| 🔥 Trending | `cmd_trending` | Show top 10 markets by volume |
| 🔍 Browse | `cmd_browse` | Show category selection grid |
| 💼 Portfolio | `cmd_portfolio` | Show user's positions or empty state |
| ⭐ Premium | `cmd_premium` | Show premium features & pricing |

### Button Tap Behaviors

**🔥 Trending →**
```
🔥 Trending Markets

1. Will Bitcoin exceed $150K in 2026?
   📈 67% YES (+5% 24h) | Vol: $2.4M
   [🔔 Alert] [👀 Watch]

2. Will Trump win 2028 GOP nomination?
   📈 81% YES (+2% 24h) | Vol: $1.8M
   [🔔 Alert] [👀 Watch]

[continues for top 10...]

[🔍 Browse Categories] [🔄 Refresh]
```

**🔍 Browse →**
Shows category grid (see Section 2)

**💼 Portfolio →**
If empty:
```
💼 Your Portfolio

No positions yet. Start tracking your Polymarket bets!

[🔍 Browse Markets] [🔥 See Trending]
```

If has positions:
```
💼 Your Portfolio

Total Value: $1,240 (+$85 / +7.3%)

1. Bitcoin > $150K
   100 shares @ $0.52 → now $0.67
   📈 +$15.00 (+28.8%)

2. Trump 2028 Nomination
   50 shares @ $0.75 → now $0.81
   📈 +$3.00 (+8%)

[➕ Add Position] [📊 Detailed P&L]
```

**⭐ Premium →**
```
⭐ PolyPulse Premium — $9.99/mo

Unlock the full trading edge:

🔔 Unlimited Alerts (free: 3)
👀 Unlimited Watchlist (free: 3)
💼 Full Portfolio Tracking (free: 1 position)
🐋 Whale Alerts — get notified when $10K+ positions move
☀️ Morning Briefing — daily digest at your preferred time
📊 Priority API — faster updates, no rate limits

[💳 Subscribe Now] [⬅️ Back]
```

---

## 2. CATEGORY BROWSING

### Category Grid Layout (2x5)
```
Row 1: [🪙 Crypto]      [🏛️ US Politics]
Row 2: [🌍 World]       [💻 Tech]
Row 3: [📈 Economics]   [⚽ Sports]
Row 4: [🎬 Entertainment] [🔬 Science]
Row 5: [⚖️ Legal]       [🏥 Health]
```

### Callback Data Mapping
| Button | callback_data |
|--------|---------------|
| 🪙 Crypto | `cat_crypto` |
| 🏛️ US Politics | `cat_politics_us` |
| 🌍 World | `cat_politics_world` |
| 💻 Tech | `cat_tech` |
| 📈 Economics | `cat_economics` |
| ⚽ Sports | `cat_sports` |
| 🎬 Entertainment | `cat_entertainment` |
| 🔬 Science | `cat_science` |
| ⚖️ Legal | `cat_legal` |
| 🏥 Health | `cat_health` |

### Category Page Template
```
{CATEGORY_EMOJI} {CATEGORY_NAME}

1. {MARKET_TITLE}
   📈 {PROBABILITY}% YES ({CHANGE_DIRECTION}{CHANGE_PERCENT}% 24h) | Vol: {VOLUME}
   [🔔 Alert] [👀 Watch]

2. {MARKET_TITLE}
   📈 {PROBABILITY}% YES ({CHANGE_DIRECTION}{CHANGE_PERCENT}% 24h) | Vol: {VOLUME}
   [🔔 Alert] [👀 Watch]

[...up to 5 markets per page...]

[⬅️ Categories] [➡️ More]
```

### Example: Crypto Category
```
🪙 Crypto Markets

1. Will Bitcoin exceed $150K in 2026?
   📈 67% YES (+5% 24h) | Vol: $2.4M
   [🔔 Alert] [👀 Watch]

2. Will Ethereum flip Bitcoin by 2027?
   📈 12% YES (-2% 24h) | Vol: $890K
   [🔔 Alert] [👀 Watch]

3. Solana ATH before July 2026?
   📈 45% YES (+8% 24h) | Vol: $650K
   [🔔 Alert] [👀 Watch]

4. Will SEC approve spot ETH ETF?
   📈 73% YES (+1% 24h) | Vol: $1.2M
   [🔔 Alert] [👀 Watch]

5. Bitcoin dominance > 60% EOY?
   📈 38% YES (-3% 24h) | Vol: $420K
   [🔔 Alert] [👀 Watch]

[⬅️ Categories] [➡️ More]
```

---

## 3. COMMAND RESPONSE TEMPLATES

### /trending
**Response:**
```
🔥 Trending Markets

1. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h) | Vol: ${VOLUME}
   [🔔 Alert] [👀 Watch]

2. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h) | Vol: ${VOLUME}
   [🔔 Alert] [👀 Watch]

[...10 markets total...]

[🔍 Browse Categories] [🔄 Refresh]
```

**Buttons per market row:** `[🔔 Alert]` `[👀 Watch]`  
**Bottom buttons:** `[🔍 Browse Categories]` `[🔄 Refresh]`

---

### /search {query}
**With results:**
```
🔍 Results for "{QUERY}"

1. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h)
   [🔔 Alert] [👀 Watch] [📊 Details]

2. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h)
   [🔔 Alert] [👀 Watch] [📊 Details]

[...up to 10 results...]

Showing {COUNT} of {TOTAL} results
[➡️ More Results] [🔍 New Search]
```

**Without query (just `/search`):**
```
🔍 Search Markets

Type what you're looking for, or browse by category:

[🪙 Crypto] [🏛️ Politics] [⚽ Sports]
[💻 Tech] [📈 Economics] [🎬 Entertainment]
```

---

### /price {market}
**Response:**
```
📊 {MARKET_TITLE}

Current: {PROB}% YES
24h Change: {CHANGE_DIR}{CHANGE}%
Volume: ${VOLUME} ({VOLUME_CHANGE_DIR}{VOLUME_CHANGE}% 24h)
Liquidity: ${LIQUIDITY}

🐋 Recent Activity:
• ${WHALE_AMOUNT} {WHALE_SIDE} position {TIME_AGO}
• ${WHALE_AMOUNT} {WHALE_SIDE} position {TIME_AGO}

[🔔 Set Alert] [👀 Add to Watchlist] [💰 Log Position]
```

**Without market specified:**
```
📊 Price Check

Which market? Browse or search:

[🔥 Trending] [🔍 Browse Categories]

Or type a market name directly.
```

---

### /alert
**Initial (no market specified):**
```
🔔 Set Price Alert

Choose a category to find markets:

[🪙 Crypto] [🏛️ US Politics]
[🌍 World] [💻 Tech]
[📈 Economics] [⚽ Sports]
[🎬 Entertainment] [🔬 Science]

[📋 My Alerts] [🔥 From Trending]
```

**After market selected:**
```
🔔 Alert: {MARKET_TITLE}

Current: {PROB}% YES

Alert me when odds hit:

[25%] [50%] [75%]
[📝 Custom Threshold]

[⬅️ Back]
```

**Alert confirmation:**
```
✅ Alert Set!

{MARKET_TITLE}
📍 Alert when: {THRESHOLD}% {DIRECTION}
Current: {PROB}%

[📋 View All Alerts] [🔔 Set Another] [🔥 Trending]
```

---

### /watch
**Initial:**
```
👀 Add to Watchlist

Choose a category:

[🪙 Crypto] [🏛️ US Politics]
[🌍 World] [💻 Tech]
[📈 Economics] [⚽ Sports]

[📋 My Watchlist] [🔥 From Trending]
```

**Confirmation:**
```
✅ Added to Watchlist!

{MARKET_TITLE}
📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h)

[📋 View Watchlist] [🔔 Set Alert] [👀 Add Another]
```

**View watchlist:**
```
👀 Your Watchlist ({COUNT}/{MAX})

1. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h)
   [🔔 Alert] [❌ Remove]

2. {MARKET_TITLE}
   📈 {PROB}% YES ({CHANGE_DIR}{CHANGE}% 24h)
   [🔔 Alert] [❌ Remove]

[➕ Add Market] [🔥 Trending]
```

---

### /portfolio
**Empty state:**
```
💼 Your Portfolio

No positions tracked yet.

Log your first Polymarket position to track P&L!

[➕ Log Position] [🔍 Browse Markets]
```

**With positions:**
```
💼 Your Portfolio

Total: ${TOTAL_VALUE} ({TOTAL_PNL_DIR}${TOTAL_PNL} / {TOTAL_PNL_DIR}{TOTAL_PNL_PCT}%)

1. {MARKET_TITLE}
   {SHARES} shares @ ${ENTRY} → ${CURRENT}
   {PNL_DIR}${PNL} ({PNL_DIR}{PNL_PCT}%)
   [📊 Details] [❌ Close]

2. {MARKET_TITLE}
   {SHARES} shares @ ${ENTRY} → ${CURRENT}
   {PNL_DIR}${PNL} ({PNL_DIR}{PNL_PCT}%)
   [📊 Details] [❌ Close]

[➕ Add Position] [📈 P&L History]
```

---

### /help
**Response:**
```
❓ PolyPulse Help

Quick actions:
• 🔥 /trending — hottest markets right now
• 🔍 /search [query] — find any market
• 📊 /price [market] — current odds & activity

Track markets:
• 🔔 /alert — get notified on price moves
• 👀 /watch — add to your watchlist
• 💼 /portfolio — track your positions

Account:
• ⭐ /premium — unlock full features
• ⚙️ /settings — notification preferences
• 📋 /alerts — manage your alerts

Need help with something specific?

[🔥 Trending] [🔍 Browse] [⭐ Premium]
```

---

## 4. ERROR TEMPLATES

### No Results Found
```
😕 No markets found for "{QUERY}"

Try:
• Different keywords
• Broader search terms
• Browse categories instead

[🔍 Browse Categories] [🔥 See Trending]
```

### Rate Limit Hit
```
⏳ Slow down!

Too many requests. Try again in {SECONDS} seconds.

In the meantime:
[📋 View Watchlist] [💼 My Portfolio]
```

### Invalid Input
```
🤔 I didn't understand that.

Try one of these:
• Type a market name to check the price
• Use /help to see all commands
• Or just tap a button below

[🔥 Trending] [🔍 Browse] [❓ Help]
```

### Premium Required
```
⭐ Premium Feature

{FEATURE_NAME} is available on Premium.

Premium includes:
• 🔔 Unlimited alerts
• 🐋 Whale movement alerts
• ☀️ Daily morning briefing
• 💼 Full portfolio tracking

Just $9.99/month

[💳 Upgrade Now] [⬅️ Back]
```

### Market Not Found
```
❓ Market not found

I couldn't find "{MARKET_NAME}"

Try browsing instead:
[🔍 Browse Categories] [🔥 Trending]
```

### API Error / Temporary Issue
```
⚠️ Temporary hiccup

Something went wrong on our end. Try again in a moment.

[🔄 Try Again] [🔥 Trending]
```

---

## 5. UPSELL TEMPLATES

### Alert Limit Hit
```
🔔 Alert Limit Reached

You've used 3/3 free alerts.

Premium unlocks:
• ∞ Unlimited alerts
• 🐋 Whale alerts ($10K+ moves)
• ☀️ Morning briefings
• 💼 Full portfolio tracking

[⭐ Upgrade $9.99/mo] [📋 Manage Alerts]
```

### Watchlist Limit Hit
```
👀 Watchlist Full

You've used 3/3 free watchlist slots.

Premium unlocks:
• ∞ Unlimited watchlist
• ☀️ Daily briefing on all your markets
• 🔔 Unlimited alerts
• 🐋 Whale movement alerts

[⭐ Upgrade $9.99/mo] [📋 Edit Watchlist]
```

### Portfolio Limit Hit
```
💼 Portfolio Limit Reached

Free tier tracks 1 position.

Premium unlocks:
• ∞ Unlimited positions
• 📊 Detailed P&L tracking
• 🔔 Position alerts
• 📈 Performance history

[⭐ Upgrade $9.99/mo] [💼 View Position]
```

### Post-Upgrade Welcome
```
🎉 Welcome to Premium!

You now have full access:

✅ Unlimited alerts
✅ Unlimited watchlist
✅ Full portfolio tracking
✅ Whale alerts enabled
✅ Morning briefings available

Set up your experience:

[☀️ Configure Morning Briefing]
[🐋 Whale Alert Settings]
[🔍 Browse Categories]
```

---

## 6. POST-ACTION SUGGESTIONS

Every action ends with relevant next steps. Never leave the user at a dead end.

### After Setting Alert
```
✅ Alert set!

{MARKET_TITLE}
📍 Notify when: {THRESHOLD}%

[📋 See All Alerts] [🔔 Set Another] [🔥 Trending]
```

### After Checking Price
```
[🔔 Set Alert] [👀 Add to Watchlist] [💰 Log Position]
```

### After Adding to Watchlist
```
✅ Added to watchlist!

[📋 View Watchlist] [🔔 Set Alert] [👀 Add Another]
```

### After Logging Position
```
✅ Position logged!

{MARKET_TITLE}
{SHARES} shares @ ${ENTRY}

[💼 View Portfolio] [📊 Check P&L] [➕ Log Another]
```

### After Viewing Trending
Each market shows: `[🔔 Alert] [👀 Watch]`
Bottom: `[🔍 Browse Categories] [🔄 Refresh]`

### After Viewing Category
Each market shows: `[🔔 Alert] [👀 Watch]`
Bottom: `[⬅️ Categories] [➡️ More]`

### After Removing Alert/Watch
```
✅ Removed!

[📋 View Remaining] [➕ Add New] [🔥 Trending]
```

### After Upgrade
```
🎉 Welcome to Premium!

Here's what you just unlocked:

[☀️ Set Up Morning Briefing]
[🐋 Configure Whale Alerts]
[🔍 Browse Categories]
```

### After /help
```
[🔥 Trending] [🔍 Browse] [⭐ Premium]
```

---

## SMART TEXT HANDLING

When user types bare text (no command), parse intelligently:

| User Input | Action | Response |
|------------|--------|----------|
| `bitcoin` / `btc` | Show Bitcoin markets | Price + action buttons |
| `trump` / `election` | Show political markets | Matching markets list |
| `what's trending` / `trending` | Treat as /trending | Trending response |
| `help` / `how does this work` | Treat as /help | Help response |
| `stop` / `cancel` / `unsubscribe` | Show settings | Subscription management |
| Unrecognized | Fallback | See below |

### Smart Match Response
```
📊 {MARKET_TITLE}

{PROB}% YES ({CHANGE_DIR}{CHANGE}% today)
Volume: ${VOLUME} | {WHALE_CONTEXT}

[📈 Track It] [🔔 Set Alert] [💰 Buy Position]
```

### Unrecognized Fallback
```
🤔 I didn't catch that.

Try tapping a button or use /help

[🔥 Trending] [🔍 Browse] [❓ Help]
```

---

## IMPLEMENTATION NOTES FOR ISAIAH

### Telegram Inline Keyboard Format
```javascript
{
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🔥 Trending", callback_data: "cmd_trending" },
        { text: "🔍 Browse", callback_data: "cmd_browse" }
      ],
      [
        { text: "💼 Portfolio", callback_data: "cmd_portfolio" },
        { text: "⭐ Premium", callback_data: "cmd_premium" }
      ]
    ]
  }
}
```

### Callback Data Conventions
- Commands: `cmd_{command}` (e.g., `cmd_trending`, `cmd_browse`)
- Categories: `cat_{category}` (e.g., `cat_crypto`, `cat_politics_us`)
- Market actions: `{action}_{market_id}` (e.g., `alert_abc123`, `watch_abc123`)
- Pagination: `page_{section}_{number}` (e.g., `page_trending_2`)
- Navigation: `nav_{destination}` (e.g., `nav_back`, `nav_categories`)

### Variable Placeholders
Use these in code:
- `{MARKET_TITLE}` — Full market question
- `{PROB}` — Current YES probability (integer)
- `{CHANGE}` — 24h change (absolute value)
- `{CHANGE_DIR}` — `+` or `-`
- `{VOLUME}` — Formatted volume (e.g., "2.4M")
- `{LIQUIDITY}` — Formatted liquidity
- `{THRESHOLD}` — Alert threshold percentage
- `{SHARES}` — Number of shares
- `{ENTRY}` — Entry price
- `{CURRENT}` — Current price
- `{PNL}` — Profit/loss amount
- `{PNL_PCT}` — Profit/loss percentage
- `{PNL_DIR}` — `+` or `-`

### Response Time Requirements
- Target: <1 second for all responses
- If API call takes >500ms: Send ⏳ immediately, then edit message with results
- Always enable typing indicator while processing

### Button Grid Rules
- Max 8 buttons per row on mobile
- 2-3 buttons per row is ideal
- Always include a back/escape option
- Never dead-end the user

---

## DEFINITION OF DONE CHECKLIST

For Isaiah to verify before marking complete:

- [ ] /start shows exact copy + 4-button layout
- [ ] All 10 categories browsable via buttons
- [ ] Each category shows top 5+ markets from live API
- [ ] Every market listing has [🔔 Alert] [👀 Watch] buttons
- [ ] /trending shows 10 markets with inline action buttons
- [ ] /search returns results with action buttons
- [ ] /price shows market + whale activity + action buttons
- [ ] /alert flow: categories → markets → thresholds (no typing required)
- [ ] /watch flow: categories → markets (no typing required)
- [ ] /portfolio shows positions or empty state with next actions
- [ ] /help shows commands + bottom action buttons
- [ ] All 4 error templates implemented
- [ ] All 4 upsell templates implemented (limits enforced)
- [ ] Post-upgrade welcome flow works
- [ ] Every response has next-action buttons
- [ ] Smart text matching for common queries
- [ ] Fallback response for unrecognized input has buttons
- [ ] Response time <1 second (or ⏳ shown)
- [ ] "New user test" passes: value in <10 seconds

---

**END OF SPECIFICATION**

*This document contains everything needed to implement the PolyPulse UX. Copy-paste the templates, wire up the callbacks, and ship it.*
