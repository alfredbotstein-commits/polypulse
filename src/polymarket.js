import axios from 'axios';

const BASE_URL = 'https://gamma-api.polymarket.com';

/**
 * Search for markets by query string
 */
export async function searchMarkets(query, limit = 5) {
  const response = await axios.get(`${BASE_URL}/markets`, {
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
  const response = await axios.get(`${BASE_URL}/markets`, {
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
  const response = await axios.get(`${BASE_URL}/markets`, {
    params: {
      closed: false,
      active: true,
      limit: 100, // Fetch more to sort
    }
  });
  
  const markets = response.data;
  
  // Sort by 24h volume descending
  markets.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  
  return markets.slice(0, limit);
}

/**
 * Search markets with better filtering
 */
export async function searchMarketsFulltext(query, limit = 5) {
  // Fetch a larger batch and search through them
  const response = await axios.get(`${BASE_URL}/markets`, {
    params: {
      closed: false,
      active: true,
      limit: 200,
    }
  });
  
  const markets = response.data;
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  // Score markets by how many query words they match
  const scored = markets.map(m => {
    const text = `${m.question} ${m.slug || ''} ${m.description || ''}`.toLowerCase();
    const score = queryWords.reduce((acc, word) => {
      return acc + (text.includes(word) ? 1 : 0);
    }, 0);
    return { market: m, score };
  });
  
  // Filter to only those that match at least one word, sort by score
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
    const response = await axios.get(`${BASE_URL}/markets/${marketId}`);
    return response.data;
  } catch (err) {
    // Try as condition ID
    try {
      const response = await axios.get(`${BASE_URL}/markets`, {
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
      price: prices[i] || '0',
      pct: formatPrice(prices[i] || '0'),
    }));
  } catch {
    return [];
  }
}
