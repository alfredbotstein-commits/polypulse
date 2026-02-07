/**
 * PolyPulse Stripe Integration
 * Handles subscriptions and payment processing
 */

import Stripe from 'stripe';
import { CONFIG } from '../config.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price ID for premium subscription (created in Stripe dashboard)
const PREMIUM_PRICE_ID = process.env.STRIPE_PRICE_ID;

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(telegramId, username, email = null) {
  // Search for existing customer
  const existing = await stripe.customers.search({
    query: `metadata["telegram_id"]:"${telegramId}"`,
  });
  
  if (existing.data.length > 0) {
    return existing.data[0];
  }
  
  // Create new customer
  const customer = await stripe.customers.create({
    name: username || `Telegram User ${telegramId}`,
    email: email,
    metadata: {
      telegram_id: telegramId.toString(),
      source: 'polypulse_bot',
    },
  });
  
  return customer;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(telegramId, username) {
  const customer = await getOrCreateCustomer(telegramId, username);
  
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [
      {
        price: PREMIUM_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.BOT_WEBHOOK_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BOT_WEBHOOK_URL}/payment-cancelled`,
    metadata: {
      telegram_id: telegramId.toString(),
      product: 'polypulse_premium',
    },
    subscription_data: {
      metadata: {
        telegram_id: telegramId.toString(),
      },
    },
    allow_promotion_codes: true,
  });
  
  return {
    url: session.url,
    sessionId: session.id,
    customerId: customer.id,
  };
}

/**
 * Get customer portal URL for managing subscription
 */
export async function createPortalSession(stripeCustomerId) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: 'https://t.me/GetPolyPulse_bot',
  });
  
  return session.url;
}

/**
 * Get subscription status for a customer
 */
export async function getSubscriptionStatus(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    limit: 1,
  });
  
  if (subscriptions.data.length === 0) {
    return null;
  }
  
  const sub = subscriptions.data[0];
  return {
    id: sub.id,
    status: sub.status,
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId) {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

export default {
  getOrCreateCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  cancelSubscription,
  verifyWebhookSignature,
};
