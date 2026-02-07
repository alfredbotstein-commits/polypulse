# POLYPULSE UX DESIGNS
## Complete Implementation Spec for Isaiah — Copy-Paste Ready

**Deadline:** 3PM CST Feb 7, 2026  
**Author:** Raphael (Design Director)  
**Version:** 1.0

---

# 1. /start WELCOME FLOW

## Welcome Message

```
📊 *PolyPulse* — Real-time Polymarket intelligence

Track odds, set alerts, and spot opportunities before they move.

What would you like to do?
```

### Button Layout
```
┌─────────────────────────┬─────────────────────────┐
│   🔥 Trending Markets   │   🔍 Browse Categories  │
├─────────────────────────┼─────────────────────────┤
│      💰 My Portfolio    │      ⭐ Go Premium      │
└─────────────────────────┴─────────────────────────┘
```

### Callback Data
```javascript
Row 1: [
  { text: "🔥 Trending Markets", callback_data: "cmd_trending" },
  { text: "🔍 Browse Categories", callback_data: "browse_categories" }
]
Row 2: [
  { text: "💰 My Portfolio", callback_data: "cmd_portfolio" },
  { text: "⭐ Go Premium", callback_data: "cmd_upgrade" }
]
```

### Special Cases
- **If user is Premium:** Change "⭐ Go Premium" to "⭐ Premium Active" (callback: `cmd_premium_status`)
- **Track analytics:** Log `first_seen` timestamp on /start
- **No walls of text** — user gets value in ONE TAP

---

## Flow Diagram: /start → First Value

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER OPENS BOT                                   │
│                                  │                                           │
│                                  ▼                                           │
│                          ┌──────────────┐                                    │
│                          │   /start     │                                    │
│                          │   Welcome    │                                    │
│                          └──────────────┘                                    │
│                                  │                                           │
│          ┌───────────────────────┼───────────────────────┐                   │
│          ▼                       ▼                       ▼                   │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐            │
│  │ 🔥 Trending   │      │ 🔍 Categories │      │ 💰 Portfolio  │            │
│  │   Markets     │      │               │      │               │            │
│  └───────────────┘      └───────────────┘      └───────────────┘            │
│          │                       │                       │                   │
│          ▼                       ▼                       ▼                   │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐            │
│  │ Top 5 markets │      │ 10 category   │      │ User's tracked│            │
│  │ + quick       │      │ buttons       │      │ positions     │            │
│  │ actions       │      │               │      │ with P&L      │            │
│  └───────────────┘      └───────────────┘      └───────────────┘            │
│          │                       │                       │                   │
│          │                       ▼                       │                   │
│          │              ┌───────────────┐                │                   │
│          │              │ Tap category  │                │                   │
│          │              │ → 5 markets   │                │                   │
│          │              └───────────────┘                │                   │
│          │                       │                       │                   │
│          └───────────────────────┼───────────────────────┘                   │
│                                  ▼                                           │
│                         ┌───────────────┐                                    │
│                         │  TAP MARKET   │                                    │
│                         │  Detail view  │                                    │
│                         │  + Actions    │                                    │
│                         └───────────────┘                                    │
│                                  │                                           │
│          ┌───────────────────────┼───────────────────────┐                   │
│          ▼                       ▼                       ▼                   │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐            │
│  │ 🔔 Set Alert  │      │ 👀 Watch      │      │ 💰 Log Pos.   │            │
│  └───────────────┘      └───────────────┘      └───────────────┘            │
│                                                                              │
│   ⏱️ GOAL: User gets useful data in < 10 seconds, zero typing required      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. CATEGORY BROWSING

## Categories Menu

### Message Text
```
🔍 *Browse Categories*

Tap a category to explore markets:
```

### Button Grid Layout
```
┌─────────────────────┬─────────────────────┐
│     🪙 Crypto       │   🏛️ US Politics    │
├─────────────────────┼─────────────────────┤
│  🌍 World Politics  │      💻 Tech        │
├─────────────────────┼─────────────────────┤
│    📈 Economics     │     ⚽ Sports       │
├─────────────────────┼─────────────────────┤
│  🎬 Entertainment   │    🔬 Science       │
├─────────────────────┼─────────────────────┤
│      ⚖️ Legal       │     🏥 Health       │
├─────────────────────┴─────────────────────┤
│                🏠 Home                    │
└───────────────────────────────────────────┘
```

