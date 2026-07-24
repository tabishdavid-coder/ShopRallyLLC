# Two-way SMS (platform-managed, per shop)

ShopRally uses **Twilio** for shop-to-customer SMS — the same carrier model Tekmetric and Shopmonkey use behind the scenes (hosted SMS on a business number, not personal cell phones).

## Ignition (= Core = STARTER)

Two-way advisor SMS is **included** on the launch plan. These names are interchangeable:

| You say | Meaning |
|---------|---------|
| **Ignition** | Marketing / GTM (`PLANS.STARTER.marketingName`) |
| **Core** | In-app CRM label (`PLANS.STARTER.name`) |
| **STARTER** | Prisma `ShopPlan` / platform assign value |

**Not Ignition:** Marketing campaign / automation SMS (Growth Engine) — Pro+ only.

**Showcase shop:** Macuto Auto Repair (`shop_macuto`) — seeded as STARTER with `_release.sms: true`.

### Gate stack (all must pass for live send)

1. Plan: `customerSms: true` on STARTER
2. `SMS_ENABLED` not `false`
3. `planFeatures._release.sms: true` (prod default OFF; Macuto seed ON; local/dev often default-open)
4. Shop: `smsEnabled` + real `twilioPhoneNumber`
5. Legal: SMS addendum accepted
6. Customer: `transactionalSmsConsent: true` (+ phone matching handset for inbound)

---

## How to request a number (operator checklist)

**Local dev operator guide:** [`TWILIO-LOCAL-SETUP.md`](./TWILIO-LOCAL-SETUP.md) — Account SID, Auth Token, ngrok, Macuto provision, test send.

Use this for Ignition live testing on Macuto (or any shop).

### Prerequisites

1. Twilio account (trial OK) — Console → Account → API keys / Auth Token
2. `.env` platform keys:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   APP_URL=https://YOUR_PUBLIC_HTTPS_ORIGIN   # ngrok for local inbound
   ```
3. Local CRM: `npm run db:dev` (leave open) then `npm run dev` → http://localhost:3031
4. Twilio trial: verify your personal cell under **Phone Numbers → Verified Caller IDs**

### In-app provision (preferred)

1. Open Platform admin → **Shops** → **Macuto Auto Repair** → **Manage SMS**
2. Click **Provision test number** (optional area code, e.g. `718`)
3. App calls `provisionShopSmsNumber` → Twilio buys a local SMS-capable number, sets Messaging webhook to `{APP_URL}/api/webhooks/twilio/sms`, writes `Shop.twilioPhoneNumber`, sets `smsEnabled: true`
4. Enter Macuto CRM → **Settings → Phone & SMS** → confirm number → **Send test** to your verified phone
5. For inbound: set `APP_URL` to a public HTTPS tunnel (`ngrok http 3031`) **before** provision/sync so Twilio can POST back
6. Text the shop Twilio number from a phone whose digits match a Macuto customer (`Customer.phone` / `altPhone`). Seed demo customers have consent; update Maria Cortes’ phone to your handset for a clean inbound match.

### Alternate: assign from Twilio Console

1. Twilio Console → buy/assign a number with SMS
2. Platform → Shops → Manage SMS → **Assign** E.164 → **Sync SMS + Voice webhooks**
3. Complete shop Phone & SMS wizard + test send

### Notes

- Seed placeholder `+17185550199` is **not** a real Twilio number — replace via provision/assign
- Do **not** use global `TWILIO_FROM_NUMBER` in production multi-tenant
- Without SID/token the UI runs in **mock mode** (DB threads work; no carrier)


## Platform vs shop responsibility

| Who | Responsibility |
|-----|------------------|
| **ShopRally platform admin** | One Twilio account (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`); A2P 10DLC brand registration; webhook URL on stable domain; provision or assign numbers per shop from **Platform → Shops** |
| **Shop owner / admin** | **Settings → Phone & SMS** — submit **Request SMS setup** (landline, area code, notes); after platform assigns a number, complete wizard, verify webhook, enable SMS, send test |
| **Never in production** | A single global `TWILIO_FROM_NUMBER` shared by all shops — dev-only fallback with console warning |

