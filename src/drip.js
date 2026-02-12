// Onboarding Drip Sequence for Trial Users
// Sends timed messages during the 7-day trial period

import { getTrialUsersForDrip, getNextDripStep, updateDripStep } from './db.js';
import { escapeMarkdown } from './format.js';

/**
 * Drip message templates by step number
 */
const DRIP_MESSAGES = {
  1: {
    // Day 1: Feature walkthrough
    text: `*☀️ Welcome to Day 1 of Pro\\!*

Here's what you can do now:

🐋 *Whale Alerts* — Get notified when $50K\\+ bets drop
→ /whale on

☀️ *Morning Briefing* — Daily market summary delivered to you
→ /briefing on

📊 *Unlimited Everything* — Alerts, watchlist, portfolio, search
→ /trending to explore

🧠 *Smart Alerts* — Volume spikes \\& momentum shifts
→ /smartalerts

_Start with whale alerts — that's where the alpha is\\. 🚀_`,
  },

  2: {
    // Day 3: Discovery
    text: `*💡 Did you know\\?* \\(Day 3 of your trial\\)

You've got some powerful features you might not have tried yet:

🎯 *Predictions* — Call market outcomes \\& track your accuracy
→ /predict bitcoin yes

📂 *Category Subs* — Get alerts for entire sectors
→ /subscribe crypto

💼 *Portfolio Tracker* — Log trades \\& see P&L in real time
→ /buy bitcoin 100 0\\.54

📈 *PnL Summary* — Quick snapshot of your positions
→ /pnl

_The best traders use predictions to sharpen their instincts\\._`,
  },

  3: {
    // Day 5: Urgency
    text: `*⏰ Your trial ends in 2 days*

You've been using Pro features — here's what you'd lose:

❌ Whale alerts go silent
❌ Morning briefings stop
❌ Back to 3 alerts, 5 watchlist items
❌ No smart alerts or category subs

Your subscription continues automatically at $9\\.99/mo\\.
No action needed to keep Pro\\.

_Or manage anytime: /manage_`,
  },

  4: {
    // Day 7: Last day
    text: `*🔔 Last day of your free trial\\!*

Tomorrow your Pro access either continues or you go back to free\\.

*What you keep with Pro:*
✅ Unlimited alerts \\& watchlist
✅ 🐋 Whale alerts
✅ ☀️ Morning briefings
✅ 💼 Full portfolio tracking
✅ 🧠 Smart alerts

*$9\\.99/mo* — that's less than one bad trade\\.

Your subscription renews automatically\\. Cancel anytime: /manage

_Thanks for trying PolyPulse Pro\\! 🙏_`,
  },
};

/**
 * Check all trial users and send due drip messages
 * Called from briefing-cron.js
 * 
 * @param {object} botApi - Grammy bot.api instance for sending messages
 * @returns {number} Number of drip messages sent
 */
export async function checkAndSendDrips(botApi) {
  let sent = 0;

  try {
    const users = await getTrialUsersForDrip();
    console.log(`Found ${users.length} trial users eligible for drip messages`);

    for (const user of users) {
      const nextStep = getNextDripStep(user);
      if (!nextStep) continue;

      const drip = DRIP_MESSAGES[nextStep];
      if (!drip) continue;

      try {
        await botApi.sendMessage(user.telegram_id, drip.text, {
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        });

        await updateDripStep(user.telegram_id, nextStep);
        sent++;
        console.log(`✅ Drip step ${nextStep} sent to user ${user.telegram_id}`);
      } catch (err) {
        console.error(`❌ Failed drip to ${user.telegram_id}:`, err.message);
        
        // If blocked, still update step to avoid retrying
        if (err.description?.includes('blocked') || err.description?.includes('deactivated')) {
          await updateDripStep(user.telegram_id, nextStep);
        }
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('Drip check error:', err);
  }

  return sent;
}
