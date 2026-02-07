# Show HN Draft - PolyPulse

**FOR SCOTT'S REVIEW — DO NOT POST WITHOUT APPROVAL**

---

## Title Options (pick one):

1. **Show HN: I built a Telegram bot that tracks Polymarket odds in real-time**
2. Show HN: Real-time Polymarket alerts via Telegram
3. Show HN: A Telegram bot for prediction market tracking

**Recommended: #1** — hits the technical keywords (Telegram bot), the value prop (real-time), and the target (Polymarket).

---

## Post Text:

Hi HN,

I built a Telegram bot that pulls live odds from Polymarket and sends alerts when prices move.

**Why I built it:** I found myself refreshing Polymarket constantly during major events. Wanted a way to get notified on my phone without keeping tabs open.

**What it does:**
- `/price [query]` — search any market, get current odds
- `/trending` — see what's moving right now
- `/alert [market] [%]` — get pinged when odds shift by X%

**Technical notes:**
- Polls the Polymarket CLOB API every ~30 seconds
- Stores alerts in Supabase, processes via webhook
- Free tier has 3 alerts, premium unlocks unlimited ($9.99/mo)
- Built with Node.js + Grammy (Telegram framework)

**Try it:** https://t.me/GetPolyPulse_bot

I'm curious what other features would be useful. Thinking about:
- Wallet tracking ("alert me when X wallet enters a position")
- Market comparison views
- Discord integration

Would love feedback on the UX and any edge cases I haven't considered.

---

## Notes for Scott:

**Why this framing works:**
1. **Technical credibility** — mentions the stack, API, polling mechanism
2. **Personal story** — "I built it because I needed it" resonates on HN
3. **Honest about monetization** — premium tier is disclosed upfront
4. **Asks for feedback** — invites engagement, not just eyeballs
5. **Future roadmap** — shows it's actively developed

**Timing:**
- Best: Tuesday-Thursday, 8-10 AM EST
- Avoid: Weekends, holidays, major news days
- Consider checking HN front page for competition before posting

**One-shot considerations:**
- HN audience is skeptical of marketing. This needs to feel like a builder sharing, not a pitch.
- The comments matter as much as the post. Be ready to answer technical questions quickly.
- If it gains traction, respond to every comment in first 2-3 hours

**Risk factors:**
- Prediction markets can be politically sensitive
- Some HN users distrust crypto-adjacent projects
- Polymarket technically can't serve US users (regulatory gray area)

**Mitigations:**
- Keep focus on the technical build, not politics
- Don't hype or promise — just explain what it does
- Be honest if asked about Polymarket's legal status
