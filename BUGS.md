# PolyPulse Bug Tracker

## Open Bugs

### BUG-001: /search not using real Polymarket API
**Priority:** HIGH
**Reported:** 2026-02-06 23:10 CST
**Reporter:** Scott

**Issue:** `/search sports` returns "Couldn't find that market" — incorrect. "sports" is a valid search term and should return sports betting markets.

**Root Cause:** Search function matches against hardcoded list instead of actually querying Polymarket API.

**Expected Behavior:** /search should work with ANY keyword and return matching markets from Polymarket.

**Test Cases (all should return results):**
- /search sports
- /search AI
- /search trump
- /search bitcoin
- /search ethereum
- /search UFC
- /search NBA

**Status:** ✅ RESOLVED — 2026-02-06

**Fix:** Increased API limit from 200 to 500, added word-boundary matching, commit a4658ca

---

## Resolved Bugs

### BUG-001: /search not using real Polymarket API
**Resolved:** 2026-02-06
**Fix:** Updated `searchMarketsFulltext()` in polymarket.js to fetch 500 markets (API max) instead of 200, added proper word-boundary regex matching
