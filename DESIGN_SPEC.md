# POLYPULSE DESIGN SPEC
## Complete Template Reference for Isaiah

This document contains exact specifications for every message, button, and flow in PolyPulse.
Copy these templates exactly. Do not improvise copy.

---

# 1. ONBOARDING

## [START_WELCOME]
────────────────
TEXT:
```
📊 *PolyPulse* — Real-time Polymarket intelligence

Track odds, set alerts, and spot opportunities before they move.

What would you like to do?
```

BUTTONS:
```
Row 1: [🔥 Trending Markets](cmd_trending) [🔍 Browse Categories](browse_categories)
Row 2: [💰 My Portfolio](cmd_portfolio) [⭐ Go Premium](cmd_upgrade)
```

NOTES:
- This is the ONLY response to /start
- No walls of text. User gets value in ONE TAP
- Track user's first_seen timestamp on /start for analytics
- If user is premium, change "Go Premium" to "⭐ Premium Active"

---

# 2. CATEGORY BROWSING

## [CATEGORIES_MENU]
────────────────
TEXT:
```
🔍 *Browse Categories*

Tap a category to explore markets:
```

BUTTONS:
```
Row 1: [🪙 Crypto](cat_crypto) [🏛️ US Politics](cat_us_politics)
Row 2: [🌍 World Politics](cat_world_politics) [💻 Tech](cat_tech)
Row 3: [📈 Economics](cat_economics) [⚽ Sports](cat_sports)
Row 4: [🎬 Entertainment](cat_entertainment) [🔬 Science](cat_science)
Row 5: [⚖️ Legal](cat_legal) [🏥 Health](cat_health)
Row 6: [🏠 Home](cmd_start)
```

NOTES:
- Category callback_data format: cat_{category_slug}
- Always include Home button to return to /start
- This menu is triggered by browse_categories callback OR /categories command

---

## [CATEGORY_MARKETS]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [1️⃣](market_{id_1}) [2️⃣](market_{id_2}) [3️⃣](market_{id_3}) [4️⃣](market_{id_4}) [5️⃣](market_{id_5})
Row 2: [⬅️ Categories](browse_categories) [➡️ More](cat_{slug}_page_2)
```

NOTES:
- Fetch top 5 markets from Polymarket API sorted by 24h volume
- Market IDs in callback data for quick selection
- Paginate with offset: cat_{slug}_page_{n}
- Volume formatting: <1K = exact, 1K-999K = {n}K, 1M+ = {n.n}M
- Truncate market titles to 40 chars with ellipsis if needed

---

## [MARKET_DETAIL]
────────────────
TEXT:
```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES · *{NO_PRICE}%* NO
{PRICE_CHANGE_EMOJI} {PRICE_CHANGE}% today

📈 Volume: *${TOTAL_VOLUME}*
💧 Liquidity: *${LIQUIDITY}*
⏰ Closes: *{END_DATE}*

{DESCRIPTION_FIRST_100_CHARS}...
```

BUTTONS:
```
Row 1: [🔔 Set Alert](alert_market_{id}) [👀 Watch](watch_market_{id})
Row 2: [💰 Log Position](buy_market_{id}) [📊 Full Details](details_market_{id})
Row 3: [⬅️ Back](cat_{category_slug})
```

NOTES:
- PRICE_CHANGE_EMOJI: 📈 if positive, 📉 if negative, ➡️ if zero
- Always show Back button to return to category
- "Full Details" opens Polymarket link in browser
- If user already watching, change "Watch" to "✅ Watching"
- If user has alert, change "Set Alert" to "✅ Alert Set"

---

# 3. COMMAND TEMPLATES

## [PRICE_RESPONSE]
────────────────
TEXT:
```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES · *{NO_PRICE}%* NO
{PRICE_CHANGE_EMOJI} {PRICE_CHANGE}% in 24h

📈 Vol: ${VOLUME_24H} (24h) · ${TOTAL_VOLUME} total
🐋 {WHALE_COUNT} whale trades today
```

BUTTONS:
```
Row 1: [🔔 Set Alert](alert_market_{id}) [👀 Add to Watchlist](watch_market_{id})
Row 2: [💰 Log Position](buy_market_{id}) [🔍 Browse More](browse_categories)
```

NOTES:
- Triggered by /price {market} OR tapping a market from any list
- If market not found, show [MARKET_NOT_FOUND] error
- Whale trades = trades > $1000 in 24h
- Always include action buttons - never dead ends

---

## [PRICE_BROWSE]
────────────────
TEXT:
```
📊 *Check Market Price*

