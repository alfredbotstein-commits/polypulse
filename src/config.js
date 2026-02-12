// PolyPulse Configuration
// Premium Polymarket Intelligence Bot

export const CONFIG = {
  // Bot Info
  BOT_NAME: 'PolyPulse',
  BOT_USERNAME: '@GetPolyPulse_bot',
  
  // Pricing
  PREMIUM_PRICE: 999, // $9.99 in cents
  PREMIUM_PRICE_DISPLAY: '7 days free, then \\$9\\.99/month',
  TRIAL_DAYS: 7,
  
  // Free Tier Limits (per day)
  FREE_LIMITS: {
    trending: 3,
    price: 10,
    search: 5,
    alerts: 3,
    watchlist: 5,
    positions: 1,
  },
  
  // Premium = unlimited
  PREMIUM_LIMITS: {
    trending: Infinity,
    price: Infinity,
    search: Infinity,
    alerts: Infinity,
  },
  
  // Alert Engine
  ALERT_CHECK_INTERVAL_MS: 60 * 1000, // Check every 60 seconds
  
  // Cache Settings
  TRENDING_CACHE_TTL_MS: 60 * 1000, // 60 seconds
  
  // Polymarket API
  POLYMARKET_API_URL: 'https://gamma-api.polymarket.com',
  POLYMARKET_CLOB_URL: 'https://clob.polymarket.com',
  REQUEST_TIMEOUT_MS: 15000,
  
  // Formatting
  SPARKLINE_CHARS: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'],
  
  // Digest Times (UTC hours)
  DEFAULT_DIGEST_HOUR: 13, // 8am EST
};

// Premium feature list for upsell messages
export const PREMIUM_FEATURES = [
  '• Unlimited price alerts',
  '• Whale movement notifications',
  '• Daily market digests',
  '• Volume anomaly detection',
  '• Watchlist & portfolio tracking',
  '• Priority support',
];

// Error messages (human-friendly)
export const ERRORS = {
  MARKET_NOT_FOUND: "Couldn't find that market. Try /search [keywords] or /trending to browse.",
  API_UNAVAILABLE: "Polymarket data is temporarily unavailable. We're on it — try again in a few minutes.",
  RATE_LIMITED: "You've hit your daily limit. Upgrade to Premium for unlimited access → /upgrade",
  GENERIC: "Something went wrong. Please try again in a moment.",
  NOT_PREMIUM: "This feature requires Premium. → /upgrade",
};