Each shop is isolated: inbound `To` → `Shop.twilioPhoneNumber` lookup; outbound sends from that shop's number only.

## How Tekmetric / Shopmonkey actually work

These products do **not** magic your existing landline into SMS without a carrier step:

1. **Number port or hosted SMS** — Your shop's published phone number (often a landline or main shop line) is either **ported** to an SMS-capable carrier (Twilio, Bandwidth, etc.) or enrolled in **hosted SMS** so the same digits can send/receive texts.
2. **CRM as the UI** — Inbound texts hit a webhook → matched to a customer by caller ID → shown in threads on the customer profile and repair order.
3. **Outbound from the shop number** — Advisors text from the CRM; Twilio sends as the shop's configured number (Text-to-Pay, estimate links, status updates).
4. **Per-location routing** — Multi-shop platforms map each inbound `To` number to the correct tenant/shop.

ShopRally mirrors this: platform Twilio credentials in env, **per-shop `twilioPhoneNumber`** for routing, inbound webhooks at `/api/webhooks/twilio/sms` and `/api/webhooks/twilio/voice`.

## Voice receptionist (Premier)

After-hours **AI voice** uses the same Twilio number as SMS:

| Webhook | URL |
|---------|-----|
| Messaging (SMS) | `{APP_URL}/api/webhooks/twilio/sms` |
| Voice | `{APP_URL}/api/webhooks/twilio/voice` |

New platform-provisioned numbers get both URLs automatically. For older numbers, use **Settings → Phone & SMS → Step 2 → Sync webhooks to Twilio** or platform **Sync SMS + Voice webhooks**.

Full E2E test checklist: **`docs/voice-receptionist-test.md`**.

## Architecture in ShopRally

| Layer | Implementation |
|-------|----------------|
| Platform credentials | `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, optional `TWILIO_MESSAGING_SERVICE_SID` |
| Send | `sendShopSms()` in `src/server/services/messaging.ts` → shop `twilioPhoneNumber` + STOP footer |
| Persist | `Message` model (shopId, customerId, optional repairOrderId) |
| Inbound | `POST /api/webhooks/twilio/sms` → `resolveShopForInbound(To)` → `recordInboundSms` |
| UI | RO message dialog, `/messages` inbox, **Settings → Phone & SMS** (3-step wizard) |
| Platform admin | **Platform → Shops** — SMS column, provision test number, manual assign after port |
| Shop config | `Shop.landlineNumber`, `Shop.twilioPhoneNumber`, `Shop.smsEnabled`, `Shop.smsOptOutFooter`, `Shop.smsConfiguredAt` |

## Setup paths

### Option A — Port landline to Twilio (production)

Best when customers already know your shop number.

1. ShopRally platform admin creates/manages the Twilio account.
2. Twilio Console → **Phone Numbers → Port & Host → Port a Number**.
3. Submit a **Letter of Authorization (LOA)** with your current carrier bill showing the number.
4. Typical port time: **2–4 weeks** (US local numbers).
5. Once active, enable **SMS** on the number and set the messaging webhook:
   ```
   https://YOUR_DOMAIN/api/webhooks/twilio/sms
   HTTP POST
   ```
   (Use `APP_URL` — ShopRally signs webhooks against this canonical URL.)
6. Platform admin assigns the E.164 number to the shop (**Platform → Shops → Manage SMS**) or shop enters it in **Settings → Phone & SMS**.

### Option B — Platform-provisioned local number (dev/staging)

1. Platform admin → **Platform → Shops → Manage SMS → Provision test number** (requires Twilio keys).
2. Twilio buys a local SMS number, sets webhook automatically, assigns to shop.
3. Shop completes **Settings → Phone & SMS** wizard and sends a test message.

### Option C — Hosted SMS on landline (carrier partner)

Some US carriers allow SMS on fixed lines via Twilio/Bandwidth **Hosted SMS** without a full port. Requires carrier approval — coordinate with Twilio sales.

## Environment variables

```env
# Platform (ShopRally ops — one account for all shops)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=   # optional — A2P 10DLC Messaging Service at platform level
APP_URL=https://app.getshoprally.com   # required in prod — webhook signature + public links