Select a category to find your market:
```

BUTTONS:
```
Row 1: [🪙 Crypto](price_cat_crypto) [🏛️ US Politics](price_cat_us_politics)
Row 2: [🌍 World](price_cat_world_politics) [💻 Tech](price_cat_tech)
Row 3: [📈 Economics](price_cat_economics) [⚽ Sports](price_cat_sports)
Row 4: [🔥 Trending](cmd_trending) [🏠 Home](cmd_start)
```

NOTES:
- Shown when user sends /price with no argument
- Category callbacks for price flow: price_cat_{slug}
- After category selection, show [CATEGORY_MARKETS] with price-specific callbacks

---

## [ALERT_SET_SUCCESS]
────────────────
TEXT:
```
✅ *Alert Set!*

📊 {MARKET_TITLE}
🎯 Alert when: {CONDITION}

I'll notify you the moment it hits.
```

BUTTONS:
```
Row 1: [📋 View All Alerts](cmd_alerts) [🔔 Set Another](alert_browse)
Row 2: [📊 Check Trending](cmd_trending) [🏠 Home](cmd_start)
```

NOTES:
- CONDITION examples: "YES crosses 50%", "YES drops below 25%", "5% move either direction"
- Never leave user at dead end - always show next actions

---

## [ALERT_BROWSE]
────────────────
TEXT:
```
🔔 *Set Price Alert*

Select a category to find your market:
```

BUTTONS:
```
Row 1: [🪙 Crypto](alert_cat_crypto) [🏛️ US Politics](alert_cat_us_politics)
Row 2: [🌍 World](alert_cat_world_politics) [💻 Tech](alert_cat_tech)
Row 3: [📈 Economics](alert_cat_economics) [⚽ Sports](alert_cat_sports)
Row 4: [📋 My Watchlist](alert_from_watchlist) [🏠 Home](cmd_start)
```

NOTES:
- Shown when user sends /alert with no argument
- "My Watchlist" shows user's watched markets as alert options

---

## [ALERT_THRESHOLD_SELECT]
────────────────
TEXT:
```
🔔 *Set Alert for:*
📊 {MARKET_TITLE}

Current price: *{YES_PRICE}%* YES

Alert me when YES reaches:
```

BUTTONS:
```
Row 1: [25%](alert_set_{id}_25) [50%](alert_set_{id}_50) [75%](alert_set_{id}_75)
Row 2: [⬆️ +5%](alert_set_{id}_up5) [⬇️ -5%](alert_set_{id}_down5)
Row 3: [✏️ Custom](alert_custom_{id}) [❌ Cancel](browse_categories)
```

NOTES:
- up5/down5 = relative to current price
- Custom prompts for specific number input
- Show current price for context

---

## [ALERTS_LIST]
────────────────
TEXT:
```
🔔 *Your Alerts* ({COUNT}/{MAX})

{ALERT_1_EMOJI} *{MARKET_1}*
   └ Alert at {THRESHOLD_1}% (now {CURRENT_1}%)

{ALERT_2_EMOJI} *{MARKET_2}*
   └ Alert at {THRESHOLD_2}% (now {CURRENT_2}%)

{ALERT_3_EMOJI} *{MARKET_3}*
   └ Alert at {THRESHOLD_3}% (now {CURRENT_3}%)
```

BUTTONS:
```
Row 1: [❌ 1](alert_delete_1) [❌ 2](alert_delete_2) [❌ 3](alert_delete_3)
Row 2: [🔔 Add Alert](alert_browse) [🏠 Home](cmd_start)
```

NOTES:
- ALERT_EMOJI: 🔴 if within 5% of threshold, 🟡 if within 10%, 🟢 otherwise
- Show current price vs threshold to show proximity
- Delete buttons inline with each alert
- Free users: MAX=3, Premium: MAX=unlimited (show "∞")

---

## [WATCH_ADD_SUCCESS]
────────────────
TEXT:
```
👀 *Added to Watchlist!*

📊 {MARKET_TITLE}
📍 Added at {YES_PRICE}% YES

