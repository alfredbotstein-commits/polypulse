#!/usr/bin/env node
// PolyPulse Setup Verification Script
// Run: node scripts/verify-setup.js

import 'dotenv/config';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Bot } from 'grammy';

const checks = {
  telegram: false,
  supabase_url: false,
  supabase_key: false,
  supabase_tables: false,
  stripe_key: false,
  stripe_price: false,
  stripe_webhook: false,
};

async function checkTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('NEED')) {
    console.log('❌ TELEGRAM_BOT_TOKEN: Not configured');
    return;
  }
  try {
    const bot = new Bot(token);
    const me = await bot.api.getMe();
    console.log(`✅ TELEGRAM_BOT_TOKEN: @${me.username}`);
    checks.telegram = true;
  } catch (err) {
    console.log(`❌ TELEGRAM_BOT_TOKEN: Invalid (${err.message})`);
  }
}

async function checkSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || url.includes('NEED')) {
    console.log('❌ SUPABASE_URL: Not configured');
    return;
  }
  console.log(`✅ SUPABASE_URL: ${url}`);
  checks.supabase_url = true;
  
  if (!key || key.includes('NEED')) {
    console.log('❌ SUPABASE_SERVICE_KEY: Not configured');
    console.log('   → Get from: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/settings/api');
    return;
  }
  
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      if (error.message.includes('not find')) {
        console.log('⚠️  SUPABASE_SERVICE_KEY: Valid, but tables not created');
        console.log('   → Run schema.sql in SQL Editor');
        checks.supabase_key = true;
      } else {
        console.log(`❌ SUPABASE_SERVICE_KEY: Error (${error.message})`);
      }
    } else {
      console.log('✅ SUPABASE_SERVICE_KEY: Valid');
      console.log('✅ Database tables: Created');
      checks.supabase_key = true;
      checks.supabase_tables = true;
    }
  } catch (err) {
    console.log(`❌ SUPABASE_SERVICE_KEY: Invalid (${err.message})`);
  }
}

async function checkStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secretKey || secretKey.includes('NEED')) {
    console.log('❌ STRIPE_SECRET_KEY: Not configured');
    console.log('   → Get from: https://dashboard.stripe.com/test/apikeys');
    return;
  }
  
  try {
    const stripe = new Stripe(secretKey);
    const balance = await stripe.balance.retrieve();
    console.log(`✅ STRIPE_SECRET_KEY: Valid (${secretKey.startsWith('sk_test') ? 'TEST' : 'LIVE'} mode)`);
    checks.stripe_key = true;
    
    // Check price
    if (!priceId || priceId.includes('NEED')) {
      console.log('❌ STRIPE_PRICE_ID: Not configured');
      console.log('   → Create product at: https://dashboard.stripe.com/test/products/create');
    } else {
      try {
        const price = await stripe.prices.retrieve(priceId);
        const amount = (price.unit_amount / 100).toFixed(2);
        console.log(`✅ STRIPE_PRICE_ID: Valid ($${amount}/${price.recurring?.interval || 'one-time'})`);
        checks.stripe_price = true;
      } catch (err) {
        console.log(`❌ STRIPE_PRICE_ID: Invalid (${err.message})`);
      }
    }
  } catch (err) {
    console.log(`❌ STRIPE_SECRET_KEY: Invalid (${err.message})`);
  }
  
  // Check webhook secret format
  if (!webhookSecret || webhookSecret.includes('NEED')) {
    console.log('❌ STRIPE_WEBHOOK_SECRET: Not configured');
    console.log('   → Set up webhook at: https://dashboard.stripe.com/test/webhooks');
  } else if (webhookSecret.startsWith('whsec_')) {
    console.log('✅ STRIPE_WEBHOOK_SECRET: Configured');
    checks.stripe_webhook = true;
  } else {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET: Format looks incorrect (should start with whsec_)');
  }
}

async function main() {
  console.log('\n🔍 PolyPulse Setup Verification\n');
  console.log('━'.repeat(50));
  
  await checkTelegram();
  console.log('');
  await checkSupabase();
  console.log('');
  await checkStripe();
  
  console.log('\n' + '━'.repeat(50));
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  if (passed === total) {
    console.log('\n🎉 All checks passed! Ready to launch.\n');
    console.log('Start with:');
    console.log('  Terminal 1: npm run webhook');
    console.log('  Terminal 2: npm start\n');
  } else {
    console.log(`\n⚠️  ${passed}/${total} checks passed. See above for what's needed.\n`);
    console.log('See SETUP.md for detailed instructions.\n');
  }
}

main().catch(console.error);
