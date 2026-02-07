import axios from 'axios';

const GAMMA_URL = 'https://gamma-api.polymarket.com';
const REQUEST_TIMEOUT = 15000;

// Cache for API responses
const cache = {
  markets: { data: null, timestamp: 0 },
  events: { data: null, timestamp: 0 },
  tags: { data: null, timestamp: 0 },
};

// Cache TTLs (milliseconds)
const CACHE_TTL = {
  markets: 5 * 60 * 1000,   // 5 minutes
  events: 5 * 60 * 1000,    // 5 minutes
  tags: 60 * 60 * 1000,     // 1 hour
};

// Axios instance
const api = axios.create({
  baseURL: GAMMA_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'User-Agent': 'PolyPulse/2.0' },
});

/**
 * Get cached data or fetch fresh
 */
async function getCachedOrFetch(key, fetchFn) {
  const now = Date.now();
  if (cache[key].data && now - cache[key].timestamp < CACHE_TTL[key]) {
    return cache[key].data;
  }
  
  try {
    const data = await fetchFn();
    cache[key] = { data, timestamp: now };
    return data;
  } catch (err) {
    // Stale cache > no data
    if (cache[key].data) {
      console.warn(`Using stale ${key} cache:`, err.message);
      return cache[key].data;
    }
    throw err;
  }
}

/**
 * Fetch all active markets (cached) - with pagination to get more than 500
 */
async function fetchAllMarkets() {
  return getCachedOrFetch('markets', async () => {
    const allMarkets = [];
    let offset = 0;
    const limit = 500;
    const maxPages = 4; // Fetch up to 2000 markets
    
    for (let page = 0; page < maxPages; page++) {
      const response = await api.get('/markets', {
        params: { closed: false, active: true, limit, offset },
      });
      const markets = response.data;
      if (!markets || markets.length === 0) break;
      
      allMarkets.push(...markets);
      offset += limit;
      
      // If we got fewer than limit, we've reached the end
      if (markets.length < limit) break;
    }
    
    return allMarkets;
  });
}

/**
 * Fetch trending events sorted by volume (cached)
 */
async function fetchTrendingEvents(limit = 50) {
  return getCachedOrFetch('events', async () => {
    const response = await api.get('/events', {
      params: {
        closed: false,
        order: 'volume24hr',
        ascending: false,
        limit,
      },
    });
    return response.data;
  });
}

/**
 * Search markets - uses local search on cached markets
 * The /search API requires auth, so we search locally
 */
export async function searchMarketsFulltext(query, limit = 5) {
  return searchMarketsLocal(query, limit);
}

/**
 * Local search fallback (cached markets)
 */
