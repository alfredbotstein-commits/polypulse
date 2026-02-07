# PolyPulse Deployment Setup

## Current Status
- ✅ Telegram Bot Token: Configured
- ✅ Code: Ready and tested
- ✅ Dependencies: Installed
- ❌ Supabase Tables: Not created (need to run schema.sql)
- ❌ Stripe: Not configured (need API keys)

## What You Need To Do

### Step 1: Supabase - Run the Schema

1. Go to: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/sql/new
2. Login if needed
3. Copy the contents of `schema.sql` and paste into the SQL editor
4. Click "Run"
5. Go to: https://supabase.com/dashboard/project/euyrskubpiexkdqrtcxh/settings/api
6. Copy the `service_role` secret key (NOT the anon key)
7. Paste it into `.env` replacing `NEED_SERVICE_ROLE_KEY`

### Step 2: Stripe - Create Product & Get Keys

1. Go to: https://dashboard.stripe.com/test/products/create
2. Create product:
   - Name: "PolyPulse Premium"
   - Price: $9.99
   - Billing period: Monthly
   - Click "Save product"
3. Copy the Price ID (starts with `price_`)
4. Go to: https://dashboard.stripe.com/test/apikeys
5. Copy your Secret key (starts with `sk_test_`)

Update `.env`:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE
```

### Step 3: Set Up Stripe Webhook

1. Start ngrok in a terminal:
   ```bash
   ngrok http 3001
   ```
2. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. Go to: https://dashboard.stripe.com/test/webhooks/create
4. Add endpoint URL: `YOUR_NGROK_URL/webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
6. Click "Add endpoint"
7. Click "Reveal" on the Signing secret
8. Copy and paste into `.env` as `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 4: Launch

Terminal 1 - Webhook server:
```bash
cd ~/clawd/polypulse && npm run webhook
```

Terminal 2 - Bot:
```bash
cd ~/clawd/polypulse && npm start
```

### Step 5: Test Payment Flow

1. Open Telegram: @GetPolyPulse_bot
2. Send `/start`
3. Send `/upgrade`
4. Click payment link
5. Use test card: `4242 4242 4242 4242`
6. Any expiry, any CVC
7. Should see "Welcome to Premium! 🎉"

## Credentials Needed

| Key | Where to get it | Current status |
|-----|-----------------|----------------|
| TELEGRAM_BOT_TOKEN | @BotFather | ✅ Done |
| SUPABASE_URL | Project settings | ✅ Done |
| SUPABASE_SERVICE_KEY | Project settings > API | ❌ Needed |
| STRIPE_SECRET_KEY | Developers > API keys | ❌ Needed |
| STRIPE_PRICE_ID | Create product first | ❌ Needed |
| STRIPE_WEBHOOK_SECRET | Developers > Webhooks | ❌ Needed |
