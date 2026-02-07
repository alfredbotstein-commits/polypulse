// PolyPulse Command Test Script
// Tests all commands by simulating Telegram updates

import 'dotenv/config';
import { Bot } from 'grammy';
import Stripe from 'stripe';
import {
  getOrCreateUser,
  getUserAlerts,
  getWatchlist,
} from './src/db.js';
import {
  searchMarketsFulltext,
  getTrendingMarkets,
} from './src/polymarket.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TEST_USER_ID = 999999999;
const TEST_CHAT_ID = 999999999;

console.log('🧪 PolyPulse Command Test Suite\n');
console.log('='.repeat(50));

// Track results
const results = [];

async function test(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await fn();
    console.log('✅ PASS');
    results.push({ name, status: 'pass' });
  } catch (e) {
    console.log('❌ FAIL:', e.message);
    results.push({ name, status: 'fail', error: e.message });
  }
}

// Tests
await test('/start - User creation', async () => {
  const user = await getOrCreateUser(TEST_USER_ID, 'test_user');
  if (!user.id) throw new Error('User not created');
  if (user.subscription_status !== 'free') throw new Error('User should be free');
});

await test('/trending - Get trending markets', async () => {
  const markets = await getTrendingMarkets(5);
  if (!Array.isArray(markets)) throw new Error('Not an array');
  if (markets.length === 0) throw new Error('No markets returned');
});

await test('/search - Search markets', async () => {
  const markets = await searchMarketsFulltext('bitcoin', 3);
  if (!Array.isArray(markets)) throw new Error('Not an array');
  if (markets.length === 0) throw new Error('No markets found');
});

await test('/price - Get market price', async () => {
  const markets = await searchMarketsFulltext('trump', 1);
  if (markets.length === 0) throw new Error('No market found');
  if (!markets[0].question) throw new Error('Missing question field');
});

await test('/alerts - Get user alerts', async () => {
  const alerts = await getUserAlerts(TEST_USER_ID);
  if (!Array.isArray(alerts)) throw new Error('Not an array');
});

await test('/watchlist - Get user watchlist', async () => {
  const watchlist = await getWatchlist(TEST_USER_ID);
  if (!Array.isArray(watchlist)) throw new Error('Not an array');
});

await test('/upgrade - Stripe checkout', async () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('No Stripe key');
  if (!process.env.STRIPE_PRICE_ID) throw new Error('No price ID');
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Verify price exists
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
  if (!price.active) throw new Error('Price not active');
  
  // Create a test checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    }],
    success_url: 'https://t.me/GetPolyPulse_bot?start=upgraded',
    cancel_url: 'https://t.me/GetPolyPulse_bot?start=cancelled',
    metadata: {
      telegram_id: 'test',
    },
  });
  
  if (!session.url) throw new Error('No checkout URL');
  if (!session.url.includes('checkout.stripe.com')) throw new Error('Invalid checkout URL');
  console.log(`(${session.url.substring(0, 50)}...)`);
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 RESULTS SUMMARY\n');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;

results.forEach(r => {
  const icon = r.status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${r.name}`);
  if (r.error) console.log(`   └─ ${r.error}`);
});

console.log(`\n${passed}/${results.length} tests passed`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
}
