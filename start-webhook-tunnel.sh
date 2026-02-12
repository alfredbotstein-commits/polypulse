#!/bin/bash
# Start ngrok tunnel for PolyPulse webhook and auto-update Stripe endpoint
# Managed by pm2 as 'polypulse-tunnel'
# NOTE: ngrok free tier generates a random URL per session. This account gets:
#   unwarpable-philip-houndlike.ngrok-free.dev (stable while tunnel is running)
# On restart, URL changes → Stripe is auto-updated.

WEBHOOK_PORT=3001
STRIPE_ENDPOINT_ID="we_1Syxpm23mDBwK1ces8pyOVgo"
LOGFILE="/Users/albert/clawd/polypulse/tunnel.log"
NGROK_BIN="/opt/homebrew/bin/ngrok"
STRIPE_BIN="/opt/homebrew/bin/stripe"

echo "[$(date)] Starting ngrok tunnel on port $WEBHOOK_PORT..." >> "$LOGFILE"

# Kill any existing ngrok on this port
pkill -f "ngrok http $WEBHOOK_PORT" 2>/dev/null
sleep 1

# Start ngrok in background
$NGROK_BIN http $WEBHOOK_PORT --log=stdout --log-level=warn &
NGROK_PID=$!

# Wait for tunnel to be ready
TUNNEL_URL=""
for i in $(seq 1 20); do
    sleep 2
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])" 2>/dev/null)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo "[$(date)] ERROR: Failed to get tunnel URL after 40s" >> "$LOGFILE"
    exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/webhook"
echo "[$(date)] Tunnel URL: $WEBHOOK_URL" >> "$LOGFILE"

# Update Stripe webhook endpoint
$STRIPE_BIN webhook_endpoints update "$STRIPE_ENDPOINT_ID" --url "$WEBHOOK_URL" >> "$LOGFILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Stripe webhook updated to $WEBHOOK_URL" >> "$LOGFILE"
else
    echo "[$(date)] ❌ Failed to update Stripe webhook" >> "$LOGFILE"
fi

# Save current URL for reference
echo "$WEBHOOK_URL" > /Users/albert/clawd/polypulse/current-webhook-url.txt

# Wait for ngrok process (keeps pm2 happy)
wait $NGROK_PID
