# Local Development with Tunneling

Your local server isn't accessible from the internet. Use tunneling to expose it for webhook delivery.

**Critical:** Webhook URLs are registered with Resend. If your tunnel URL changes, you must delete and recreate the webhook via the API. For persistent setups, use stable URLs.

## Tailscale Funnel (Recommended)

Permanent, stable HTTPS URL with valid certificates — free, no timeouts.

**Why Tailscale Funnel is better than ngrok for webhooks:**
- Permanent URL that never changes, even across restarts
- No timeouts or session limits (free)
- Auto-reconnects via systemd service
- Valid HTTPS certificates (not self-signed)

```bash
# 1. Install (one-time)
curl -fsSL https://tailscale.com/install.sh | sh

# 2. Authenticate (one-time — opens browser)
sudo tailscale up

# 3. Enable Funnel (one-time approval in browser)
sudo tailscale funnel 3000

# Your permanent URL (shown in output):
# https://<machine-name>.tail<hash>.ts.net
```

**Running in background:**
```bash
# Runs as systemd service automatically — survives reboots
sudo tailscale funnel status   # Check status
sudo tailscale funnel off      # Stop
```

**Webhook URL:** `https://<machine-name>.tail<hash>.ts.net/webhook`

**Security:** Funnel requires explicit browser approval to enable public access.

## ngrok (Alternative)

**Free tier:**
- Random URLs that change on restart
- Must re-register webhook after each restart
- Fine for initial testing

**Paid tier ($8/mo):**
- Static subdomain that persists across restarts
- Recommended for ongoing development

```bash
# Install
brew install ngrok  # macOS
# or download from https://ngrok.com

# Authenticate
ngrok config add-authtoken <your-token>

# Start (free — random URL)
ngrok http 3000

# Start (paid — static subdomain)
ngrok http --domain=myagent.ngrok.io 3000
```

## Cloudflare Tunnel (Alternative)

Use **named tunnels** for persistent URLs. Quick (ephemeral) tunnels change URLs each time.

```bash
# Install
brew install cloudflared  # macOS

# Authenticate with Cloudflare
cloudflared tunnel login

# Create named tunnel (one-time)
cloudflared tunnel create my-agent-webhook

# Create config ~/.cloudflared/config.yml:
# tunnel: <tunnel-id>
# credentials-file: /path/to/.cloudflared/<tunnel-id>.json
# ingress:
#   - hostname: webhook.yourdomain.com
#     service: http://localhost:3000
#   - service: http_status:404

# Add DNS record (one-time)
cloudflared tunnel route dns my-agent-webhook webhook.yourdomain.com

# Run tunnel
cloudflared tunnel run my-agent-webhook
```

**Pros:** Free, persistent URLs, uses your own domain.
**Cons:** Requires owning a domain on Cloudflare, more setup.

## VS Code Port Forwarding

Good for quick testing during development sessions. Open Ports panel → Forward port 3000 → Set visibility to "Public".

**Note:** URL changes each VS Code session. Not suitable for persistent webhooks.

## localtunnel

Simple but ephemeral: `npx localtunnel --port 3000`. URLs change on restart.

## Production Deployment

For reliable agent inboxes, deploy to production infrastructure:

- **Serverless** (Vercel, Netlify, Cloudflare Workers) — zero server management, automatic HTTPS
- **VPS** — webhook handler alongside agent, use nginx/caddy for HTTPS
- **Existing infrastructure** — add webhook route to existing web server

```bash
# Example: deploy Next.js to Vercel
vercel deploy --prod
# Webhook URL: https://your-project.vercel.app/webhook
```