I'll include this in your daily updates.
```

BUTTONS:
```
Row 1: [📋 View Watchlist](cmd_watchlist) [🔔 Set Alert](alert_market_{id})
Row 2: [🔍 Browse More](browse_categories) [🏠 Home](cmd_start)
```

NOTES:
- Track "added at" price for P&L display later
- Daily updates only for premium users (mention this if free)

---

## [WATCHLIST_VIEW]
────────────────
TEXT:
```
👀 *Your Watchlist* ({COUNT}/{MAX})

1️⃣ *{MARKET_1}*
   └ {PRICE_1}% YES · {CHANGE_1_EMOJI}{CHANGE_1}% since added

2️⃣ *{MARKET_2}*
   └ {PRICE_2}% YES · {CHANGE_2_EMOJI}{CHANGE_2}% since added

3️⃣ *{MARKET_3}*
   └ {PRICE_3}% YES · {CHANGE_3_EMOJI}{CHANGE_3}% since added
```

BUTTONS:
```
Row 1: [1️⃣](market_{id_1}) [2️⃣](market_{id_2}) [3️⃣](market_{id_3})
Row 2: [➕ Add More](browse_categories) [🏠 Home](cmd_start)
```

NOTES:
- Show price change since user added to watchlist
- Tap number to see market detail
- Free: MAX=3, Premium: MAX=unlimited

---

## [TRENDING_RESPONSE]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [1️⃣](market_{id_1}) [2️⃣](market_{id_2}) [3️⃣](market_{id_3}) [4️⃣](market_{id_4}) [5️⃣](market_{id_5})
Row 2: [🔄 Refresh](cmd_trending) [🔍 Browse](browse_categories) [🏠 Home](cmd_start)
```

NOTES:
- Sort by absolute price change in 24h
- CHANGE_EMOJI: 📈 green for up, 📉 red for down
- 🐋 count = whale trades (>$1000) in 24h
- Cache for 5 min, show refresh button

---

## [WHALE_ALERT]
────────────────
TEXT:
```
🐋 *Whale Alert!*

📊 *{MARKET_TITLE}*

💰 *${TRADE_SIZE}* {SIDE} @ {PRICE}%
👤 Wallet: `{WALLET_SHORT}`

Market moved *{PRICE_CHANGE}%* after this trade.

Current: *{CURRENT_PRICE}%* YES
```

BUTTONS:
```
Row 1: [📊 View Market](market_{id}) [🔔 Set Alert](alert_market_{id})
Row 2: [👀 Watch](watch_market_{id}) [🔇 Mute This Market](mute_whale_{id})
```

NOTES:
- SIDE = "bought YES" or "bought NO"
- WALLET_SHORT = first 6 + last 4 chars of address
- Only sent to premium users with whale alerts enabled
- Threshold: trades > $10,000

---

## [WHALE_SETTINGS]
────────────────
TEXT:
```
🐋 *Whale Alert Settings*

Get notified when big money moves.

Current settings:
• Minimum trade size: *${MIN_SIZE}*
• Categories: {ENABLED_CATEGORIES}
• Status: {ON_OFF_EMOJI} {STATUS}
```

BUTTONS:
```
Row 1: [{TOGGLE_EMOJI} {TOGGLE_TEXT}](whale_toggle)
Row 2: [💰 Min: $5K](whale_min_5000) [💰 Min: $10K](whale_min_10000) [💰 Min: $50K](whale_min_50000)
Row 3: [🔍 Filter Categories](whale_categories) [🏠 Home](cmd_start)
```

NOTES:
- Premium only - show upsell if free user
- TOGGLE: "🔔 Turn On" / "🔕 Turn Off"
- Default min: $10K

---

## [PORTFOLIO_VIEW]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [1️⃣](position_{id_1}) [2️⃣](position_{id_2}) [3️⃣](position_{id_3})
Row 2: [➕ Log Position](buy_browse) [🔄 Refresh](cmd_portfolio)
Row 3: [📊 P&L Chart](portfolio_chart) [🏠 Home](cmd_start)
```

NOTES:
- PNL_EMOJI: 📈 green if positive, 📉 red if negative
- Prices in cents (Polymarket standard)
- Free users: 1 position max, Premium: unlimited
- "P&L Chart" = premium feature, show upsell if free

---

## [PORTFOLIO_ADD_POSITION]
────────────────
TEXT:
```
💰 *Log Position*

