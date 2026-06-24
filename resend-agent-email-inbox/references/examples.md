# Examples, Integration & Troubleshooting

## Express Webhook Endpoint

```javascript
import express from 'express';
import { Resend } from 'resend';

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Important: Use express.raw, not express.json, for the webhook route
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body.toString();

    const event = resend.webhooks.verify({
      payload,
      headers: {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      },
      secret: process.env.RESEND_WEBHOOK_SECRET,
    });

    if (event.type === 'email.received') {
      const sender = event.data.from.toLowerCase();

      if (!isAllowedSender(sender)) {
        console.log(`Rejected email from unauthorized sender: ${sender}`);
        res.status(200).send('OK');  // Return 200 even for rejected emails
        return;
      }

      const { data: email } = await resend.emails.receiving.get(event.data.email_id);
      await processEmailForAgent(event.data, email);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Error');
  }
});

app.get('/', (req, res) => {
  res.send('Agent Email Inbox - Ready');
});

app.listen(3000, () => console.log('Webhook server running on :3000'));
```

## Webhook Verification Fallback (Svix)

If using an older Resend SDK without `resend.webhooks.verify()`:

```bash
npm install svix
```

```javascript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET);
const event = wh.verify(payload, {
  'svix-id': req.headers['svix-id'],
  'svix-timestamp': req.headers['svix-timestamp'],
  'svix-signature': req.headers['svix-signature'],
});
```

## Register Webhook via API

### Python

```python
import resend

resend.api_key = 're_xxxxxxxxx'

webhook = resend.Webhooks.create(params={
    "endpoint": "https://<your-tunnel-domain>/webhook",
    "events": ["email.received"],
})

# Write signing secret to .env, never log it
print(f"Webhook created: {webhook['id']}")
```

### cURL

```bash
curl -X POST 'https://api.resend.com/webhooks' \
  -H 'Authorization: Bearer re_xxxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{
    "endpoint": "https://<your-tunnel-domain>/webhook",
    "events": ["email.received"]
  }'

# Response includes signing_secret — store it immediately
```

Other SDKs (Go, Ruby, PHP, Rust, Java, .NET) follow the same pattern: pass `endpoint` and `events`, read `signing_secret` from response.

## Clawdbot Integration

### Webhook Gateway (Recommended)

```typescript
async function processWithAgent(email: ProcessedEmail) {
  const message = `
New Email
From: ${email.from}
Subject: ${email.subject}

${email.body}
  `.trim();

  await sendToClawdbot(message);
}
```

### Alternative: Polling

Clawdbot can poll the Resend API during heartbeats. Simpler but not real-time.

```typescript
async function checkForNewEmails() {
  const { data: emails } = await resend.emails.list({ /* filter recent */ });

  for (const email of emails) {
    if (!alreadyProcessed(email.id)) {
      await processEmail(email);
      markAsProcessed(email.id);
    }
  }
}
```

### External Channel Plugin

For deep integration, implement Clawdbot's external channel plugin interface to treat email as a first-class channel.

## Sending Emails from Your Agent

Use the `resend-send-email` skill. Quick example:

```typescript
async function sendAgentReply(
  to: string,
  subject: string,
  body: string,
  inReplyTo?: string
) {
  if (!isAllowedToReply(to)) {
    throw new Error('Cannot send to this address');
  }

  const { data, error } = await resend.emails.send({
    from: 'Agent <agent@yourdomain.com>',
    to: [to],
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    text: body,
    headers: inReplyTo ? { 'In-Reply-To': inReplyTo } : undefined,
  });

  if (error) throw new Error(`Failed to send: ${error.message}`);
  return data.id;
}
```

## Complete Example: Secure Agent Inbox

```typescript
// lib/agent-email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const config = {
  allowedSenders: (process.env.ALLOWED_SENDERS || '').split(',').filter(Boolean),
  allowedDomains: (process.env.ALLOWED_DOMAINS || '').split(',').filter(Boolean),
  securityLevel: process.env.SECURITY_LEVEL || 'strict',
  ownerEmail: process.env.OWNER_EMAIL,
};

export async function handleIncomingEmail(
  event: EmailReceivedWebhookEvent
): Promise<void> {
  const sender = event.data.from.toLowerCase();
  const { data: email } = await resend.emails.receiving.get(event.data.email_id);

  switch (config.securityLevel) {
    case 'strict':
      if (!config.allowedSenders.some(a => sender === a.toLowerCase())) {
        await logRejection(event, 'sender_not_allowed');
        return;
      }
      break;

    case 'domain':
      const domain = sender.split('@')[1];
      if (!config.allowedDomains.includes(domain)) {
        await logRejection(event, 'domain_not_allowed');
        return;
      }
      break;

    case 'filtered':
      const analysis = checkContentSafety(email.text || '');
      if (!analysis.safe) {
        await logRejection(event, 'content_flagged', analysis.flags);
        return;
      }
      break;

    case 'sandboxed':
      break;  // Process with reduced capabilities (see security-levels.md Level 4)
  }

  await processWithAgent({
    id: event.data.email_id,
    from: event.data.from,
    to: event.data.to,
    subject: event.data.subject,
    body: email.text || email.html,
    receivedAt: event.created_at,
  });
}

async function logRejection(
  event: EmailReceivedWebhookEvent,
  reason: string,
  details?: string[]
): Promise<void> {
  console.log(`[SECURITY] Rejected email from ${event.data.from}: ${reason}`, details);

  if (config.ownerEmail) {
    await resend.emails.send({
      from: 'Agent Security <agent@yourdomain.com>',
      to: [config.ownerEmail],
      subject: `[Agent] Rejected email: ${reason}`,
      text: `
An email was rejected by your agent's security filter.

From: ${event.data.from}
Subject: ${event.data.subject}
Reason: ${reason}
${details ? `Details: ${details.join(', ')}` : ''}
      `.trim(),
    });
  }
}
```

## Troubleshooting

### "Cannot read properties of undefined (reading 'verify')"

**Cause:** Resend SDK too old.
**Fix:** `npm install resend@latest`
Or use the Svix fallback above.

### "Cannot read properties of undefined (reading 'get')"

**Cause:** SDK too old for `emails.receiving.get()`.
**Fix:** `npm install resend@latest && npm list resend`

### Webhook returns 400 errors

1. **Wrong signing secret** — recreate webhook via API to get a new one
2. **Body parsing issue** — use raw body, not parsed JSON
3. **SDK too old** — update to latest

### ngrok connection refused / tunnel died

**Cause:** Free ngrok tunnels time out and change URLs.
**Fix:** Restart ngrok, delete and recreate webhook via API.
**Better:** Use Tailscale Funnel or deploy to production.

### Email received but no webhook fires

1. Webhook is "Active" in dashboard?
2. Endpoint URL correct (including path)?
3. Tunnel running?
4. Check "Recent Deliveries" on webhook for status codes

### Security check rejecting all emails

1. Sender in `ALLOWED_SENDERS` list?
2. Case mismatch? Comparison should be case-insensitive
3. Debug: `console.log('Sender:', event.data.from.toLowerCase())`

### Agent doesn't auto-respond

**Expected.** The webhook delivers a notification; the user instructs the agent how to respond.