# Dev-only fallback when a shop has no twilioPhoneNumber yet (NOT for production multi-tenant)
TWILIO_FROM_NUMBER=

# SMS_ENABLED=false   # hide UI / block sends
```

Inbound webhook must be reachable on the public `APP_URL` (Vercel prod or ngrok for local dev).

## Per-shop configuration (shop owner)

1. Open **Settings → Phone & SMS**.
2. **Step 1** — Landline (display) + Twilio SMS number (from platform or after port).
3. **Step 2** — Confirm webhook URL matches Twilio Console.
4. **Step 3** — Enable 2-way SMS, set opt-out footer, send test to your phone.

Inbound routing: Twilio `To` is matched against `Shop.twilioPhoneNumber` (unique per shop). Unmatched numbers return 200 with empty TwiML (no retries).

## A2P 10DLC (US commercial SMS)

Register **one brand** at the ShopRally platform level in Twilio Trust Hub. Per-shop campaigns are optional when each shop has its own number — coordinate with Twilio support for multi-tenant campaign strategy.

## Customer matching

Inbound `From` is matched to `Customer.phone` or `Customer.altPhone` within the resolved shop (10-digit normalized). Unmatched messages are logged and dropped (Twilio still gets 200 to avoid retries).

Active repair order context: the most recently updated open RO (Estimate / Approved / In Progress) is linked to the message.

## TCPA / opt-out

Outbound messages append the shop's `smsOptOutFooter` (default: "Reply STOP to opt out.") when the body does not already mention STOP. The RO message dialog shows a notice when `Customer.marketingOptIn` is false.

## Mock mode

Without Twilio env vars, `getSms()` uses **mock mode**: messages are stored in the database, logged to console, and the UI can offer a native `sms:` fallback link.

## Testing locally

1. **Mock mode** — omit Twilio keys; UI and message persistence still work.
2. **Twilio trial** — set platform keys; verify your personal phone in Twilio Console; use **Provision test number** or trial number (see **How to request a number** above).
3. **Live inbound** — `ngrok http 3031` → set `APP_URL=https://xxxx.ngrok.io` → provision or **Sync webhooks**.
4. **Routing script** — `npx tsx scripts/test-sms-routing.ts +17185550199` (or the provisioned Macuto number).
5. Send SMS to the shop Twilio number from a phone matching a seeded customer → check **Messages** inbox (Workspace → Messages).
6. **Consent:** Macuto demo customers (Maria, James, Sandra, Kevin + QA bulk) seed with `transactionalSmsConsent: true`. If an existing DB predates that seed, run `npm run db:seed-macuto-sms-consent` or full `npm run db:seed`.

## Production go-live checklist

- [ ] Platform Twilio account + A2P 10DLC brand registered
- [ ] `APP_URL` set to production HTTPS origin
- [ ] `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` on Vercel
- [ ] Each shop has unique `twilioPhoneNumber` + `smsEnabled`
- [ ] Each number's Messaging webhook → `{APP_URL}/api/webhooks/twilio/sms` POST
- [ ] Each number's Voice webhook → `{APP_URL}/api/webhooks/twilio/voice` POST (or use Sync webhooks)
- [ ] Premier shops: voice agent enabled in Settings → Phone & SMS (see `docs/voice-receptionist-test.md`)
- [ ] Shop owner completed Settings → Phone & SMS + test send
- [ ] Remove reliance on `TWILIO_FROM_NUMBER` (dev only)

## Related files

- `src/server/services/sms.ts` — Twilio REST, provisioning, opt-out footer
- `src/server/services/messaging.ts` — `sendShopSms`, inbound routing, shop status
- `src/server/actions/platform-sms.ts` — provision/assign/test (platform admin)
- `src/app/api/webhooks/twilio/sms/route.ts` — webhook + signature validation
- `src/app/(app)/settings/communications/phone-sms/page.tsx` — shop Phone & SMS wizard
- `src/app/(app)/platform/shops/page.tsx` — platform SMS column
- `scripts/test-sms-routing.ts` — inbound routing smoke test
- `scripts/seed-macuto-sms-consent.ts` — set transactionalSmsConsent on Macuto customers
