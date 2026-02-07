// Morning Briefing Cron Job
// Runs hourly to send personalized briefings to premium users
// Call: node src/briefing-cron.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getUsersForBriefing,
  markBriefingSent,
} from './db.js';
import { generateBriefingMessage } from './briefing.js';

// Initialize bot for sending
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Get current UTC hour
 */
function getCurrentUTCHour() {
  return new Date().getUTCHours();
}

/**
 * Send briefing to a single user
 */
async function sendBriefingToUser(briefing) {
  const telegramId = briefing.user_id;
  console.log(`Preparing briefing for user ${telegramId}...`);

  try {
    // Generate the briefing message
    const message = await generateBriefingMessage(briefing.user.id, telegramId);

    // Check if we have any content worth sending
    if (!message) {
      console.log(`No meaningful content for user ${telegramId}, skipping...`);
      await markBriefingSent(telegramId);
      return;
    }

    // Send the briefing
    await bot.api.sendMessage(telegramId, message, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });

    console.log(`✅ Briefing sent to user ${telegramId}`);
    await markBriefingSent(telegramId);

  } catch (err) {
    console.error(`❌ Failed to send briefing to ${telegramId}:`, err.message);
    
    // If blocked by user, we might want to disable their briefing
    if (err.description?.includes('blocked') || err.description?.includes('deactivated')) {
      console.log(`User ${telegramId} has blocked the bot or is deactivated`);
    }
  }
}

/**
 * Main cron job function
 */
async function runBriefingCron() {
  const utcHour = getCurrentUTCHour();
  console.log(`\n📬 Running briefing cron at UTC hour ${utcHour}`);
  console.log(`Current time: ${new Date().toISOString()}`);

  try {
    // Get all users who should receive briefing this hour
    const users = await getUsersForBriefing(utcHour);
    console.log(`Found ${users.length} users to send briefings to`);

    if (users.length === 0) {
      console.log('No users need briefing at this hour. Done.');
      return;
    }

    // Send briefings with rate limiting
    for (const briefing of users) {
      await sendBriefingToUser(briefing);
      // Rate limit: 1 briefing per second max
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n✅ Briefing cron complete. Sent ${users.length} briefings.`);

  } catch (err) {
    console.error('Briefing cron error:', err);
    process.exit(1);
  }
}

// Run immediately when called
runBriefingCron()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