async function searchMarketsLocal(query, limit = 5) {
  const markets = await fetchAllMarkets();
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  const scored = markets.map(m => {
    const question = (m.question || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();
    let score = 0;
    
    if (question.includes(queryLower)) score += 100;
    if (slug.includes(queryLower)) score += 50;
    
    for (const word of queryWords) {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      if (wordRegex.test(question)) score += 20;
      if (wordRegex.test(slug)) score += 10;
    }
    
    if (score > 0 && m.volume24hr) {
      score += Math.min(m.volume24hr / 100000, 10);
    }
    
    return { market: m, score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.market);
}

/**
 * Get trending markets by 24h volume
 */
export async function getTrendingMarkets(limit = 10) {
  const markets = await fetchAllMarkets();
  
  // Sort by 24h volume descending
  const sorted = [...markets].sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  
  return sorted.slice(0, limit);
}

/**
 * Get trending events (higher-level aggregation)
 */
export async function getTrendingEvents(limit = 10) {
  const events = await fetchTrendingEvents(limit);
  return events;
}

/**
 * Fetch tags from API (for dynamic categories)
 * GET https://gamma-api.polymarket.com/tags
 */
export async function fetchTags() {
  return getCachedOrFetch('tags', async () => {
    const response = await api.get('/tags');
    return response.data || [];
  });
}

/**
 * Get markets by tag ID from API
 * GET https://gamma-api.polymarket.com/markets?tag_id=X&closed=false&limit=Y
 */
export async function getMarketsByTagId(tagId, limit = 5, offset = 0) {
  try {
    const response = await api.get('/markets', {
      params: {
        tag_id: tagId,
        closed: false,
        limit: limit + offset, // Fetch enough for offset
        order: 'volume24hr',
        ascending: false,
      },
    });
    
    const markets = response.data || [];
    const paged = markets.slice(offset, offset + limit);
    
    return {
      markets: paged,
      total: markets.length >= limit + offset ? limit + offset + 10 : markets.length, // Estimate
      hasMore: markets.length >= limit + offset,
    };
  } catch (err) {
    console.error('getMarketsByTagId error:', err.message);
    return { markets: [], total: 0, hasMore: false };
  }
}

/**
 * Tag emoji mapping for popular tags
 */
export const TAG_EMOJIS = {
  'crypto': '🪙',
  'politics': '🏛️',
  'sports': '⚽',
  'entertainment': '🎬',
  'science': '🔬',
  'economics': '📈',
  'tech': '💻',
  'world': '🌍',
  'health': '🏥',
  'legal': '⚖️',
  'music': '🎵',
  'gaming': '🎮',
  'finance': '💵',
  'culture': '🎭',
  'business': '💼',
  'election': '🗳️',
  'ai': '🤖',
  'news': '📰',
};

/**
 * Get emoji for a tag name
 */
export function getTagEmoji(tagName) {
  const lower = (tagName || '').toLowerCase();
  
  // Check direct match
  if (TAG_EMOJIS[lower]) return TAG_EMOJIS[lower];
  
  // Check partial matches
  for (const [key, emoji] of Object.entries(TAG_EMOJIS)) {
    if (lower.includes(key) || key.includes(lower)) return emoji;
  }
  
  return '📊'; // Default
}

/**
 * Priority tags to show first (most popular/useful categories)
 */
const PRIORITY_TAGS = [
  'crypto', 'politics', 'sports', 'tech', 'business', 
  'economy', 'world', 'entertainment', 'finance', 'science',
  'ai', 'election', 'legal', 'health'
];

/**
 * Get popular tags from API, sorted by relevance
 * Returns tags suitable for the category browser
 */
export async function getPopularTags(limit = 10) {
  try {
    const allTags = await fetchTags();
    
    // Filter to tags with forceShow or in priority list
    const prioritized = [];
    const others = [];
    
    for (const tag of allTags) {
      const slug = (tag.slug || '').toLowerCase();
      const label = tag.label || tag.slug || '';
      
      // Skip very short or numeric tags
      if (label.length < 2 || /^\d+$/.test(label)) continue;
      
      // Check if priority
      const isPriority = PRIORITY_TAGS.some(p => 
        slug.includes(p) || p.includes(slug)
      );
      
      const formatted = {
        id: tag.id,
        slug: tag.slug,
        name: label.charAt(0).toUpperCase() + label.slice(1),
        emoji: getTagEmoji(label),
        isPriority,
      };
      
      if (isPriority || tag.forceShow) {
        prioritized.push(formatted);
      } else {
        others.push(formatted);
      }
    }
    
    // Sort priority tags by their order in PRIORITY_TAGS
    prioritized.sort((a, b) => {
      const aIdx = PRIORITY_TAGS.findIndex(p => a.slug.includes(p));
      const bIdx = PRIORITY_TAGS.findIndex(p => b.slug.includes(p));
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
    
    // Combine and limit
    return [...prioritized, ...others].slice(0, limit);
  } catch (err) {
    console.error('getPopularTags error:', err.message);
    // Return fallback categories
    return Object.entries(CATEGORIES).slice(0, limit).map(([slug, cat]) => ({
      id: slug,
      slug,
      name: cat.name,
      emoji: cat.emoji,
      isPriority: true,
    }));
  }
}

/**
 * Curated category definitions per Raphael's POLYPULSE_UX_DESIGNS.md spec
 * Maps Polymarket tags to 10 parent categories
 */
export const CATEGORIES = {
  crypto: {
    name: 'Crypto',
    emoji: '🪙',
    keywords: ['bitcoin', 'ethereum', 'solana', 'crypto', 'btc', 'eth', 'token', 'blockchain', 'defi', 'nft'],
  },
  politics: {
    name: 'US Politics',
    emoji: '🏛️',
    keywords: ['trump', 'biden', 'election', 'congress', 'senate', 'president', 'republican', 'democrat', 'supreme-court'],
  },
  world: {
    name: 'World Politics',
    emoji: '🌍',
    keywords: ['ukraine', 'russia', 'china', 'israel', 'gaza', 'nato', 'eu', 'war', 'international', 'europe'],
  },
  tech: {
    name: 'Tech',
    emoji: '💻',
    keywords: ['apple', 'google', 'openai', 'microsoft', 'meta', 'ai', 'gpt', 'tesla', 'tech'],
  },
  economics: {
    name: 'Economy',
    emoji: '📈',
    keywords: ['fed', 'inflation', 'recession', 'gdp', 'interest', 'rate', 'economy', 'jobs', 'rates'],
  },
  sports: {
    name: 'Sports',
    emoji: '⚽',
    keywords: ['nfl', 'nba', 'ufc', 'super bowl', 'playoffs', 'championship', 'world cup', 'soccer', 'f1', 'sports'],
  },
  entertainment: {
    name: 'Entertainment',
    emoji: '🎬',
    keywords: ['oscar', 'movie', 'netflix', 'celebrity', 'grammy', 'box office', 'streaming', 'oscars'],
  },
  science: {
    name: 'Science',
    emoji: '🔬',
    keywords: ['space', 'nasa', 'climate', 'nobel', 'mars', 'spacex', 'rocket'],
  },
  legal: {
    name: 'Legal',
    emoji: '⚖️',
    keywords: ['court', 'supreme', 'lawsuit', 'trial', 'indictment', 'judge', 'verdict', 'regulation'],
  },
  health: {
    name: 'Health',
    emoji: '🏥',
    keywords: ['fda', 'vaccine', 'pandemic', 'drug', 'approval', 'health', 'medical', 'pharma'],
  },
};

/**
 * Get markets for a category
 */
export async function getMarketsByCategory(category, limit = 10, offset = 0) {
  const cat = CATEGORIES[category];
  if (!cat) return { markets: [], total: 0 };
  
  const markets = await fetchAllMarkets();
  const queryWords = cat.keywords;
  
  // Score and filter markets matching this category
  const matched = markets
    .map(m => {
      const question = (m.question || '').toLowerCase();
      const slug = (m.slug || '').toLowerCase();
      const description = (m.description || '').toLowerCase();
      const text = `${question} ${slug} ${description}`;
      
      let score = 0;
      for (const word of queryWords) {
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (wordRegex.test(text)) score += 1;
      }
      
      return { market: m, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => {
      // Primary: relevance, Secondary: volume
      if (b.score !== a.score) return b.score - a.score;
      return (b.market.volume24hr || 0) - (a.market.volume24hr || 0);
    });
  
  const total = matched.length;
  const paged = matched.slice(offset, offset + limit).map(s => s.market);
  
  return { markets: paged, total };
}

/**
 * Format price as percentage
 */
export function formatPriceStr(priceStr) {
  const price = parseFloat(priceStr);
  return `${(price * 100).toFixed(1)}%`;
}

/**
 * Format volume
 */
export function formatVolume(volume) {
  if (!volume) return '$0';
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Format price change with momentum indicator
 */
export function formatPriceChange(change) {
  if (change === null || change === undefined) return { text: '—', indicator: '➖' };
  
  const pct = Math.abs(change * 100).toFixed(1);
  let indicator = '➖';
  let text = `${pct}%`;
  
  if (change > 0.005) {
    indicator = '📈';
    text = `+${pct}%`;
  } else if (change < -0.005) {
    indicator = '📉';
    text = `-${pct}%`;
  } else {
    indicator = '➖';
    text = '0%';
  }
  
  return { text, indicator };
}

/**
 * Parse outcome prices from market
 */
export function parseOutcomes(market) {
  try {
    const outcomes = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    
    return outcomes.map((name, i) => ({
      name,
      price: parseFloat(prices[i]) || 0,
      pct: formatPriceStr(prices[i] || '0'),
    }));
  } catch {
    return [];
  }
}

/**
 * Get enriched market with price context
 */
export function enrichMarket(market) {
  const outcomes = parseOutcomes(market);
  const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
  
  const priceChange = formatPriceChange(market.oneDayPriceChange);
  const volume = formatVolume(market.volume24hr);
  
  return {
    ...market,
    outcomes,
    yesPrice: yesOutcome?.price || 0,
    yesPct: yesOutcome?.pct || '—',
    volume,
    priceChange: priceChange.text,
    momentum: priceChange.indicator,
    // Rich price context: "73% YES · 📈 +4.2% (24h) · Vol: $2.4M"
    priceContext: `${yesOutcome?.pct || '—'} YES · ${priceChange.indicator} ${priceChange.text} (24h) · Vol: ${volume}`,
    // Legacy format for compatibility
    priceDisplay: `${yesOutcome?.pct || '—'} ${priceChange.indicator} ${priceChange.text}`,
  };
}

/**
 * Get market by ID
 */
export async function getMarketById(marketId) {
  if (!marketId) {
    console.error('getMarketById called with empty marketId');
    return null;
  }
  
  // First try direct API lookup (works with numeric IDs)
  try {
    const response = await api.get(`/markets/${marketId}`);
    return response.data;
  } catch (err) {
    console.log(`Direct API lookup failed for ${marketId}: ${err.message}`);
  }
  
  // Fallback: search in cached markets (now fetches up to 2000 markets)
  try {
    const markets = await fetchAllMarkets();
    const found = markets.find(m => m.id === marketId || m.slug === marketId);
    if (found) return found;
  } catch (err) {
    console.error(`Cache search failed for ${marketId}: ${err.message}`);
  }
  
  console.error(`Market not found: ${marketId}`);
  return null;
}

// ============ CLOB API for Price History ============

const CLOB_URL = 'https://clob.polymarket.com';

const clobApi = axios.create({
  baseURL: CLOB_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'User-Agent': 'PolyPulse/2.0' },
});

/**
 * Get price history for a token
 * GET https://clob.polymarket.com/prices-history?market=X&interval=1h&fidelity=60
 */
export async function getPriceHistory(tokenId, interval = '1d') {
  try {
    const response = await clobApi.get('/prices-history', {
      params: {
        market: tokenId,
        interval,
        fidelity: 60, // 60 data points
      },
    });
    
    return response.data?.history || [];
  } catch (err) {
    console.error('Price history error:', err.message);
    return [];
  }
}

/**
 * Calculate 24h price change from history
 */
export function calculate24hChange(history) {
  if (!history || history.length < 2) return null;
  
  // History is typically sorted oldest to newest
  const oldest = parseFloat(history[0]?.p || history[0]?.price || 0);
  const newest = parseFloat(history[history.length - 1]?.p || history[history.length - 1]?.price || 0);
  
  if (oldest === 0) return null;
  
  return newest - oldest;
}

/**
 * Get enriched market with 24h price context
 * Includes: current price, 24h change %, momentum indicator
 */
export async function getMarketWithPriceContext(market) {
  const outcomes = parseOutcomes(market);
  const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
  
  // Default values
  let priceChange24h = null;
  let momentum = '➖';
  let changeText = '0%';
  
  // Try to get from market's oneDayPriceChange first (faster)
  if (market.oneDayPriceChange !== undefined && market.oneDayPriceChange !== null) {
    priceChange24h = market.oneDayPriceChange;
  }
  // Otherwise try CLOB API (if we have a token ID)
  else if (market.clobTokenIds && market.clobTokenIds.length > 0) {
    try {
      const tokenId = market.clobTokenIds[0]; // YES token
      const history = await getPriceHistory(tokenId, '1d');
      priceChange24h = calculate24hChange(history);
    } catch {
      // Keep defaults
    }
  }
  
  // Format the change
  if (priceChange24h !== null) {
    const pct = Math.abs(priceChange24h * 100).toFixed(1);
    if (priceChange24h > 0.005) {
      momentum = '📈';
      changeText = `+${pct}%`;
    } else if (priceChange24h < -0.005) {
      momentum = '📉';
      changeText = `-${pct}%`;
    } else {
      momentum = '➖';
      changeText = '0%';
    }
  }
  
  const volume = formatVolume(market.volume24hr);
  
  return {
    ...market,
    outcomes,
    yesPrice: yesOutcome?.price || 0,
    yesPct: yesOutcome?.pct || '—',
    volume,
    priceChange24h,
    changeText,
    momentum,
    // Rich price context: "73% YES · 📈 +4.2% (24h) · Vol: $2.4M"
    priceContext: `${yesOutcome?.pct || '—'} YES · ${momentum} ${changeText} (24h) · Vol: ${volume}`,
    // Legacy format
    priceDisplay: `${yesOutcome?.pct || '—'} ${momentum} ${changeText}`,
  };
}

/**
 * Enrich multiple markets with price context (batch)
 */
export async function enrichMarketsWithContext(markets) {
  // Use parallel but with rate limiting
  const results = [];
  for (const market of markets) {
    const enriched = await getMarketWithPriceContext(market);
    results.push(enriched);
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 50));
  }
  return results;
}

/**
 * Get recently created markets (new in last 24-48 hours)
 * @param {number} hoursBack - How many hours back to look (default 24)
 * @param {number} limit - Max markets to return
 */
export async function getNewMarkets(hoursBack = 24, limit = 5) {
  try {
    const markets = await fetchAllMarkets();
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    
    // Filter for markets created after cutoff
    // Markets have createdAt or startDate field
    const newMarkets = markets
      .filter(m => {
        const created = m.createdAt || m.startDate || m.created_at;
        if (!created) return false;
        const createdTime = new Date(created).getTime();
        return createdTime > cutoff && !isNaN(createdTime);
      })
      .sort((a, b) => {
        // Sort by creation date descending (newest first)
        const aDate = new Date(a.createdAt || a.startDate || a.created_at).getTime();
        const bDate = new Date(b.createdAt || b.startDate || b.created_at).getTime();
        return bDate - aDate;
      })
      .slice(0, limit);
    
    // Enrich with price data
    return newMarkets.map(m => {
      const outcomes = parseOutcomes(m);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      return {
        ...m,
        price: yesOutcome?.price || 0.5,
      };
    });
  } catch (err) {
    console.error('getNewMarkets error:', err.message);
    return [];
  }
}
