# 🔮 PolyPulse

Telegram bot for Polymarket prediction market analysis with price alerts.

## Features

- `/price <query>` — Search and get current odds for any market
- `/trending` — View top 5 markets by 24h volume
- `/alert <query> <price>` — Set price alert (e.g., `/alert bitcoin 60`)
- `/alert below <query> <price>` — Alert when price drops below threshold
- `/alerts` — View your active alerts
- `/cancelalert <id>` — Cancel an alert by ID
- Real-time data from Polymarket's Gamma API
- Background price checking every 5 minutes

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

## Price Alerts

Set alerts to be notified when a market's YES price crosses your threshold:

```
/alert bitcoin 60      # Alert when Bitcoin YES hits 60%
/alert below trump 45  # Alert when Trump YES drops to 45%
/alerts                # See your active alerts
/cancelalert 5         # Cancel alert #5
```

Alerts are stored in SQLite (`data/alerts.db`) and checked every 5 minutes.

## Tech Stack

- Node.js + ES Modules
- Telegraf (Telegram bot framework)
- better-sqlite3 (persistent alert storage)
- Polymarket Gamma API

## License

MIT