📊 *{MARKET_TITLE}*

Current price: *{YES_PRICE}%* YES / *{NO_PRICE}%* NO

Which side did you buy?
```

BUTTONS:
```
Row 1: [✅ YES](position_side_{id}_yes) [❌ NO](position_side_{id}_no)
Row 2: [⬅️ Back](market_{id}) [❌ Cancel](cmd_portfolio)
```

NOTES:
- Step 1 of 3-step flow: Side → Shares → Price
- After side selection, ask for shares (conversational, not command)

---

## [PORTFOLIO_ASK_SHARES]
────────────────
TEXT:
```
💰 *Log {SIDE} Position*

📊 {MARKET_TITLE}

How many shares did you buy?

_(Just type the number)_
```

BUTTONS:
```
Row 1: [100](position_shares_{id}_{side}_100) [500](position_shares_{id}_{side}_500) [1000](position_shares_{id}_{side}_1000)
Row 2: [❌ Cancel](cmd_portfolio)
```

NOTES:
- Offer common amounts as quick buttons
- Accept bare number as text input
- Set conversation state to expect shares input

---

## [PORTFOLIO_ASK_PRICE]
────────────────
TEXT:
```
💰 *Log {SIDE} Position*

📊 {MARKET_TITLE}
📦 {SHARES} shares

What price did you pay per share? (in cents)

Current price: *{CURRENT_PRICE}¢*
```

BUTTONS:
```
Row 1: [Current: {CURRENT}¢](position_price_{id}_{side}_{shares}_current)
Row 2: [❌ Cancel](cmd_portfolio)
```

NOTES:
- Suggest current price as default
- Accept bare number as text input
- After this, save position and show [PORTFOLIO_ADD_SUCCESS]

---

## [PORTFOLIO_ADD_SUCCESS]
────────────────
TEXT:
```
✅ *Position Logged!*

📊 {MARKET_TITLE}
📦 {SHARES} {SIDE} @ {PRICE}¢

Current value: *${CURRENT_VALUE}*
P&L: {PNL_EMOJI} *${PNL}* ({PNL_PCT}%)

I'll track this for you.
```

BUTTONS:
```
Row 1: [💼 View Portfolio](cmd_portfolio) [📊 Market Details](market_{id})
Row 2: [🔔 Set Alert](alert_market_{id}) [➕ Log Another](buy_browse)
```

NOTES:
- Calculate P&L immediately based on current price
- Premium users get P&L alerts when position moves significantly

---

## [PREDICT_PROMPT]
────────────────
TEXT:
```
🎯 *Make a Prediction*

📊 *{MARKET_TITLE}*

Current odds: *{YES_PRICE}%* YES / *{NO_PRICE}%* NO
📈 {CHANGE_EMOJI} {CHANGE}% in 24h

What's your call?
```

BUTTONS:
```
Row 1: [✅ YES](predict_{id}_yes) [❌ NO](predict_{id}_no)
Row 2: [⬅️ Back](cmd_trending) [❌ Skip](predict_next)
```

NOTES:
- Part of prediction game / leaderboard system
- After prediction, show [PREDICT_CONFIRMED]

---

## [PREDICT_CONFIRMED]
────────────────
TEXT:
```
🎯 *Prediction Recorded!*

📊 {MARKET_TITLE}
🗳️ Your call: *{SIDE}* (at {PRICE}%)

You'll earn points when this resolves.
Current streak: 🔥 {STREAK} correct

Your rank: #{RANK} of {TOTAL_PLAYERS}
```

BUTTONS:
```
Row 1: [🎯 Predict Another](predict_browse) [🏆 Leaderboard](cmd_leaderboard)
Row 2: [📊 My Stats](predict_stats) [🏠 Home](cmd_start)
```

NOTES:
- Points: +10 for correct, -5 for wrong, +5 bonus per streak
- Track prediction timestamp and price at time of prediction

---

## [LEADERBOARD_VIEW]
────────────────
TEXT:
```
🏆 *Prediction Leaderboard*

Top predictors this week:

