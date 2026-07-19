# Voice receptionist — test guide

End-to-end checklist for Premier **AI after-hours voice receptionist** (Phase 3H).

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Premier plan** | `ai_receptionist` feature |
| **`ANTHROPIC_API_KEY`** | Required for AI gather turns |
| **Twilio platform creds** | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Shop Twilio number** | Settings → Phone & SMS |
| **Migrations applied** | Through `20260630170000_review_reply_tone` |
| **Public HTTPS** | Prod `APP_URL` or ngrok for local |

### Dev overrides (non-production only)

```env
AI_VOICE_AGENT_ALWAYS_ON=true   # agent runs even when shop is "open"
AI_SMS_AGENT_ALWAYS_ON=true     # same for SMS agent
```

### Optional model override

```env
VOICE_AGENT_AI_MODEL=claude-haiku-4-5
```

---

## Step 1 — Configure webhooks

1. **Settings → Phone & SMS → Step 2**
2. Confirm URLs:
   - SMS: `{APP_URL}/api/webhooks/twilio/sms`
   - Voice: `{APP_URL}/api/webhooks/twilio/voice`
3. Click **Sync webhooks to Twilio** (numbers provisioned before voice shipped need this)

Platform admin: **Platform → Shops → SMS → Sync SMS + Voice webhooks**

Twilio Console → Phone Numbers → your number → **Voice** webhook must be POST to the Voice URL above.

---

## Step 2 — Enable the agent

**Settings → Phone & SMS → Step 4**

- [ ] Twilio number configured
- [ ] **AI after-hours voice receptionist** checked
- [ ] Optional: **AI after-hours SMS agent**
- [ ] Optional: landline for **open-hours forward**

Save. Voice agent runs when shop is **closed** (booking hours + timezone), unless `AI_VOICE_AGENT_ALWAYS_ON=true`.

---

## Step 3 — Local smoke tests (no phone call)

```powershell
cd ShopRally
npx tsx scripts/test-voice-agent-parse.ts
npx tsx scripts/test-review-reply-tone.ts
```

With dev server running (`npm run dev`):

```powershell
$env:APP_URL="http://localhost:3000"
npx tsx scripts/test-voice-webhook-local.ts +15551234567 +1YOUR_SHOP_TWILIO_NUMBER
```

Expect HTTP 200 and TwiML containing `<Say>`, recording consent, and `<Gather input="speech"`.

Inbound routing (DB required):

```powershell
npx tsx scripts/test-sms-routing.ts +1YOUR_SHOP_TWILIO_NUMBER
```

---

## Step 4 — Live call test (ngrok or production)

1. Start app: `npm run dev`
2. Tunnel: `ngrok http 3000`
3. Set `APP_URL=https://xxxx.ngrok-free.app` and restart dev server
4. **Sync webhooks to Twilio** again (URLs must match `APP_URL`)
5. Call your shop Twilio number from a mobile phone

### Expected after-hours flow

1. Recording consent message
2. AI greeting (“We're closed…”)
3. Speech gather — say name, concern, preferred date/time
4. AI confirms and may book appointment (`source: VOICE_AGENT`)
5. **Settings → Phone & SMS → Recent voice calls** shows the call

### Expected open-hours flow

- Forwards to **landline** if configured
- Otherwise closed-hours message (no AI)

---

## Step 5 — Verify CRM outcomes

| Check | Where |
|-------|--------|
| Call log row | Settings → Phone & SMS → Recent voice calls |
| New lead customer | Customers (Voice Lead) |
| Appointment | Appointments — source `VOICE_AGENT` |
| AI usage | Platform home → AI usage (`VOICE_RECEPTIONIST`) |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Call fails / Twilio error | Voice webhook URL missing → **Sync webhooks** |
| “Not configured” TwiML | `To` number not assigned to shop in CRM |
| No AI — just closed message | Shop is “open” per booking hours; use dev override or call after hours |
| 403 Invalid signature | `APP_URL` must match URL Twilio posts to; token must match |
| Gather works but no booking | Check appointment slots / booking settings |
| No recording URL | Twilio recording callback needs public HTTPS |

---

## Related files

- `src/app/api/webhooks/twilio/voice/` — inbound, gather, recording
- `src/server/services/voice-after-hours-agent.ts`
- `scripts/test-voice-webhook-local.ts`
- `docs/two-way-sms.md` — SMS + shared Twilio setup
