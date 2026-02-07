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

**Status:** OPEN — Assigned to Isaiah

---

## Resolved Bugs
(none yet)
