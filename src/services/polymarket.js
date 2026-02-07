/**
 * PolyPulse Polymarket API Service
 * Real-time market data with intelligent caching
 */

import axios from 'axios';
import { CONFIG } from '../config.js';

const api = axios.create({
  baseURL: CONFIG.POLYMARKET_API_URL,
  timeout: CONFIG.REQUEST_TIMEOUT_MS,
  headers: {
    'User-Agent': 'PolyPulse/2.0',
  },
});

// Simple cache for trending data
let trendingCache = {
  data: null,
  timestamp: 0,
};

/**
 * Parse outcome prices from market object
 */
function parseMarketPrices(market) {
  try {
    const outcomes = JSON.parse(market.outcomes || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');
    
    const parsed = outcomes.map((name, i) => ({
      name,
      price: parseFloat(prices[i] || '0'),
    }));
    
    const yes = parsed.find(o => o.name.toLowerCase() === 'yes');
    const no = parsed.find(o => o.name.toLowerCase() === 'no');
    
    return {
      outcomes: parsed,
      yesPrice: yes?.price || null,
      noPrice: no?.price || null,
    };
  } catch {
    return { outcomes: [], yesPrice: null, noPrice: null };
  }
}

/**
 * Enrich market with parsed data
 */
function enrichMarket(market) {
  const prices = parseMarketPrices(market);
  return {
    ...market,
    ...prices,
    slug: market.slug || market.question?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
}

/**
 * Get trending markets by 24h volume
 * Cached for 60 seconds
 */
export async function getTrendingMarkets(limit = 5) {
  const now = Date.now();
  
  // Return cached data if fresh
  if (trendingCache.data && (now - trendingCache.timestamp) < CONFIG.TRENDING_CACHE_TTL_MS) {
    return trendingCache.data.slice(0, limit);
  }
  
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit: 100,
    },
  });
  
  const markets = response.data
    .map(enrichMarket)
    .sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  
  // Update cache
  trendingCache = {
    data: markets,
    timestamp: now,
  };
  
  return markets.slice(0, limit);
}

/**
 * Search markets by keyword
 * Uses smart scoring for relevance
 */
export async function searchMarkets(query, limit = 5) {
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit: 300, // Fetch more to search through
    },
  });
  
  const markets = response.data;
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);
  
  // Score each market
  const scored = markets.map(m => {
    const question = (m.question || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();
    const description = (m.description || '').toLowerCase();
    const fullText = `${question} ${slug} ${description}`;
    
    let score = 0;
    
    // Exact phrase match in question = highest score
    if (question.includes(queryLower)) {
      score += 100;
    }
    
    // Word matches
    for (const word of queryWords) {
      if (question.includes(word)) score += 10;
      if (slug.includes(word)) score += 5;
      if (description.includes(word)) score += 2;
    }
    
    // Bonus for high volume (popular markets)
    if (m.volume24hr > 100000) score += 5;
    if (m.volume24hr > 1000000) score += 10;
    
    return { market: enrichMarket(m), score };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.market);
}

/**
 * Get a specific market by ID or slug
 */
export async function getMarket(identifier) {
  // Try by ID first
  try {
    const response = await api.get(`/markets/${identifier}`);
    if (response.data) {
      return enrichMarket(response.data);
    }
  } catch {
    // Continue to slug search
  }
  
  // Try by slug
  const response = await api.get('/markets', {
    params: {
      slug: identifier,
      closed: false,
      active: true,
    },
  });
  
  if (response.data?.[0]) {
    return enrichMarket(response.data[0]);
  }
  
  return null;
}

/**
 * Get multiple markets by IDs (for alert checking)
 */
export async function getMarketsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  
  const results = [];
  
  for (const id of ids) {
    try {
      const market = await getMarket(id);
      if (market) {
        results.push(market);
      }
    } catch (err) {
      console.error(`Failed to fetch market ${id}:`, err.message);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  return results;
}

/**
 * Get price history for a market (approximated from CLOB)
 * Note: Polymarket doesn't expose historical prices directly,
 * so we return an approximation based on current + change
 */
export async function getPriceHistory(market, points = 7) {
  // Approximate price history from current price and 24h change
  const currentPrice = market.yesPrice || 0.5;
  const change24h = market.oneDayPriceChange || 0;
  
  // Generate synthetic history
  const history = [];
  const basePrice = currentPrice - change24h;
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = (Math.random() - 0.5) * 0.02; // Small random variation
    const price = basePrice + (change24h * progress) + noise;
    history.push(Math.max(0, Math.min(1, price)));
  }
  
  return history;
}

/**
 * Get related markets (markets with similar keywords)
 */
export async function getRelatedMarkets(market, limit = 3) {
  const keywords = (market.question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3);
  
  if (keywords.length === 0) return [];
  
  // Search for markets matching any keyword
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit: 100,
    },
  });
  
  const markets = response.data;
  const currentId = market.id || market.slug;
  
  const related = markets
    .filter(m => (m.id || m.slug) !== currentId)
    .map(m => {
      const question = (m.question || '').toLowerCase();
      const matchCount = keywords.filter(kw => question.includes(kw)).length;
      return { market: enrichMarket(m), matchCount };
    })
    .filter(r => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit)
    .map(r => r.market);
  
  return related;
}

/**
 * Get recent large trades for a market (whale activity)
 * Note: This requires CLOB API access which may need auth
 */
export async function getWhaleTrades(marketId, limit = 5) {
  // Polymarket's trade data requires CLOB API
  // For MVP, we'll return a placeholder
  // In production, integrate with CLOB websocket or API
  
  try {
    // Attempt to get trade data
    const clobApi = axios.create({
      baseURL: CONFIG.POLYMARKET_CLOB_URL,
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
    });
    
    const response = await clobApi.get('/trades', {
      params: {
        asset_id: marketId,
        limit: 50,
      },
    });
    
    if (response.data?.trades) {
      // Filter to large trades (>$1000)
      const large = response.data.trades
        .filter(t => parseFloat(t.size || 0) * parseFloat(t.price || 0) > 1000)
        .slice(0, limit)
        .map(t => ({
          side: t.side,
          size: parseFloat(t.size),
          price: parseFloat(t.price),
          value: parseFloat(t.size) * parseFloat(t.price),
          timestamp: t.timestamp,
        }));
      
      return large;
    }
  } catch {
    // CLOB API not available or requires auth
  }
  
  return [];
}

/**
 * Check if Polymarket API is healthy
 */
export async function healthCheck() {
  try {
    const response = await api.get('/markets', {
      params: { limit: 1 },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

export default {
  getTrendingMarkets,
  searchMarkets,
  getMarket,
  getMarketsByIds,
  getPriceHistory,
  getRelatedMarkets,
  getWhaleTrades,
  healthCheck,
};
