#!/bin/bash
# PolyPulse Cloudflare Tunnel Startup Script
# Starts a quick tunnel, captures URL, updates Stripe webhook endpoint

set -e

WEBHOOK_ENDPOINT_FILE="/Users/albert/clawd/polypulse/.webhook_endpoint_id"
LOG_FILE="/Users/albert/clawd/polypulse/tunnel.log"
PORT=3001

# Start cloudflared in background, capture URL from stderr
cloudflared tunnel --url http://localhost:$PORT 2>&1 | tee "$LOG_FILE" &
CF_PID=$!

# Wait for the URL to appear
echo "Waiting for tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo "ERROR: Failed to get tunnel URL after 30s"
    kill $CF_PID 2>/dev/null
    exit 1
fi

WEBHOOK_URL="${TUNNEL_URL}/webhook"
echo "Tunnel URL: $WEBHOOK_URL"

# Create or update Stripe webhook endpoint
if [ -f "$WEBHOOK_ENDPOINT_FILE" ]; then
    ENDPOINT_ID=$(cat "$WEBHOOK_ENDPOINT_FILE")
    echo "Updating existing endpoint $ENDPOINT_ID..."
    stripe webhook_endpoints update "$ENDPOINT_ID" --url "$WEBHOOK_URL" 2>&1 || {
        echo "Update failed, creating new endpoint..."
        rm "$WEBHOOK_ENDPOINT_FILE"
    }
fi

if [ ! -f "$WEBHOOK_ENDPOINT_FILE" ]; then
    echo "Creating new Stripe webhook endpoint..."
    RESULT=$(stripe webhook_endpoints create \
        --url "$WEBHOOK_URL" \
        --enabled-events checkout.session.completed 2>&1)
    ENDPOINT_ID=$(echo "$RESULT" | grep '"id"' | head -1 | sed 's/.*"id": "\(.*\)".*/\1/')
    echo "$ENDPOINT_ID" > "$WEBHOOK_ENDPOINT_FILE"
    echo "Created endpoint: $ENDPOINT_ID"
    
    # Extract and save the webhook signing secret
    SIGNING_SECRET=$(echo "$RESULT" | grep '"secret"' | head -1 | sed 's/.*"secret": "\(.*\)".*/\1/')
    if [ -n "$SIGNING_SECRET" ]; then
        echo "New signing secret: $SIGNING_SECRET"
        echo "NOTE: Update STRIPE_WEBHOOK_SECRET in .env if this is a new secret!"
    fi
fi

echo "Webhook endpoint ready at: $WEBHOOK_URL"

# Keep running (wait for cloudflared)
wait $CF_PID
