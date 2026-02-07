// Test briefing message generation
// Sends a test briefing to yourself

import 'dotenv/config';
import { Bot } from 'grammy';
import { getTrendingMarkets, parseOutcomes } from '../src/polymarket.js';
import { formatMorningBriefing } from '../src/format.js';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Your Telegram ID for testing (get from @userinfobot)
const TEST_TELEGRAM_ID = process.argv[2];

if (!TEST_TELEGRAM_ID) {
  console.log('Usage: npm run briefing:test <your-telegram-id>');
  console.log('Get your Telegram ID by messaging @userinfobot');
  process.exit(1);
}

async function generateTestBriefing() {
  console.log('Generating test briefing...');

  // Get real top movers data
  const markets = await getTrendingMarkets(10);
  
  const topMovers = markets
    .map(m => {
      const outcomes = parseOutcomes(m);
      const yesOutcome = outcomes.find(o => o.name.toLowerCase() === 'yes');
      const currentPrice = yesOutcome?.price || 0.5;
      const change = m.oneDayPriceChange || 0;
      
      return {
        question: m.question,
        currentPrice,
        yesterdayPrice: currentPrice - change,
      };
    })
    .sort((a, b) => Math.abs(b.currentPrice - b.yesterdayPrice) - Math.abs(a.currentPrice - a.yesterdayPrice))
    .slice(0, 5);

  // Mock some data for testing
  const testData = {
    watchlistItems: [
      { name: 'Will Bitcoin exceed $100K by Dec 2026?', currentPrice: 0.73, addedPrice: 0.69, overnight: true },
      { name: 'Trump wins 2028 election', currentPrice: 0.34, addedPrice: 0.36, overnight: true },
      { name: 'Fed cuts rates by March', currentPrice: 0.81, addedPrice: 0.81, overnight: true },
    ],
    triggeredAlerts: [
      { market_name: 'Bitcoin exceeds $100K by Dec', threshold: 0.70, triggered_at: new Date().toISOString() },
    ],
    whaleEvents: [
      { amount_usd: 85000, side: 'YES', market_title: 'ETH ETF approved', odds_before: 0.52, odds_after: 0.61 },
      { amount_usd: 120000, side: 'NO', market_title: 'TikTok banned in US', odds_before: 0.38, odds_after: 0.29 },
    ],
    topMovers,
    newMarkets: [
      { question: 'Will Nvidia hit $200 by Q2?', price: 0.44 },
      { question: 'Next Supreme Court retirement 2026?', price: 0.22 },
    ],
  };

  return formatMorningBriefing(testData);
}

async function run() {
  try {
    const message = await generateTestBriefing();
    
    console.log('\n--- Preview ---');
    console.log(message.replace(/\\/g, ''));
    console.log('--- End Preview ---\n');

    console.log(`Sending to Telegram ID: ${TEST_TELEGRAM_ID}`);
    
    await bot.api.sendMessage(TEST_TELEGRAM_ID, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });

    console.log('✅ Test briefing sent successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.description) {
      console.error('Telegram error:', err.description);
    }
  }

  process.exit(0);
}

run();
