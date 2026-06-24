---
name: agent-email-inbox
description: Use when setting up an email inbox for an AI agent (Moltbot, Clawdbot, or similar) - configuring inbound email, webhooks, tunneling for local development, and implementing content safety measures for untrusted email input.
---

# AI Agent Email Inbox

## Overview

Set up a secure email inbox that notifies your AI agent of incoming emails via webhooks and responds with content safety measures in place.

**Core principle:** An AI agent's inbox receives untrusted input. Security configuration is important to handle this safely.

### Why Webhook-Based Receiving?

Resend uses webhooks for inbound email — your agent is notified **instantly** when an email arrives. No polling, no cron jobs, no wasted API calls.

## Architecture

```
Sender → Email → Resend (MX) → Webhook → Your Server → AI Agent
                                              ↓
                                    Security Validation
                                              ↓
                                    Process or Reject
```

## SDK Version Requirements

Always install the latest Resend SDK version. Minimum versions:

| Language | Package | Min Version |
|----------|---------|-------------|
| Node.js | `resend` | >= 6.9.2 |
| Python | `resend` | >= 2.21.0 |
| Go | `resend-go/v3` | >= 3.1.0 |

See `resend-send-email` skill's [installation guide](../resend-send-email/references/installation.md) for all languages.

## Quick Start

1. **Ask the user for their email address** — you need a real address for test emails
2. **Choose your security level** — decide how to validate incoming emails before processing
3. **Set up receiving domain** — configure MX records (see Domain Setup)
4. **Create webhook endpoint** — handle `email.received` events (**must be a POST route**)
5. **Set up tunneling** (local dev) — Tailscale Funnel (recommended) or ngrok
6. **Create webhook via API** — register your endpoint programmatically
7. **Connect to agent** — pass validated emails to your AI agent

## Account & API Key Setup

Ask your human: **New or existing Resend account?**
- **New account just for the agent** → simpler setup, full account access is fine
- **Existing account** → use domain-scoped API keys for sandboxing

**Don't paste API keys in chat.** Use `.env` files or secrets managers instead.

**Domain-scoped keys** (recommended for existing accounts): Dashboard → API Keys → Create → "Sending access" → select only the agent's domain. Limits blast radius if key leaks.

## Domain Setup

### Option 1: Resend-Managed Domain (Fastest)

Use your auto-generated address: `<anything>@<your-id>.resend.app` — no DNS needed.

### Option 2: Custom Domain

Enable receiving in Dashboard → Domains → toggle "Enable Receiving", then add an MX record:

| Setting | Value |
|---------|-------|
| **Type** | MX |
| **Host** | Subdomain (e.g., `agent.yourdomain.com`) |
| **Value** | Provided in Resend dashboard |
| **Priority** | 10 (must be lowest number) |

