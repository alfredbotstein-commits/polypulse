# 🔮 PolyPulse

Telegram bot for Polymarket prediction market analysis with price alerts.

## Features

- `/price <query>` — Search and get current odds for any market
- `/trending` — View top 5 markets by 24h volume
- `/alert <query> <price>` — Set price alert (e.g., `/alert bitcoin 60`)
- `/alerts` — View your active alerts
- `/cancelalert <id>` — Cancel an alert by ID
- Real-time data from Polymarket's Gamma API
- Background price checking every 5 minutes

## Quick Start

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather)
2. Copy `.env.example` to `.env` and add your bot token:
   ```bash
   cp .env.example .env
   # Edit .env with your token
   ```
3. Install dependencies and run:
   ```bash
   npm install
   npm start
   ```

## Development

```bash
npm run dev  # Watch mode with auto-restart
```

## Deployment

### Option 1: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start src/index.js --name polypulse

# Auto-restart on reboot
pm2 startup
pm2 save

# Useful commands
pm2 logs polypulse      # View logs
pm2 restart polypulse   # Restart
pm2 stop polypulse      # Stop
```

### Option 2: systemd (Linux servers)

Create `/etc/systemd/system/polypulse.service`:

```ini
[Unit]
Description=PolyPulse Telegram Bot
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/polypulse
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable polypulse
sudo systemctl start polypulse
sudo journalctl -u polypulse -f  # View logs
```

### Option 3: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/index.js"]
```

```bash
docker build -t polypulse .
docker run -d --name polypulse --env-file .env polypulse
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |

## Price Alerts

Set alerts to be notified when a market's YES price crosses your threshold:

```
/alert bitcoin 60      # Alert when Bitcoin YES hits 60%
/alert trump 40        # Alert when Trump YES drops to 40%
/alerts                # See your active alerts
/cancelalert 5         # Cancel alert #5
```

Direction is auto-detected based on current price:
- If current price < target → alerts when price goes UP to target
- If current price > target → alerts when price goes DOWN to target

Alerts are stored in SQLite (`data/alerts.db`) and checked every 5 minutes.

## Tech Stack

- **Runtime:** Node.js 20+ (ES Modules)
- **Framework:** Telegraf
- **Database:** better-sqlite3
- **API:** Polymarket Gamma API

## Data Storage

- Alerts are persisted in `data/alerts.db` (SQLite)
- The `data/` directory is git-ignored
- Maximum 10 alerts per user

## Troubleshooting

**Bot doesn't respond:**
- Check that `TELEGRAM_BOT_TOKEN` is set correctly
- Ensure no other instance is running with the same token

**API errors:**
- Polymarket API may have rate limits
- Check network connectivity

**Database errors:**
- Ensure the process has write permissions for the `data/` directory

## License

MIT