🥇 *{USER_1}* — {POINTS_1} pts ({ACCURACY_1}% accuracy)
🥈 *{USER_2}* — {POINTS_2} pts ({ACCURACY_2}% accuracy)
🥉 *{USER_3}* — {POINTS_3} pts ({ACCURACY_3}% accuracy)
4️⃣ {USER_4} — {POINTS_4} pts
5️⃣ {USER_5} — {POINTS_5} pts
6️⃣ {USER_6} — {POINTS_6} pts
7️⃣ {USER_7} — {POINTS_7} pts
8️⃣ {USER_8} — {POINTS_8} pts
9️⃣ {USER_9} — {POINTS_9} pts
🔟 {USER_10} — {POINTS_10} pts

━━━━━━━━━━━━━━━
Your rank: *#{USER_RANK}* ({USER_POINTS} pts)
```

BUTTONS:
```
Row 1: [🎯 Make Prediction](predict_browse) [📊 My Stats](predict_stats)
Row 2: [📅 All-Time](leaderboard_alltime) [📆 This Month](leaderboard_month)
Row 3: [🏠 Home](cmd_start)
```

NOTES:
- Username display: first 15 chars, anonymize if needed
- Highlight current user's row if in top 10
- Different time periods available

---

# 4. ERROR TEMPLATES

## [ERROR_MARKET_NOT_FOUND]
────────────────
TEXT:
```
❌ *Market not found*

I couldn't find a market matching "{QUERY}".

Try browsing by category instead:
```

BUTTONS:
```
Row 1: [🔍 Browse Categories](browse_categories) [🔥 Trending](cmd_trending)
Row 2: [❓ Help](cmd_help) [🏠 Home](cmd_start)
```

NOTES:
- Log failed searches for analytics
- Never a dead end - always offer alternatives
- QUERY = user's original search text

---

## [ERROR_API_TIMEOUT]
────────────────
TEXT:
```
⏱️ *Taking longer than usual...*

Polymarket's API is slow right now. Give me a sec.

[Loading...]
```

BUTTONS:
```
Row 1: [🔄 Try Again](retry_{original_action}) [🏠 Home](cmd_start)
```

NOTES:
- Show this after 3 seconds of waiting
- Edit message with actual response when it arrives
- If still failing after 10 seconds, show [ERROR_API_DOWN]

---

## [ERROR_API_DOWN]
────────────────
TEXT:
```
😵 *Polymarket API is down*

Their servers aren't responding. This usually fixes itself in a few minutes.

I'll keep trying. Check back soon.
```

BUTTONS:
```
Row 1: [🔄 Try Again](retry_{original_action}) [📊 Cached Trending](trending_cached)
Row 2: [🏠 Home](cmd_start)
```

NOTES:
- Show cached data if available
- Log outage for monitoring
- Don't retry automatically more than 3 times

---

## [ERROR_RATE_LIMITED]
────────────────
TEXT:
```
🐢 *Slow down!*

You're sending requests too fast. Wait a few seconds and try again.