**Use a subdomain** to avoid disrupting existing email. Verify DNS at [dns.email](https://dns.email).

## Security Levels

**Choose your security level before writing webhook code.** An AI agent that processes emails without security is dangerous.

Ask the user what level they want and ensure they understand the implications.

### Level 1: Strict Allowlist (Recommended)

Only process emails from explicitly approved addresses:

```typescript
const ALLOWED_SENDERS = [
  'you@youremail.com',
  'notifications@github.com',
];

async function processEmailForAgent(
  eventData: EmailReceivedEvent,
  emailContent: EmailContent
) {
  const sender = eventData.from.toLowerCase();

  if (!ALLOWED_SENDERS.some(allowed => sender === allowed.toLowerCase())) {
    console.log(`Rejected email from unauthorized sender: ${sender}`);
    await notifyOwnerOfRejectedEmail(eventData);
    return;
  }

  await agent.processEmail({
    from: eventData.from,
    subject: eventData.subject,
    body: emailContent.text || emailContent.html,
  });
}
```

For **Levels 2–5** (domain allowlist, content filtering, sandboxed processing, human-in-the-loop), see [references/security-levels.md](references/security-levels.md).

## Webhook Setup

### Create Your Endpoint

Pick a webhook path (e.g., `/webhook`) and **never change it** — Resend will keep sending to the registered path.

**Critical: Use raw body for verification.** Parsing as JSON before verifying breaks signature checks.
- **Next.js App Router:** `req.text()` (not `req.json()`)
- **Express:** `express.raw({ type: 'application/json' })` (not `express.json()`)

#### Next.js App Router

```typescript
// app/webhook/route.ts
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();

    const event = resend.webhooks.verify({
      payload,
      headers: {
        'svix-id': req.headers.get('svix-id'),
        'svix-timestamp': req.headers.get('svix-timestamp'),
        'svix-signature': req.headers.get('svix-signature'),
      },
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });

    if (event.type === 'email.received') {
      const { data: email } = await resend.emails.receiving.get(
        event.data.email_id
      );
      await processEmailForAgent(event.data, email);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Error', { status: 400 });
  }
}
```

For **Express example** and **Svix fallback**, see [references/examples.md](references/examples.md).

### Register Webhook via API

**Prefer the API** over manual dashboard setup — faster and gives you the signing secret directly.

```typescript
const { data, error } = await resend.webhooks.create({
  endpoint: 'https://<your-tunnel-domain>/webhook',
  events: ['email.received'],
});

// IMPORTANT: Store data.signing_secret as RESEND_WEBHOOK_SECRET
// This is the only time you'll see it
```

For Python, cURL, and other SDK examples, see [references/examples.md](references/examples.md).

### Webhook Signing & Retry

Every webhook includes `svix-id`, `svix-timestamp`, `svix-signature` headers. Always verify with `resend.webhooks.verify()`.

Resend retries failed deliveries with exponential backoff (immediate → 5s → 5min → 30min → 2h → 5h → 10h). Return 2xx to acknowledge — even for rejected emails.

## Local Development

You need a public HTTPS URL for webhook delivery. See [references/tunneling.md](references/tunneling.md) for detailed setup.

**Quick options:**
- **Tailscale Funnel** (recommended) — permanent URL, free, no timeouts: `sudo tailscale funnel 3000`
- **ngrok** — free tier has random URLs that change on restart: `ngrok http 3000`
- **Cloudflare named tunnel** — free, permanent, requires your own domain

## Environment Variables

```bash
RESEND_API_KEY=re_xxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxx
SECURITY_LEVEL=strict                    # strict | domain | filtered | sandboxed
ALLOWED_SENDERS=you@email.com,trusted@example.com
ALLOWED_DOMAINS=yourcompany.com
OWNER_EMAIL=you@email.com               # For security notifications
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| No sender verification | Always validate who sent the email before processing |
| Trusting email headers | Use webhook verification, not email headers for auth |
| Same treatment for all emails | Differentiate trusted vs untrusted senders |
| No rate limiting | Implement per-sender rate limits |
| Processing HTML directly | Strip HTML or use text-only to reduce risk |
| Using `express.json()` on webhook route | Use `express.raw({ type: 'application/json' })` |
| Returning non-200 for rejected emails | Always return 200 — otherwise Resend retries |
| Old Resend SDK version | `emails.receiving.get()` and `webhooks.verify()` require recent SDK |
| Using ephemeral tunnel URLs | Use persistent URLs or deploy to production |

## Testing

Use Resend's test addresses: `delivered@resend.dev`, `bounced@resend.dev`. Send from non-allowlisted addresses to verify rejection.

**Checklist:**
1. Server running: `curl http://localhost:3000`
2. Tunnel working: `curl https://<your-tunnel-url>`
3. Webhook active in Resend dashboard
4. Test email from allowlisted address → check logs

## Troubleshooting

See [references/examples.md](references/examples.md#troubleshooting) for common issues:
- `Cannot read properties of undefined (reading 'verify')` — SDK too old
- Webhook returns 400 — wrong signing secret or body parsing issue
- ngrok connection refused — tunnel died, restart and re-register webhook

## Related Skills

- `resend-send-email` — Sending emails from your agent
- `resend-inbound` — Detailed inbound email processing