### Complete Callback Data
```javascript
const categoryButtons = [
  [
    { text: "🪙 Crypto", callback_data: "cat_crypto" },
    { text: "🏛️ US Politics", callback_data: "cat_us_politics" }
  ],
  [
    { text: "🌍 World Politics", callback_data: "cat_world_politics" },
    { text: "💻 Tech", callback_data: "cat_tech" }
  ],
  [
    { text: "📈 Economics", callback_data: "cat_economics" },
    { text: "⚽ Sports", callback_data: "cat_sports" }
  ],
  [
    { text: "🎬 Entertainment", callback_data: "cat_entertainment" },
    { text: "🔬 Science", callback_data: "cat_science" }
  ],
  [
    { text: "⚖️ Legal", callback_data: "cat_legal" },
    { text: "🏥 Health", callback_data: "cat_health" }
  ],
  [
    { text: "🏠 Home", callback_data: "cmd_start" }
  ]
];
```

### Category → Polymarket Tag Mapping
```javascript
const CATEGORY_TAGS = {
  crypto: ["bitcoin", "ethereum", "solana", "crypto", "defi"],
  us_politics: ["politics", "election", "congress", "supreme-court", "president"],
  world_politics: ["international", "china", "russia", "europe", "war"],
  tech: ["ai", "apple", "google", "meta", "openai", "tech"],
  economics: ["fed", "inflation", "gdp", "recession", "rates"],
  sports: ["ufc", "nfl", "nba", "soccer", "f1", "sports"],
  entertainment: ["oscars", "box-office", "streaming", "celebrity"],
  science: ["space", "climate", "nasa", "nobel"],
  legal: ["court", "trial", "regulation", "indictment"],
  health: ["fda", "vaccine", "pharma", "pandemic"]
};
```

---

## Category Markets View

When user taps a category, show top 5 markets:

### Message Template
```
{CATEGORY_EMOJI} *{CATEGORY_NAME}*

Top markets by volume:

1️⃣ *{MARKET_1_TITLE}*
   └ {YES_PRICE}% YES · Vol: ${VOLUME_1}

2️⃣ *{MARKET_2_TITLE}*
   └ {YES_PRICE}% YES · Vol: ${VOLUME_2}

3️⃣ *{MARKET_3_TITLE}*
   └ {YES_PRICE}% YES · Vol: ${VOLUME_3}

4️⃣ *{MARKET_4_TITLE}*
   └ {YES_PRICE}% YES · Vol: ${VOLUME_4}

5️⃣ *{MARKET_5_TITLE}*
   └ {YES_PRICE}% YES · Vol: ${VOLUME_5}
```

### Button Layout
```
┌─────┬─────┬─────┬─────┬─────┐
│ 1️⃣  │ 2️⃣  │ 3️⃣  │ 4️⃣  │ 5️⃣  │  ← Tap number to see market detail
├─────┴─────┴─────┴─────┴─────┤
│ ⬅️ Categories │ ➡️ More     │  ← Navigation
└─────────────────────────────┘
```