_(This protects everyone's experience)_
```

BUTTONS:
```
Row 1: [🏠 Home](cmd_start)
```

NOTES:
- Rate limit: 30 requests per minute per user
- Log rate limit hits for abuse detection
- No action buttons that would trigger more requests

---

## [ERROR_INVALID_INPUT]
────────────────
TEXT:
```
🤔 *I didn't understand that*

{SPECIFIC_ERROR}

Try again or browse markets instead:
```

BUTTONS:
```
Row 1: [🔍 Browse](browse_categories) [🔥 Trending](cmd_trending)
Row 2: [❓ Help](cmd_help) [🏠 Home](cmd_start)
```

NOTES:
- SPECIFIC_ERROR examples:
  - "Alert threshold must be between 1-99%"
  - "Number of shares must be a positive number"
  - "That doesn't look like a valid market name"
- Always explain what went wrong specifically

---

# 5. UPSELL TEMPLATES

## [UPSELL_ALERT_LIMIT]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [⭐ Upgrade Now](cmd_upgrade) [📋 Manage Alerts](cmd_alerts)
Row 2: [🏠 Home](cmd_start)
```

NOTES:
- Triggered when free user tries to set 4th alert
- Always offer alternative action (manage existing alerts)
- Emphasize value, not restriction

---

## [UPSELL_WATCHLIST_LIMIT]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [⭐ Upgrade Now](cmd_upgrade) [📋 Edit Watchlist](cmd_watchlist)
Row 2: [🏠 Home](cmd_start)
```

NOTES:
- Triggered when free user tries to add 4th watchlist item
- Always offer to edit existing watchlist

---

## [UPSELL_PORTFOLIO_LIMIT]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [⭐ Upgrade Now](cmd_upgrade) [💼 View Position](cmd_portfolio)
Row 2: [🏠 Home](cmd_start)
```

NOTES:
- Triggered when free user tries to add 2nd position
- Show their current tracked position

---

## [UPSELL_WHALE_ALERTS]
────────────────
TEXT:
```
🐋 *Whale Alerts — Premium Feature*

Get instant notifications when big money moves:
• Trades over *$10,000* detected in real-time
• See which markets whales are betting on
• Know before the crowd

This is how smart money stays ahead.
```

BUTTONS:
```
Row 1: [⭐ Unlock for $9.99/mo](cmd_upgrade)
Row 2: [🔥 Trending (Free)](cmd_trending) [🏠 Home](cmd_start)
```

NOTES:
- Triggered when free user tries /whale
- Position as "smart money" feature

---

## [UPSELL_MORNING_BRIEFING]
────────────────
TEXT:
```
☀️ *Morning Briefing — Premium Feature*

Wake up to market intelligence:
• 📊 Overnight moves on your watchlist
• 🐋 Whale activity summary
• 🔥 Top trending markets
• 📈 Your portfolio P&L update

Delivered fresh at *8 AM* your time.
```

BUTTONS:
```
Row 1: [⭐ Unlock for $9.99/mo](cmd_upgrade)
Row 2: [🔥 Trending (Free)](cmd_trending) [🏠 Home](cmd_start)
```

NOTES:
- Triggered when free user tries /briefing or asks for daily updates
- Emphasize convenience and time-saving

---

## [UPGRADE_SUCCESS]
────────────────
TEXT:
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

BUTTONS:
```
Row 1: [☀️ Set Up Morning Briefing](briefing_setup) [🐋 Enable Whale Alerts](whale_settings)
Row 2: [💼 Start Tracking Portfolio](buy_browse) [🔍 Browse Markets](browse_categories)
Row 3: [🏠 Home](cmd_start)
```

NOTES:
- Show immediately after successful Stripe payment
- Guide user to USE the premium features right away
- This is a key activation moment

---

# 6. POST-ACTION SUGGESTION TEMPLATES

These are appended to action confirmations. Already shown in individual templates above, but listing patterns here for consistency:

## Pattern: After Setting Alert
```
BUTTONS:
[📋 View All Alerts] [🔔 Set Another] [📊 Check Trending]
```

## Pattern: After Checking Price
```
BUTTONS:
[🔔 Set Alert] [👀 Add to Watchlist] [💰 Log Position]
```

## Pattern: After Adding to Watchlist
```
BUTTONS:
[📋 View Watchlist] [🔔 Set Alert] [🔍 Browse More]
```

## Pattern: After Logging Position
```
BUTTONS:
[💼 View Portfolio] [📊 Check P&L] [➕ Log Another]
```

## Pattern: After Viewing Trending
```
Inline per-market: [🔔] [👀] buttons
Bottom: [🔄 Refresh] [🔍 Browse] [🏠 Home]
```

## Pattern: After Any Error
```
BUTTONS:
[🔍 Browse] [🔥 Trending] [❓ Help] [🏠 Home]
```

NOTES:
- Never leave user at dead end
- Every response suggests 2-4 logical next actions
- Most important action = first button position

---

# 7. MORNING BRIEFING TEMPLATE

## [MORNING_BRIEFING]
────────────────
TEXT:
```
☀️ *Good morning! Here's your market briefing*
_{DATE}_

━━━━━━━━━━━━━━━━━━━━━━

📊 *Your Watchlist*

{WATCH_1}: *{PRICE_1}%* ({CHANGE_1_EMOJI}{CHANGE_1}%)
{WATCH_2}: *{PRICE_2}%* ({CHANGE_2_EMOJI}{CHANGE_2}%)
{WATCH_3}: *{PRICE_3}%* ({CHANGE_3_EMOJI}{CHANGE_3}%)

💼 *Portfolio Update*
Total Value: *${TOTAL_VALUE}* ({PNL_EMOJI}{PNL_DAILY}% today)

🐋 *Overnight Whale Activity*
• ${WHALE_1_SIZE} on {WHALE_1_MARKET}
• ${WHALE_2_SIZE} on {WHALE_2_MARKET}

🔥 *Trending Now*
1. {TREND_1} — {TREND_1_PRICE}% ({TREND_1_CHANGE})
2. {TREND_2} — {TREND_2_PRICE}% ({TREND_2_CHANGE})
3. {TREND_3} — {TREND_3_PRICE}% ({TREND_3_CHANGE})

━━━━━━━━━━━━━━━━━━━━━━

Have a profitable day! 📈
```

BUTTONS:
```
Row 1: [📊 Full Portfolio](cmd_portfolio) [🔥 More Trending](cmd_trending)
Row 2: [⚙️ Briefing Settings](briefing_settings) [🏠 Home](cmd_start)
```

NOTES:
- Sent at user's configured time (default 8 AM local)
- Premium only feature
- Omit sections if empty (e.g., no watchlist = skip that section)
- Keep under 4096 chars (Telegram limit)

---

## [BRIEFING_SETTINGS]
────────────────
TEXT:
```
⚙️ *Morning Briefing Settings*

Current schedule: *{TIME}* {TIMEZONE}
Status: {ON_OFF_EMOJI} *{STATUS}*

What to include:
{CHECK_WATCHLIST} Watchlist updates
{CHECK_PORTFOLIO} Portfolio P&L
{CHECK_WHALES} Overnight whale activity
{CHECK_TRENDING} Top trending markets
```

BUTTONS:
```
Row 1: [{TOGGLE_EMOJI} {TOGGLE_TEXT}](briefing_toggle)
Row 2: [🕐 Change Time](briefing_time) [🌍 Change Timezone](briefing_tz)
Row 3: [✏️ Edit Sections](briefing_sections) [🏠 Home](cmd_start)
```

NOTES:
- CHECK marks: ✅ if enabled, ⬜ if disabled
- Time picker: offer common times (6 AM, 7 AM, 8 AM, 9 AM)
- Timezone detection: ask once on first setup

---

# 8. SMART TEXT HANDLING

For bare text input (no command), use these patterns:

## [BARE_TEXT_MARKET_MATCH]
────────────────
TRIGGER: User types a recognized market keyword (e.g., "bitcoin", "trump", "ethereum")

TEXT:
```
📊 *{MARKET_TITLE}*

*{YES_PRICE}%* YES ({CHANGE_EMOJI}{CHANGE}% today)

Want to:
```

BUTTONS:
```
Row 1: [📈 Track It](watch_market_{id}) [🔔 Set Alert](alert_market_{id})
Row 2: [💰 Log Position](buy_market_{id}) [📊 Full Details](market_{id})
```

NOTES:
- Fuzzy match on market titles
- If multiple matches, show top 3 as buttons
- Prioritize: exact match > starts with > contains

---

## [BARE_TEXT_HELP]
────────────────
TRIGGER: "help", "how", "what can you do", "commands", "?"

TEXT:
```
❓ *PolyPulse Help*

I track Polymarket odds in real-time. Here's what I can do:

*Find Markets*
• /trending — hottest markets now
• /price — check any market's odds
• Just type a market name like "bitcoin"

*Track Markets*
• /watch — add to your watchlist
• /alert — get notified on price moves
• /portfolio — track your positions

*Premium Features* ⭐
• /whale — big money alerts
• /briefing — morning market digest
• /upgrade — unlock all features

Tap below to get started:
```

BUTTONS:
```
Row 1: [🔥 Trending](cmd_trending) [🔍 Browse](browse_categories)
Row 2: [⭐ Go Premium](cmd_upgrade) [🏠 Home](cmd_start)
```

---

## [BARE_TEXT_STOP]
────────────────
TRIGGER: "stop", "cancel", "unsubscribe", "turn off", "disable", "pause"

TEXT:
```
⚙️ *Notification Settings*

What would you like to manage?
```

BUTTONS:
```
Row 1: [🔔 Manage Alerts](cmd_alerts) [👀 Edit Watchlist](cmd_watchlist)
Row 2: [☀️ Briefing Settings](briefing_settings) [🐋 Whale Settings](whale_settings)
Row 3: [🚫 Unsubscribe All](unsubscribe_confirm) [🏠 Home](cmd_start)
```

NOTES:
- "Unsubscribe All" requires confirmation before action
- Show all notification management options

---

## [BARE_TEXT_TRENDING_INTENT]
────────────────
TRIGGER: "what's hot", "what's trending", "what's moving", "top markets", "best markets"

RESPONSE: Treat as /trending — show [TRENDING_RESPONSE]

---

## [BARE_TEXT_UNRECOGNIZED]
────────────────
TRIGGER: Any text that doesn't match above patterns

TEXT:
```
🤔 I didn't catch that.

Try typing a market name like "bitcoin" or use the buttons below:
```

BUTTONS:
```
Row 1: [🔥 Trending](cmd_trending) [🔍 Browse](browse_categories)
Row 2: [❓ Help](cmd_help) [🏠 Home](cmd_start)
```

NOTES:
- Log unrecognized inputs for improvement
- Never leave user stuck
- Keep response short and helpful

---

# 9. NOTIFICATION TEMPLATES (Push)

## [ALERT_TRIGGERED]
────────────────
TEXT:
```
🔔 *Alert Triggered!*

📊 *{MARKET_TITLE}*

🎯 Hit your target: *{THRESHOLD}%*
📍 Current price: *{CURRENT_PRICE}%* YES

{CONTEXT_LINE}
```

BUTTONS:
```
Row 1: [📊 View Market](market_{id}) [🔔 Set New Alert](alert_market_{id})
Row 2: [💰 Log Position](buy_market_{id}) [📋 All Alerts](cmd_alerts)
```

NOTES:
- CONTEXT_LINE examples:
  - "Up 12% in the last hour!"
  - "Down 8% — 2 whale sells detected"
  - "This market is heating up 🔥"
- Add market context to make alert more actionable

---

## [POSITION_PNL_ALERT]
────────────────
TEXT:
```
📊 *Position Update*

💼 *{MARKET_TITLE}*

Your {SHARES} {SIDE} position:
• Entry: {ENTRY_PRICE}¢
• Now: {CURRENT_PRICE}¢
• P&L: {PNL_EMOJI} *${PNL}* ({PNL_PCT}%)

{CONTEXT_LINE}
```

BUTTONS:
```
Row 1: [📊 View Market](market_{id}) [💼 Full Portfolio](cmd_portfolio)
Row 2: [🔔 Set Alert](alert_market_{id})
```

NOTES:
- Trigger at ±10% move from entry
- Premium only
- CONTEXT_LINE: market news/movement context

---

# 10. IMPLEMENTATION NOTES FOR ISAIAH

## Callback Data Convention
- Commands: `cmd_{command}` (e.g., `cmd_trending`, `cmd_start`)
- Categories: `cat_{slug}` (e.g., `cat_crypto`, `cat_us_politics`)
- Markets: `market_{id}` (Polymarket slug or ID)
- Actions: `{action}_market_{id}` (e.g., `alert_market_bitcoin-100k`)
- Pagination: `{context}_page_{n}` (e.g., `cat_crypto_page_2`)

## Response Time Requirements
- Target: < 1 second for all responses
- If API slow: Show ⏳ loading message at 2 seconds, edit when ready
- If API down: Show error at 10 seconds
- Always set typing indicator ON while processing

## Message Formatting
- Use Telegram MarkdownV2: *bold*, `code`, _italic_
- Escape special chars: . - ( ) ! in MarkdownV2
- Max message length: 4096 chars
- Test all templates in actual Telegram before shipping

## State Machine
Track user state for multi-step flows:
- `awaiting_shares_{market_id}_{side}` — expecting shares number
- `awaiting_price_{market_id}_{side}_{shares}` — expecting price
- `awaiting_alert_threshold_{market_id}` — expecting custom threshold
- Clear state after 5 minutes of inactivity

## Error Handling Priority
1. Show user-friendly error with next actions
2. Log full error for debugging
3. Never show stack traces or technical errors to user
4. Always provide escape route (Home button minimum)

## Analytics Events to Track
- `start` — new user onboarding
- `category_browse` — which categories are popular
- `market_view` — which markets get attention
- `alert_set` — conversion to engagement
- `upgrade_shown` — upsell impressions
- `upgrade_completed` — revenue
- `search_failed` — what users can't find

---

*End of Design Spec*
*Version 1.0 — February 7, 2025*
*Author: Raphael (Design Director)*
