// PolyPulse Stripe Webhook Handler
// Express server for payment confirmations

import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import { Bot } from 'grammy';
import { activatePremium, cancelPremium, getUserByStripeId } from './db.js';
import { formatUpgradeSuccess } from './format.js';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe requires raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📥 Webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        if (session.mode === 'subscription') {
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          
          console.log(`✅ Checkout completed for customer ${customerId}`);
          
          // Activate premium in database
          const user = await activatePremium(customerId, subscriptionId);
          
          if (user?.telegram_id) {
            // Send welcome message
            try {
              await bot.api.sendMessage(user.telegram_id, formatUpgradeSuccess(), {
                parse_mode: 'MarkdownV2',
              });
              console.log(`🎉 Welcome message sent to ${user.telegram_id}`);
            } catch (sendErr) {
              console.error('Failed to send welcome message:', sendErr.message);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        console.log(`📝 Subscription updated for ${customerId}: ${subscription.status}`);
        
        if (subscription.status === 'active') {
          await activatePremium(customerId, subscription.id);
        } else if (['past_due', 'unpaid'].includes(subscription.status)) {
          // Keep premium but flag for follow-up
          console.log(`⚠️ Payment issue for ${customerId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        console.log(`🚫 Subscription cancelled for ${customerId}`);
        
        // Calculate when access ends (end of current period)
        const endsAt = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        
        await cancelPremium(customerId, endsAt);
        
        // Notify user
        const user = await getUserByStripeId(customerId);
        if (user?.telegram_id) {
          try {
            const endDate = endsAt 
              ? new Date(endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/\./g, '\\.')
              : null;
            const msg = endDate
              ? `Your Premium subscription has been cancelled\\. You'll have access until ${endDate}\\.\n\n_We'd love to have you back — /upgrade anytime\\._`
              : `Your Premium subscription has ended\\. We'd love to have you back — /upgrade anytime\\.`;
            
            await bot.api.sendMessage(user.telegram_id, msg, { parse_mode: 'MarkdownV2' });
          } catch (sendErr) {
            console.error('Failed to send cancellation message:', sendErr.message);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        console.log(`❌ Payment failed for ${customerId}`);
        
        const user = await getUserByStripeId(customerId);
        if (user?.telegram_id) {
          try {
            await bot.api.sendMessage(
              user.telegram_id,
              '⚠️ *Payment Failed*\n\nWe couldn\'t process your subscription payment\\. Please update your payment method to keep Premium access\\.\n\nContact us or try /upgrade again to update your card\\.',
              { parse_mode: 'MarkdownV2' }
            );
          } catch (sendErr) {
            console.error('Failed to send payment failed message:', sendErr.message);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    // Don't return error - Stripe will retry
  }

  res.json({ received: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'polypulse-webhook' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔗 Stripe webhook server running on port ${PORT}`);
  console.log(`   Webhook endpoint: POST /webhook`);
  console.log(`   Health check: GET /health`);
});