### Callback Data
```javascript
const categoryMarketsButtons = (markets, categorySlug, page) => [
  markets.slice(0, 5).map((m, i) => ({
    text: `${["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][i]}`,
    callback_data: `market_${m.id}`
  })),
  [
    { text: "⬅️ Categories", callback_data: "browse_categories" },
    { text: "➡️ More", callback_data: `cat_${categorySlug}_page_${page + 1}` }
  ]
];
```

### Volume Formatting Rules
```javascript
function formatVolume(vol) {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${Math.round(vol / 1_000)}K`;
  return vol.toString();
}
```

### Title Truncation
```javascript
function truncateTitle(title, maxLen = 40) {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 3) + "...";
}
```

---

## Market Detail View

When user taps a market number:

### Message Template
```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES · *{NO_PRICE}%* NO
{PRICE_CHANGE_EMOJI} {PRICE_CHANGE}% today

📈 Volume: *${TOTAL_VOLUME}*
💧 Liquidity: *${LIQUIDITY}*
⏰ Closes: *{END_DATE}*

{DESCRIPTION_FIRST_100_CHARS}...
```

### Button Layout
```
┌─────────────────────┬─────────────────────┐
│    🔔 Set Alert     │      👀 Watch       │
├─────────────────────┼─────────────────────┤
│   💰 Log Position   │  📊 Full Details    │
├─────────────────────┴─────────────────────┤
│              ⬅️ Back                      │
└───────────────────────────────────────────┘
```

### Callback Data
```javascript
const marketDetailButtons = (marketId, categorySlug) => [
  [
    { text: "🔔 Set Alert", callback_data: `alert_market_${marketId}` },
    { text: "👀 Watch", callback_data: `watch_market_${marketId}` }
  ],
  [
    { text: "💰 Log Position", callback_data: `buy_market_${marketId}` },
    { text: "📊 Full Details", callback_data: `details_market_${marketId}` }
  ],
  [
    { text: "⬅️ Back", callback_data: `cat_${categorySlug}` }
  ]
];
```

### Dynamic Button States
```javascript
// If user already watching this market:
{ text: "✅ Watching", callback_data: `unwatch_market_${marketId}` }

// If user already has alert:
{ text: "✅ Alert Set", callback_data: `alert_manage_${marketId}` }
```

### Price Change Emoji Logic
```javascript
function priceChangeEmoji(change) {
  if (change > 0) return "📈";
  if (change < 0) return "📉";
  return "➡️";
}
```

---

# 3. COMMAND RESPONSE TEMPLATES

## /trending

### Message Template
```
🔥 *Trending Markets*

Markets with biggest moves in 24h:

1️⃣ *{MARKET_1}*
   └ {PRICE_1}% · {CHANGE_1_EMOJI}*{CHANGE_1}%* · 🐋 {WHALES_1}

2️⃣ *{MARKET_2}*
   └ {PRICE_2}% · {CHANGE_2_EMOJI}*{CHANGE_2}%* · 🐋 {WHALES_2}

3️⃣ *{MARKET_3}*
   └ {PRICE_3}% · {CHANGE_3_EMOJI}*{CHANGE_3}%* · 🐋 {WHALES_3}

4️⃣ *{MARKET_4}*
   └ {PRICE_4}% · {CHANGE_4_EMOJI}*{CHANGE_4}%* · 🐋 {WHALES_4}

5️⃣ *{MARKET_5}*
   └ {PRICE_5}% · {CHANGE_5_EMOJI}*{CHANGE_5}%* · 🐋 {WHALES_5}
```

### Button Layout
```
┌─────┬─────┬─────┬─────┬─────┐
│ 1️⃣  │ 2️⃣  │ 3️⃣  │ 4️⃣  │ 5️⃣  │
├─────┴─────┼─────┴─────┼─────┤
│ 🔄 Refresh│ 🔍 Browse │ 🏠  │
└───────────┴───────────┴─────┘
```

### Callback Data
```javascript
const trendingButtons = (markets) => [
  markets.slice(0, 5).map((m, i) => ({
    text: `${["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"][i]}`,
    callback_data: `market_${m.id}`
  })),
  [
    { text: "🔄 Refresh", callback_data: "cmd_trending" },
    { text: "🔍 Browse", callback_data: "browse_categories" },
    { text: "🏠", callback_data: "cmd_start" }
  ]
];
```

### Notes
- Sort by absolute 24h price change
- 🐋 count = trades > $1,000 in 24h
- Cache for 5 minutes

---

## /search {query}

### If matches found:
```
🔍 *Search Results for "{QUERY}"*

Found {COUNT} markets:

1️⃣ *{MARKET_1}*
   └ {PRICE_1}% YES · Vol: ${VOLUME_1}

2️⃣ *{MARKET_2}*
   └ {PRICE_2}% YES · Vol: ${VOLUME_2}

3️⃣ *{MARKET_3}*
   └ {PRICE_3}% YES · Vol: ${VOLUME_3}
```

### Button Layout (with results)
```
┌─────┬─────┬─────┐
│ 1️⃣  │ 2️⃣  │ 3️⃣  │
├─────┴─────┴─────┤
│  🔍 New Search  │
├─────────────────┤
│    🏠 Home      │
└─────────────────┘
```

### If NO /search argument provided:
```
🔍 *Search Markets*

Type a market name, or browse by category:
```

**Buttons:** Show full category grid (same as browse_categories)

---

## /price {market}

### With market argument — found:
```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES · *{NO_PRICE}%* NO
{PRICE_CHANGE_EMOJI} {PRICE_CHANGE}% in 24h

📈 Vol: ${VOLUME_24H} (24h) · ${TOTAL_VOLUME} total
🐋 {WHALE_COUNT} whale trades today
```

### Button Layout
```
┌─────────────────────┬─────────────────────┐
│    🔔 Set Alert     │  👀 Add to Watchlist│
├─────────────────────┼─────────────────────┤
│   💰 Log Position   │   🔍 Browse More    │
└─────────────────────┴─────────────────────┘
```

### Callback Data
```javascript
const priceButtons = (marketId) => [
  [
    { text: "🔔 Set Alert", callback_data: `alert_market_${marketId}` },
    { text: "👀 Add to Watchlist", callback_data: `watch_market_${marketId}` }
  ],
  [
    { text: "💰 Log Position", callback_data: `buy_market_${marketId}` },
    { text: "🔍 Browse More", callback_data: "browse_categories" }
  ]
];
```

### Without argument — show browse:
```
📊 *Check Market Price*

Select a category to find your market:
```

**Buttons:** Full category grid + [🔥 Trending] [🏠 Home]

---

## /alert

### Without argument — show browse:
```
🔔 *Set Price Alert*

Select a category to find your market:
```

### Button Layout
```
┌─────────────────────┬─────────────────────┐
│     🪙 Crypto       │   🏛️ US Politics    │
├─────────────────────┼─────────────────────┤
│  🌍 World Politics  │      💻 Tech        │
├─────────────────────┼─────────────────────┤
│    📈 Economics     │     ⚽ Sports       │
├─────────────────────┼─────────────────────┤
│  📋 My Watchlist    │     🏠 Home         │
└─────────────────────┴─────────────────────┘
```

### After selecting market — threshold picker:
```
🔔 *Set Alert for:*
📊 {MARKET_TITLE}

Current price: *{YES_PRICE}%* YES

Alert me when YES reaches:
```

### Threshold Buttons
```
┌───────────┬───────────┬───────────┐
│    25%    │    50%    │    75%    │
├───────────┼───────────┼───────────┤
│  ⬆️ +5%   │  ⬇️ -5%   │ ✏️ Custom │
├───────────┴───────────┴───────────┤
│           ❌ Cancel               │
└───────────────────────────────────┘
```

### Callback Data
```javascript
const alertThresholdButtons = (marketId, currentPrice) => [
  [
    { text: "25%", callback_data: `alert_set_${marketId}_25` },
    { text: "50%", callback_data: `alert_set_${marketId}_50` },
    { text: "75%", callback_data: `alert_set_${marketId}_75` }
  ],
  [
    { text: "⬆️ +5%", callback_data: `alert_set_${marketId}_up5` },
    { text: "⬇️ -5%", callback_data: `alert_set_${marketId}_down5` },
    { text: "✏️ Custom", callback_data: `alert_custom_${marketId}` }
  ],
  [
    { text: "❌ Cancel", callback_data: "browse_categories" }
  ]
];
```

### Alert set success:
```
✅ *Alert Set!*

📊 {MARKET_TITLE}
🎯 Alert when: {CONDITION}

I'll notify you the moment it hits.
```

### Success Buttons
```
┌─────────────────────┬─────────────────────┐
│  📋 View All Alerts │   🔔 Set Another    │
├─────────────────────┼─────────────────────┤
│  📊 Check Trending  │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

### Alerts list (/alerts):
```
🔔 *Your Alerts* ({COUNT}/{MAX})

{ALERT_1_EMOJI} *{MARKET_1}*
   └ Alert at {THRESHOLD_1}% (now {CURRENT_1}%)

{ALERT_2_EMOJI} *{MARKET_2}*
   └ Alert at {THRESHOLD_2}% (now {CURRENT_2}%)

{ALERT_3_EMOJI} *{MARKET_3}*
   └ Alert at {THRESHOLD_3}% (now {CURRENT_3}%)
```

### Alert Emoji Logic
```javascript
function alertProximityEmoji(threshold, current) {
  const diff = Math.abs(threshold - current);
  if (diff <= 5) return "🔴";  // within 5%
  if (diff <= 10) return "🟡"; // within 10%
  return "🟢";                  // far away
}
```

### Alerts List Buttons
```
┌───────┬───────┬───────┐
│ ❌ 1  │ ❌ 2  │ ❌ 3  │  ← Delete specific alert
├───────┴───────┴───────┤
│    🔔 Add Alert       │
├───────────────────────┤
│       🏠 Home         │
└───────────────────────┘
```

---

## /watch

### Without argument — show browse:
```
👀 *Add to Watchlist*

Select a category to find your market:
```

**Buttons:** Full category grid

### Watch added success:
```
👀 *Added to Watchlist!*

📊 {MARKET_TITLE}
📍 Added at {YES_PRICE}% YES

I'll include this in your daily updates.
```

### Success Buttons
```
┌─────────────────────┬─────────────────────┐
│  📋 View Watchlist  │    🔔 Set Alert     │
├─────────────────────┼─────────────────────┤
│   🔍 Browse More    │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

### Watchlist view (/watchlist):
```
👀 *Your Watchlist* ({COUNT}/{MAX})

1️⃣ *{MARKET_1}*
   └ {PRICE_1}% YES · {CHANGE_1_EMOJI}{CHANGE_1}% since added

2️⃣ *{MARKET_2}*
   └ {PRICE_2}% YES · {CHANGE_2_EMOJI}{CHANGE_2}% since added

3️⃣ *{MARKET_3}*
   └ {PRICE_3}% YES · {CHANGE_3_EMOJI}{CHANGE_3}% since added
```

### Watchlist Buttons
```
┌─────┬─────┬─────┐
│ 1️⃣  │ 2️⃣  │ 3️⃣  │  ← Tap to see market detail
├─────┴─────┴─────┤
│   ➕ Add More    │
├─────────────────┤
│     🏠 Home     │
└─────────────────┘
```

---

## /portfolio

### Empty portfolio:
```
💼 *Your Portfolio*

You haven't logged any positions yet.

Track your Polymarket positions here to monitor P&L.
```

### Empty Buttons
```
┌─────────────────────┐
│   💰 Log Position   │
├─────────────────────┤
│   🔍 Browse Markets │
├─────────────────────┤
│       🏠 Home       │
└─────────────────────┘
```

### With positions:
```
💼 *Your Portfolio*

Total Value: *${TOTAL_VALUE}*
Total P&L: {PNL_EMOJI} *{PNL_AMOUNT}* ({PNL_PERCENT}%)

📊 *Positions:*

1️⃣ *{MARKET_1}*
   └ {SHARES_1} {SIDE_1} @ {AVG_1}¢ → Now {CURRENT_1}¢
   └ P&L: {PNL_EMOJI_1} ${PNL_1} ({PNL_PCT_1}%)

2️⃣ *{MARKET_2}*
   └ {SHARES_2} {SIDE_2} @ {AVG_2}¢ → Now {CURRENT_2}¢
   └ P&L: {PNL_EMOJI_2} ${PNL_2} ({PNL_PCT_2}%)

3️⃣ *{MARKET_3}*
   └ {SHARES_3} {SIDE_3} @ {AVG_3}¢ → Now {CURRENT_3}¢
   └ P&L: {PNL_EMOJI_3} ${PNL_3} ({PNL_PCT_3}%)
```

### Portfolio Buttons
```
┌─────┬─────┬─────┐
│ 1️⃣  │ 2️⃣  │ 3️⃣  │  ← Tap to manage position
├─────┴─────┴─────┤
│ ➕ Log Position  │
├───────┬─────────┤
│🔄 Refresh│ 🏠 Home│
└───────┴─────────┘
```

### Position Logging Flow:

**Step 1: Select Side**
```
💰 *Log Position*

📊 *{MARKET_TITLE}*

Current price: *{YES_PRICE}%* YES / *{NO_PRICE}%* NO

Which side did you buy?
```

```
┌───────────┬───────────┐
│   ✅ YES  │   ❌ NO   │
├───────────┴───────────┤
│     ⬅️ Back           │
└───────────────────────┘
```

**Step 2: Enter Shares**
```
💰 *Log {SIDE} Position*

📊 {MARKET_TITLE}

How many shares did you buy?

_(Just type the number)_
```

```
┌───────┬───────┬───────┐
│  100  │  500  │ 1000  │  ← Quick select
├───────┴───────┴───────┤
│       ❌ Cancel       │
└───────────────────────┘
```

**Step 3: Enter Price**
```
💰 *Log {SIDE} Position*

📊 {MARKET_TITLE}
📦 {SHARES} shares

What price did you pay per share? (in cents)

Current price: *{CURRENT_PRICE}¢*
```

```
┌───────────────────────┐
│ Current: {CURRENT}¢   │  ← Use current as default
├───────────────────────┤
│       ❌ Cancel       │
└───────────────────────┘
```

**Step 4: Confirmation**
```
✅ *Position Logged!*

📊 {MARKET_TITLE}
📦 {SHARES} {SIDE} @ {PRICE}¢

Current value: *${CURRENT_VALUE}*
P&L: {PNL_EMOJI} *${PNL}* ({PNL_PCT}%)

I'll track this for you.
```

```
┌─────────────────────┬─────────────────────┐
│  💼 View Portfolio  │  📊 Market Details  │
├─────────────────────┼─────────────────────┤
│    🔔 Set Alert     │   ➕ Log Another    │
└─────────────────────┴─────────────────────┘
```

---

# 4. ERROR MESSAGE TEMPLATES

## No Results Found

```
❌ *Market not found*

I couldn't find a market matching "{QUERY}".

Try browsing by category instead:
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│   🔍 Browse Categories  │  🔥 Trending    │
├─────────────────────┼─────────────────────┤
│       ❓ Help       │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

---

## Rate Limit Hit

```
🐢 *Slow down!*

You're sending requests too fast. Wait a few seconds and try again.

_(This protects everyone's experience)_
```

### Buttons
```
┌─────────────────────┐
│       🏠 Home       │
└─────────────────────┘
```

**Implementation note:** Rate limit = 30 requests/minute per user. No action buttons that would trigger more requests.

---

## Invalid Input

```
🤔 *I didn't understand that*

{SPECIFIC_ERROR}

Try again or browse markets instead:
```

### SPECIFIC_ERROR examples:
- "Alert threshold must be between 1-99%"
- "Number of shares must be a positive number"
- "That doesn't look like a valid market name"
- "Please enter a number only"

### Buttons
```
┌─────────────────────┬─────────────────────┐
│      🔍 Browse      │     🔥 Trending     │
├─────────────────────┼─────────────────────┤
│       ❓ Help       │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

---

## Premium Required

```
⭐ *Premium Feature*

{FEATURE_NAME} is a Premium feature.

Upgrade to unlock:
• {BENEFIT_1}
• {BENEFIT_2}
• {BENEFIT_3}

Just *$9.99/month* — cancel anytime.
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│   ⭐ Upgrade Now    │    🔥 Trending      │
├─────────────────────┴─────────────────────┤
│               🏠 Home                     │
└───────────────────────────────────────────┘
```

---

## API Timeout (show after 3 seconds)

```
⏱️ *Taking longer than usual...*

Polymarket's API is slow right now. Give me a sec.

[Loading...]
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│    🔄 Try Again     │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

**Implementation:** Edit this message with actual response when it arrives.

---

## API Down (show after 10 seconds)

```
😵 *Polymarket API is down*

Their servers aren't responding. This usually fixes itself in a few minutes.

I'll keep trying. Check back soon.
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│    🔄 Try Again     │  📊 Cached Trending │
├─────────────────────┴─────────────────────┤
│               🏠 Home                     │
└───────────────────────────────────────────┘
```

---

# 5. UPSELL MESSAGE TEMPLATES

## Alert Limit Reached (3/3 free)

**Trigger:** Free user tries to set 4th alert

```
🔔 *Alert Limit Reached*

You've used *3/3* free alerts.

Premium gets you:
• ♾️ *Unlimited alerts* on any market
• 🐋 *Whale alerts* — know when big money moves
• ☀️ *Morning briefings* — daily market digest
• 💼 *Portfolio tracking* — unlimited positions with P&L

Just *$9.99/month* — less than one good trade.
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│   ⭐ Upgrade Now    │   📋 Manage Alerts  │
├─────────────────────┴─────────────────────┤
│               🏠 Home                     │
└───────────────────────────────────────────┘
```

---

## Watchlist Limit Reached (3/3 free)

**Trigger:** Free user tries to add 4th watchlist item

```
👀 *Watchlist Full*

You're watching *3/3* markets (free limit).

Premium gets you:
• ♾️ *Unlimited watchlist* — track every market you care about
• ☀️ *Daily briefing* on all your watched markets
• 📊 *Price change alerts* on watchlist items
• 🐋 *Whale alerts* — big money movement notifications

Just *$9.99/month* — cancel anytime.
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│   ⭐ Upgrade Now    │  📋 Edit Watchlist  │
├─────────────────────┴─────────────────────┤
│               🏠 Home                     │
└───────────────────────────────────────────┘
```

---

## Portfolio Limit Reached (1 free position)

**Trigger:** Free user tries to add 2nd position

```
💼 *Portfolio Limit Reached*

Free tier tracks *1 position*. You're already tracking:
• {CURRENT_POSITION_TITLE}

Premium gets you:
• ♾️ *Unlimited positions* — track your whole portfolio
• 📈 *P&L tracking* — see gains/losses in real-time
• 🔔 *P&L alerts* — know when positions move big
• 📊 *Portfolio analytics* — charts and insights

Just *$9.99/month* — pays for itself in one good trade.
```

### Buttons
```
┌─────────────────────┬─────────────────────┐
│   ⭐ Upgrade Now    │   💼 View Position  │
├─────────────────────┴─────────────────────┤
│               🏠 Home                     │
└───────────────────────────────────────────┘
```

---

## Post-Upgrade Welcome

**Trigger:** Immediately after successful Stripe payment

```
🎉 *Welcome to PolyPulse Premium!*

You just unlocked:
• ♾️ Unlimited alerts & watchlist
• 🐋 Whale alerts (big money tracking)
• ☀️ Morning briefings
• 💼 Full portfolio tracking
• 📊 Advanced analytics

Let's set you up:
```

### Buttons
```
┌─────────────────────────┬─────────────────────────┐
│ ☀️ Set Up Morning Briefing │ 🐋 Enable Whale Alerts │
├─────────────────────────┼─────────────────────────┤
│  💼 Start Tracking Portfolio │ 🔍 Browse Markets    │
├─────────────────────────┴─────────────────────────┤
│                     🏠 Home                       │
└───────────────────────────────────────────────────┘
```

**Critical:** This is the key activation moment. Guide user to USE premium features immediately.

---

# 6. POST-ACTION SUGGESTIONS

Every response must include relevant next actions. Never leave user at dead end.

## Pattern: After Setting Alert
```
BUTTONS: [📋 View All Alerts] [🔔 Set Another] [📊 Check Trending] [🏠 Home]
```

## Pattern: After Checking Price
```
BUTTONS: [🔔 Set Alert] [👀 Add to Watchlist] [💰 Log Position] [🔍 Browse More]
```

## Pattern: After Adding to Watchlist
```
BUTTONS: [📋 View Watchlist] [🔔 Set Alert] [🔍 Browse More] [🏠 Home]
```

## Pattern: After Logging Position
```
BUTTONS: [💼 View Portfolio] [📊 Market Details] [🔔 Set Alert] [➕ Log Another]
```

## Pattern: After Viewing Trending
```
INLINE per-market: [🔔] [👀] buttons (if space allows)
BOTTOM: [🔄 Refresh] [🔍 Browse] [🏠 Home]
```

## Pattern: After Any Error
```
BUTTONS: [🔍 Browse] [🔥 Trending] [❓ Help] [🏠 Home]
```

## Pattern: After Viewing Category Markets
```
INLINE: Number buttons for each market
BOTTOM: [⬅️ Categories] [➡️ More]
```

## Button Priority Rules
1. Most important action = leftmost position
2. Always include 🏠 Home as escape route
3. Max 4 buttons per row (Telegram limit)
4. Context-aware: show relevant next actions, not all actions

---

# 7. SMART TEXT HANDLING

When user types bare text (no / command), handle intelligently:

## Market Keyword Detection
**Trigger:** User types recognized keyword like "bitcoin", "trump", "ethereum"

```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES ({CHANGE_EMOJI}{CHANGE}% today)

Want to:
```

```
┌─────────────────────┬─────────────────────┐
│    📈 Track It      │    🔔 Set Alert     │
├─────────────────────┼─────────────────────┤
│   💰 Log Position   │   📊 Full Details   │
└─────────────────────┴─────────────────────┘
```

**Match priority:** exact match > starts with > contains

---

## Trending Intent
**Triggers:** "what's hot", "what's trending", "what's moving", "top markets"

**Action:** Treat as /trending, show trending response

---

## Help Intent
**Triggers:** "help", "how", "what can you do", "commands", "?"

**Action:** Show help message with command list + browse buttons

---

## Stop Intent
**Triggers:** "stop", "cancel", "unsubscribe", "turn off"

```
⚙️ *Notification Settings*

What would you like to manage?
```

```
┌─────────────────────┬─────────────────────┐
│   🔔 Manage Alerts  │  👀 Edit Watchlist  │
├─────────────────────┼─────────────────────┤
│ ☀️ Briefing Settings │ 🐋 Whale Settings   │
├─────────────────────┼─────────────────────┤
│  🚫 Unsubscribe All │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

---

## Unrecognized Input
**Trigger:** Anything that doesn't match above patterns

```
🤔 I didn't catch that.

Try typing a market name like "bitcoin" or use the buttons below:
```

```
┌─────────────────────┬─────────────────────┐
│     🔥 Trending     │     🔍 Browse       │
├─────────────────────┼─────────────────────┤
│       ❓ Help       │      🏠 Home        │
└─────────────────────┴─────────────────────┘
```

**Never a dead end.** Log unrecognized inputs for improvement.

---

# 8. IMPLEMENTATION NOTES

## Callback Data Convention
```javascript
// Commands
"cmd_trending"
"cmd_start"
"cmd_portfolio"
"cmd_upgrade"
"cmd_alerts"
"cmd_watchlist"
"cmd_help"

// Categories
"browse_categories"
"cat_crypto"
"cat_us_politics"
"cat_world_politics"
"cat_tech"
"cat_economics"
"cat_sports"
"cat_entertainment"
"cat_science"
"cat_legal"
"cat_health"

// Pagination
"cat_crypto_page_2"
"cat_crypto_page_3"

// Market actions
"market_{id}"
"alert_market_{id}"
"watch_market_{id}"
"buy_market_{id}"
"details_market_{id}"

// Alert thresholds
"alert_set_{id}_25"
"alert_set_{id}_50"
"alert_set_{id}_75"
"alert_set_{id}_up5"
"alert_set_{id}_down5"
"alert_custom_{id}"
"alert_delete_{n}"

// Position flow
"position_side_{id}_yes"
"position_side_{id}_no"
"position_shares_{id}_{side}_{amount}"
"position_price_{id}_{side}_{shares}_current"
```

## State Machine for Multi-Step Flows
```javascript
const USER_STATE = {
  awaiting_shares: "awaiting_shares_{market_id}_{side}",
  awaiting_price: "awaiting_price_{market_id}_{side}_{shares}",
  awaiting_alert_threshold: "awaiting_alert_threshold_{market_id}"
};

// Clear state after 5 minutes of inactivity
```

## Response Time Requirements
- **Target:** < 1 second for all responses
- **At 2 seconds:** Show ⏳ loading message
- **At 10 seconds:** Show error with retry option
- **Always:** Set typing indicator ON while processing

## Telegram Formatting
```javascript
// Use MarkdownV2
// Escape: . - ( ) ! > # + = | { } 
// *bold* _italic_ `code` 

// Max message length: 4096 chars
// Max buttons per row: 8 (but prefer 2-4 for usability)
// Max button rows: 100 (but prefer 4-6)
```

## Free vs Premium Limits
```javascript
const LIMITS = {
  free: {
    alerts: 3,
    watchlist: 3,
    positions: 1,
    whaleAlerts: false,
    morningBriefing: false
  },
  premium: {
    alerts: Infinity,
    watchlist: Infinity,
    positions: Infinity,
    whaleAlerts: true,
    morningBriefing: true
  }
};
```

---

**END OF SPEC**

**File:** `/Users/albert/clawd/polypulse/POLYPULSE_UX_DESIGNS.md`  
**Completed:** Feb 7, 2026 @ 7:58 AM CST  
**Status:** Ready for Isaiah to implement word-for-word  

*— Raphael, Design Director*
