# PolyPulse Premium 📊

Real-time Polymarket intelligence, delivered instantly via Telegram.

## Features

### Free Tier
- `/trending` — Top 5 moving markets (3x/day)
- `/price <query>` — Market details with sparklines (10x/day)
- `/search <query>` — Find markets (5x/day)
- `/alert` — 1 price alert

### Premium ($9.99/mo)
- Everything unlimited
- Watchlist & portfolio tracking
- Whale movement alerts
- Daily market digests
- Priority support

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-org/polypulse.git
cd polypulse
npm install
```

### 2. Set Up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run `schema.sql` in SQL Editor
3. Copy URL and service key to `.env`

### 3. Set Up Stripe
1. Create product/price in [Stripe Dashboard](https://dashboard.stripe.com)
2. Set up webhook endpoint pointing to `/webhook`
3. Copy keys to `.env`

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run
```bash
# Development
npm run dev

# Production (run both)
npm start          # Bot
npm run webhook    # Stripe webhooks
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/trending` | Top moving markets |
| `/price <query>` | Detailed market view |
| `/search <query>` | Find markets |
| `/alert <query> <price>` | Set price alert |
| `/alerts` | View your alerts |
| `/cancelalert <id>` | Remove an alert |
| `/account` | Subscription status |
| `/upgrade` | Get Premium |

## Architecture

```
src/
├── index.js      # Main bot (grammy)
├── webhook.js    # Stripe webhook server
├── db.js         # Supabase client
├── format.js     # Message formatting
├── config.js     # Configuration
└── polymarket.js # API client
```

## Deployment

### Bot (Mac Mini / VPS)
```bash
pm2 start npm --name "polypulse" -- start
```

### Webhook (Netlify / Vercel / same server)
```bash
pm2 start npm --name "polypulse-webhook" -- run webhook
```

For serverless, adapt `webhook.js` to your platform's handler format.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_PRICE_ID` | Subscription price ID |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `WEBHOOK_PORT` | Default: 3001 |

## License

MIT
