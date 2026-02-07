import axios from 'axios';

const BASE_URL = 'https://gamma-api.polymarket.com';
const REQUEST_TIMEOUT = 15000; // 15 seconds

// Axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': 'PolyPulse/1.0',
  },
});

/**
 * Search for markets by query string
 */
export async function searchMarkets(query, limit = 5) {
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit,
      // The API doesn't have a search param, so we fetch more and filter
    }
  });
  
  const markets = response.data;
  
  // Filter by query (case-insensitive search in question)
  const queryLower = query.toLowerCase();
  const filtered = markets.filter(m => 
    m.question.toLowerCase().includes(queryLower) ||
    (m.slug && m.slug.toLowerCase().includes(queryLower))
  );
  
  return filtered.slice(0, limit);
}

/**
 * Get market by slug
 */
export async function getMarketBySlug(slug) {
  const response = await api.get('/markets', {
    params: {
      slug,
      closed: false,
      active: true,
    }
  });
  
  return response.data[0] || null;
}

/**
 * Get trending markets (sorted by 24h volume)
 */
export async function getTrendingMarkets(limit = 10) {
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit: 500, // Fetch max to get best trending selection
    }
  });
  
  const markets = response.data;
  
  // Sort by 24h volume descending
  markets.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  
  return markets.slice(0, limit);
}

/**
 * Search markets with better filtering
 * Uses full-text search with word boundary detection for better accuracy
 */
export async function searchMarketsFulltext(query, limit = 5) {
  // Fetch maximum batch from API (500 is the limit)
  const response = await api.get('/markets', {
    params: {
      closed: false,
      active: true,
      limit: 500,
    }
  });
  
  const markets = response.data;
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  // Score markets by relevance
  const scored = markets.map(m => {
    const question = (m.question || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();
    const description = (m.description || '').toLowerCase();
    const text = `${question} ${slug} ${description}`;
    
    let score = 0;
    
    // Exact phrase match in question (highest priority)
    if (question.includes(queryLower)) {
      score += 100;
    }
    
    // Word-level matching with word boundary awareness
    for (const word of queryWords) {
      // Create regex for word boundary match (avoid partial matches like "nba" in "Netherlands")
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      
      if (wordRegex.test(question)) {
        score += 20; // Question match is most important
      }
      if (wordRegex.test(slug)) {
        score += 10;
      }
      if (wordRegex.test(description)) {
        score += 5;
      }
    }
    
    // Boost by volume for tie-breaking (popular markets first)
    if (score > 0 && m.volume24hr) {
      score += Math.min(m.volume24hr / 100000, 5); // Small boost based on volume
    }
    
    return { market: m, score };
  });
  
  // Filter to only those that match, sort by score descending
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.market);
}

/**
 * Format price as percentage
 */
export function formatPrice(priceStr) {
  const price = parseFloat(priceStr);
  return `${(price * 100).toFixed(1)}%`;
}

/**
 * Format volume
 */
export function formatVolume(volume) {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(2)}M`;
  } else if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Parse outcome prices from market
 */
/**
 * Get market by ID (or condition ID)
 */
export async function getMarketById(marketId) {
  try {
    const response = await api.get(`/markets/${marketId}`);
    return response.data;
  } catch (err) {
    // Try as condition ID
    try {
      const response = await api.get('/markets', {
        params: {
          id: marketId,
          closed: false,
          active: true,
        }
      });
      return response.data[0] || null;
    } catch {
      return null;
    }
  }
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
      pct: formatPrice(prices[i] || '0'),
    }));
  } catch {
    return [];
  }
}
