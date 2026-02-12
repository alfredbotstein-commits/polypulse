// PolyPulse Trial Drip Sequence
// Sends automated onboarding messages to trial users
// Run via cron: node src/drip-cron.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getTrialUsersForDrip,
  getNextDripStep,
  updateDripStep,
} from './db.js';
import { escapeMarkdown } from './format.js';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const DRIP_MESSAGES = {
  1: {
    // Day 1: Welcome & feature walkthrough
    text: `🎉 *Welcome to PolyPulse Pro\\!*

Here's how to get the most from your free trial:

🔥 */trending* — See the hottest markets right now
📊 */price bitcoin* — Get real\\-time odds on any market
🔔 */alert bitcoin 60* — Get notified when odds hit your target
🐋 */whale on* — See when big money moves \\($50K\\+ bets\\)
☀️ */briefing on* — Get a daily market summary every morning

💡 *Pro tip:* Set up your morning briefing and whale alerts first — they run automatically so you never miss a move\\.

_You have 6 days left on your trial\\._`,
  },
  2: {
    // Day 3: Feature discovery
    text: `📈 *Day 3 of your Pro trial*

Are you getting the most out of PolyPulse?

Here are features you might not have tried yet:

🧠 */smartalerts* — AI\\-powered alerts for volume spikes & momentum shifts
📂 */categories* — Subscribe to entire sectors \\(crypto, politics, sports\\)
🎯 */predict bitcoin yes* — Make predictions & track your accuracy
🏆 */leaderboard* — See how you rank against other predictors
💼 */portfolio* — Track your positions & P&L in one place

_Your trial ends in 4 days\\._`,
  },
  3: {
    // Day 5: Urgency — what you'd lose
    text: `⚠️ *Your Pro trial ends in 2 days*

Here's what you'll lose access to:

❌ Unlimited price alerts → back to 3/day
❌ Whale movement alerts \\($50K\\+ bets\\)
❌ Morning briefings
❌ Smart alerts \\(volume spikes, momentum\\)
❌ Full leaderboard & advanced features
❌ Unlimited watchlist & portfolio

🎯 *Keep Pro for just $9\\.99/mo* — that's less than one bad trade\\.

→ /upgrade to continue`,
  },
  4: {
    // Day 7: Last day
    text: `🔔 *Last day of your Pro trial\\!*

Your trial ends today\\. After that, you'll drop back to the free tier\\.

*Keep everything you've set up:*
• Your alerts, watchlist & portfolio stay — but new features lock
• Whale alerts & briefings stop
• Daily limits return

🎯 *Continue Pro for $9\\.99/mo* — cancel anytime, no questions asked\\.

→ /upgrade to keep Pro

_Thank you for trying PolyPulse Pro\\!_`,
  },
};

async function runDrip() {
  console.log('💧 Running trial drip sequence...');

  try {
    const users = await getTrialUsersForDrip();
    console.log(`Found ${users.length} users needing drip messages`);

    for (const user of users) {
      const nextStep = getNextDripStep(user);
      if (!nextStep) continue;

      const drip = DRIP_MESSAGES[nextStep];
      if (!drip) continue;

      try {
        await bot.api.sendMessage(user.telegram_id, drip.text, {
          parse_mode: 'MarkdownV2',
        });
        await updateDripStep(user.telegram_id, nextStep);
        console.log(`✅ Sent drip step ${nextStep} to user ${user.telegram_id}`);
      } catch (err) {
        console.error(`Failed to send drip to ${user.telegram_id}:`, err.message);
        // If blocked by user, still advance step to avoid retrying
        if (err.message?.includes('blocked') || err.message?.includes('chat not found')) {
          await updateDripStep(user.telegram_id, nextStep);
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('💧 Drip sequence complete');
  } catch (err) {
    console.error('Drip cron error:', err);
  }

  process.exit(0);
}

runDrip();
