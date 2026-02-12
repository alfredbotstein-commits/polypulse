// Morning Briefing Cron Job
// Runs hourly to send personalized briefings to premium users
// Call: node src/briefing-cron.js

import 'dotenv/config';
import { Bot } from 'grammy';
import {
  getUsersForBriefing,
  markBriefingSent,
  getFreeUsersForLiteBriefing,
  markLiteBriefingSent,
  getFreeUsersForWhaleTeaser,
  markWhaleTeaserSent,
  getRecentWhaleEvents,
  getWinbackEligibleUsers,
  markWinbackSent,
} from './db.js';
import { generateBriefingMessage, generateLiteBriefingMessage } from './briefing.js';
import { getTrendingMarkets, enrichMarket } from './polymarket.js';
import { escapeMarkdown, truncate, formatVolume } from './format.js';
import { checkAndSendDrips } from './drip.js';

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

    console.log(`\n✅ Premium briefing cron complete. Sent ${users.length} briefings.`);

    // === LITE BRIEFING FOR FREE USERS ===
    // Only send once per day at UTC hour 14 (~9am EST)
    if (utcHour === 14) {
      console.log('\n📨 Sending lite briefings to free users...');
      const freeUsers = await getFreeUsersForLiteBriefing();
      console.log(`Found ${freeUsers.length} free users for lite briefing`);

      if (freeUsers.length > 0) {
        const liteMessage = await generateLiteBriefingMessage();
        if (liteMessage) {
          let liteSent = 0;
          for (const user of freeUsers) {
            try {
              await bot.api.sendMessage(user.telegram_id, liteMessage, {
                parse_mode: 'MarkdownV2',
                disable_web_page_preview: true,
              });
              await markLiteBriefingSent(user.telegram_id);
              liteSent++;
            } catch (err) {
              console.error(`Failed lite briefing to ${user.telegram_id}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 500));
          }
          console.log(`✅ Sent ${liteSent} lite briefings`);
        } else {
          console.log('No lite briefing content available, skipping');
        }
      }
    }

    // === WHALE TEASER FOR FREE USERS ===
    // Send once per day at UTC hour 15 (~10am EST)
    if (utcHour === 15) {
      console.log('\n🐋 Sending whale teasers to free users...');
      try {
        const whaleEvents = await getRecentWhaleEvents(24, 1);
        if (whaleEvents.length > 0) {
          const whale = whaleEvents[0];
          const amount = formatVolume(whale.amount_usd);
          const title = truncate(whale.market_title, 40);
          const teaserMsg = `🐋 *${escapeMarkdown(amount)} bet just placed* on "${escapeMarkdown(title)}"\n\nWant real\\-time whale alerts? /upgrade — 7 days free`;
          
          const freeUsers = await getFreeUsersForWhaleTeaser();
          console.log(`Found ${freeUsers.length} free users for whale teaser`);
          let teasersSent = 0;
          for (const user of freeUsers) {
            try {
              await bot.api.sendMessage(user.telegram_id, teaserMsg, {
                parse_mode: 'MarkdownV2',
              });
              await markWhaleTeaserSent(user.telegram_id);
              teasersSent++;
            } catch (err) {
              console.error(`Failed whale teaser to ${user.telegram_id}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 500));
          }
          console.log(`✅ Sent ${teasersSent} whale teasers`);
        } else {
          console.log('No whale events for teaser, skipping');
        }
      } catch (err) {
        console.error('Whale teaser error:', err.message);
      }
    }

    // === WIN-BACK MESSAGES ===
    // Send once per day at UTC hour 18 (~1pm EST)
    if (utcHour === 18) {
      console.log('\n📊 Checking win-back eligible users...');
      try {
        const winbackUsers = await getWinbackEligibleUsers();
        console.log(`Found ${winbackUsers.length} win-back eligible users`);
        
        if (winbackUsers.length > 0) {
          // Get top trending market for the message
          let trendingSnippet = 'top markets are moving fast';
          try {
            const trending = await getTrendingMarkets(1);
            if (trending.length > 0) {
              const m = enrichMarket(trending[0]);
              trendingSnippet = `${truncate(m.question, 40)} is at ${m.yesPct} YES`;
            }
          } catch {}
          
          const winbackMsg = `📊 *Here's what you missed:* ${escapeMarkdown(trendingSnippet)}\n\nStart your free trial to never miss a move → /upgrade`;
          
          let winbackSent = 0;
          for (const user of winbackUsers) {
            try {
              await bot.api.sendMessage(user.telegram_id, winbackMsg, {
                parse_mode: 'MarkdownV2',
              });
              await markWinbackSent(user.telegram_id);
              winbackSent++;
            } catch (err) {
              console.error(`Failed win-back to ${user.telegram_id}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 500));
          }
          console.log(`✅ Sent ${winbackSent} win-back messages`);
        }
      } catch (err) {
        console.error('Win-back error:', err.message);
      }
    }

    // === TRIAL DRIP MESSAGES ===
    console.log('\n💧 Checking trial drip messages...');
    const dripsSent = await checkAndSendDrips(bot.api);
    console.log(`✅ Sent ${dripsSent} drip messages`);

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
