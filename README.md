# 🔮 PolyPulse

Telegram bot for Polymarket prediction market analysis.

## Features

- `/price <query>` — Search and get current odds for any market
- `/trending` — View top 5 markets by 24h volume
- Real-time data from Polymarket's Gamma API

## Setup

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather)
2. Copy `.env.example` to `.env` and add your bot token
3. Install dependencies and run:

```bash
npm install
npm start
```

## Development

```bash
npm run dev  # Watch mode with auto-restart
```

## Tech Stack

- Node.js + ES Modules
- Telegraf (Telegram bot framework)
- Polymarket Gamma API

## License

MIT
