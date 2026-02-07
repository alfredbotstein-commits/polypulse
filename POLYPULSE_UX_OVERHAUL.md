# POLYPULSE UX OVERHAUL — Isaiah's Task List

Ship in this order. Every item must be tested on live before moving to the next.

---

## 1. ONBOARDING — /start is your landing page

Right now /start dumps a wall of text. Redesign it:
- Line 1: "📊 PolyPulse — Real-time Polymarket intelligence"
- Line 2: One sentence about what it does
- Then 4 buttons: [🔥 Trending Markets] [🔍 Browse Categories] [💰 My Portfolio] [⭐ Go Premium]
- User gets value in ONE TAP. No reading required.

---

## 2. COMPREHENSIVE CATEGORY BROWSING — users explore, not guess

Users should be able to find ANY market through buttons without typing a single word. A 5-year-old should be able to use this bot.

**Categories (inline keyboard grid):**

🪙 Crypto — Bitcoin, Ethereum, Solana, DeFi, regulations
🏛️ US Politics — elections, legislation, Supreme Court, cabinet
🌍 World Politics — international leaders, conflicts, treaties
💻 Tech — AI, product launches, IPOs, antitrust
📈 Economics — Fed rates, inflation, GDP, employment, recession
⚽ Sports — UFC, NFL, NBA, soccer, Olympics, F1
🎬 Entertainment — Oscars, box office, streaming, celebrity
🔬 Science — space, climate, breakthroughs, Nobel prizes
⚖️ Legal — court cases, regulations, indictments
🏥 Health — FDA approvals, pandemics, pharma

**Each category shows:** top 5-10 active markets sorted by volume. Pull from the real Polymarket API — never hardcode.

**Every market listing has inline action buttons:** [🔔 Alert] [👀 Watch] [💰 Buy] [📊 Details]

**The user journey:** /start → tap Browse Categories → tap a category → see markets → tap a market → take action. Zero typing required at any step.

**Navigation buttons on every category page:** [⬅️ Back to Categories] [➡️ More Markets]

---

## 3. BUTTON-DRIVEN COMMANDS — stop making users type market names

Every command that needs a market name must offer a browse path:

- **/alert** → show category buttons → user taps category → show top 5 markets → user taps market → show threshold presets [25%] [50%] [75%] [Custom] → alert set. Zero typing.
- **/watch** → same pattern. Browse categories, tap to add.
- **/price** → same. Browse or type — both work.
- **/buy** → show watchlist markets as buttons to select from, then ask shares and price conversationally (one question at a time, not `/buy market shares price`)
- **/subscribe** → show category buttons to tap
- **/predict** → show trending markets as buttons, tap to predict [YES ✅] [NO ❌]

**Rule:** Typing a market name still works for power users. But the button path must exist for everyone else. Both paths lead to the same result.

---

## 4. SMART RESPONSES TO BARE TEXT

Users will type things without commands. Handle them intelligently:

- User types "bitcoin" → "📊 Bitcoin > $100K: 73% YES (+4% today). Want to: [📈 Track it] [🔔 Set Alert] [💰 Buy Position]"
- User types "what's trending" → treat it like /trending
- User types "help" → treat it like /help
- User types "stop" or "cancel" or "unsubscribe" → show subscription management
- User types anything unrecognized → "I didn't catch that. Try: [🔥 Trending] [🔍 Browse] [❓ Help]" — never a dead end

---

## 5. POST-ACTION SUGGESTIONS — every response flows into the next thing

After every action, suggest what to do next with buttons:

- After setting an alert: "✅ Alert set! [📋 See all alerts] [🔔 Set another] [📊 Check trending]"
- After checking price: "[🔔 Set alert for this] [👀 Add to watchlist] [💰 Log a position]"
- After /trending: each market in the list has [🔔 Alert] [👀 Watch] buttons inline
- After /watch: "Added to watchlist! [📋 View watchlist] [🔔 Set alert] [🔍 Browse more]"
- After /buy: "Position logged! [💼 View portfolio] [📊 Check P&L] [💰 Log another]"
- After /upgrade: "Welcome to Premium! 🎉 Here's what you just unlocked: [☀️ Set up morning briefing] [🐋 Enable whale alerts] [📊 Browse categories]"

Never show data without an action. Never leave the user at a dead end.

---

## 6. CONTEXTUAL UPSELLS — helpful, not pushy

When a free user hits a limit, show exactly what they're missing:

- **Alert limit:** "You've used 3/3 free alerts. Premium gets you unlimited alerts PLUS 🐋 whale alerts, ☀️ morning briefings, and 💼 portfolio tracking. [⭐ Upgrade $9.99/mo] [📋 Manage alerts]"
- **Watchlist limit:** "Your watchlist is full (3/3). Premium = unlimited watchlist + daily briefing on all your markets. [⭐ Upgrade] [📋 Edit watchlist]"
- **Portfolio limit:** "Free tier tracks 1 position. Track unlimited positions + get P&L alerts with Premium. [⭐ Upgrade] [💼 View position]"

Always show the VALUE they'd get, not just "pay to unlock." Always include an alternative action so they're not stuck.

---

## 7. PERSONALITY, COPY & SPEED

**Voice:** Sharp trading buddy, not a corporate tool.
- Use language the audience uses: "odds shifted," "whale just dropped $120K," "this market is heating up"
- Add brief context to data: not just "73%" but "73% — up 4% since yesterday, 3 whale buys in 24h"
- Emoji as visual hierarchy, not decoration

**Speed:**
- Every response under 1 second
- If API call takes longer, show ⏳ immediately, then edit message with results when ready
- Typing indicator ON while processing
- Users leave after 3 seconds of silence. Never let that happen.

**Copy rules:**
- No walls of text. Scannable on mobile.
- Most important info first, details below.
- Bold the key numbers. Monospace for data.
- Every message fits on one phone screen without scrolling (except /portfolio with many positions).

---

## DEFINITION OF DONE

For each item above:
1. Built and deployed to production
2. Tested using the Hostile User Test Protocol from your IDENTITY.md
3. Tested the "new user" test — delete your data, /start, time yourself. Under 10 seconds to first useful data.
4. Every help example tested and working
5. Every error message includes what to do next
6. Committed with clear message
7. Reported to Alfred with proof

**The standard:** When a user opens PolyPulse for the first time, they should get value within 10 seconds and think "this is worth paying for" within 60 seconds. If that doesn't happen, you're not done.
