// PolyPulse Stripe Webhook — Netlify Serverless Function
// Handles: checkout.session.completed, subscription updates, cancellations, payment failures

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegram(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
      }),
    });
  } catch (err) {
    console.error('Telegram send failed:', err.message);
  }
}

async function activatePremium(stripeCustomerId, subscriptionId) {
  const { data, error } = await supabase
    .from('pp_users')
    .update({
      subscription_status: 'premium',
      stripe_subscription_id: subscriptionId,
      premium_until: null,
    })
    .eq('stripe_customer_id', stripeCustomerId)
    .select()
    .single();

  if (error) {
    console.error('activatePremium error:', error);
    // Try matching by metadata telegram_id from Stripe customer
    return null;
  }
  return data;
}

async function activatePremiumByTelegramId(telegramId, stripeCustomerId, subscriptionId) {
  const { data, error } = await supabase
    .from('pp_users')
    .update({
      subscription_status: 'premium',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
      premium_until: null,
    })
    .eq('telegram_id', telegramId)
    .select()
    .single();

  if (error) console.error('activatePremiumByTelegramId error:', error);
  return data;
}

async function cancelPremium(stripeCustomerId, endsAt) {
  await supabase
    .from('pp_users')
    .update({
      subscription_status: 'cancelled',
      premium_until: endsAt,
    })
    .eq('stripe_customer_id', stripeCustomerId);
}

async function getUserByStripeId(stripeCustomerId) {
  const { data } = await supabase
    .from('pp_users')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`📥 Webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const telegramId = session.metadata?.telegram_id;

          console.log(`✅ Checkout completed: customer=${customerId}, telegram=${telegramId}`);

          // Try by stripe_customer_id first, then by telegram_id metadata
          let user = await activatePremium(customerId, subscriptionId);
          if (!user && telegramId) {
            user = await activatePremiumByTelegramId(telegramId, customerId, subscriptionId);
          }

          if (user?.telegram_id) {
            await sendTelegram(
              user.telegram_id,
              '🎉 *Welcome to PolyPulse Premium\\!*\n\n' +
              '✅ Unlimited alerts\n' +
              '✅ Whale tracking\n' +
              '✅ Portfolio analytics\n' +
              '✅ Priority support\n\n' +
              'Your premium features are now active\\. Enjoy\\! 🚀'
            );
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const telegramId = sub.metadata?.telegram_id;
        console.log(`📝 Subscription ${event.type}: customer=${sub.customer}, status=${sub.status}, telegram=${telegramId}`);
        
        if (sub.status === 'active') {
          let user = await activatePremium(sub.customer, sub.id);
          if (!user && telegramId) {
            user = await activatePremiumByTelegramId(telegramId, sub.customer, sub.id);
          }
          
          // Send welcome for new subscriptions
          if (event.type === 'customer.subscription.created' && user?.telegram_id) {
            await sendTelegram(
              user.telegram_id,
              '🎉 *Welcome to PolyPulse Premium\\!*\n\n' +
              '✅ Unlimited alerts\n' +
              '✅ Whale tracking\n' +
              '✅ Portfolio analytics\n' +
              '✅ Priority support\n\n' +
              'Your premium features are now active\\. Enjoy\\! 🚀'
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const endsAt = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        await cancelPremium(sub.customer, endsAt);

        const user = await getUserByStripeId(sub.customer);
        if (user?.telegram_id) {
          const endDate = endsAt
            ? new Date(endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/\./g, '\\.')
            : null;
          const msg = endDate
            ? `Your Premium subscription has been cancelled\\. You'll have access until ${endDate}\\.\n\n_/upgrade anytime to come back\\._`
            : `Your Premium subscription has ended\\. _/upgrade anytime to come back\\._`;
          await sendTelegram(user.telegram_id, msg);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = await getUserByStripeId(invoice.customer);
        if (user?.telegram_id) {
          await sendTelegram(
            user.telegram_id,
            '⚠️ *Payment Failed*\n\nWe couldn\'t process your subscription payment\\. Please update your payment method to keep Premium access\\.'
          );
        }
        break;
      }

      default:
        console.log(`Unhandled: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
  }

  return Response.json({ received: true });
};

export const config = {
  path: '/stripe-webhook',
};
