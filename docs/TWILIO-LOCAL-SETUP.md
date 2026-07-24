# Twilio local setup — ShopRally operator (Tabish)

Step-by-step for connecting ShopRally’s **platform** Twilio account on your machine. Shops never enter these credentials — only you (platform ops) put them in `.env`.

**Related:** [`two-way-sms.md`](./two-way-sms.md) (architecture, A2P, production checklist)

---

## What you need

| Item | Who |
|------|-----|
| Twilio Account SID + Auth Token | ShopRally platform (you) |
| Per-shop SMS number | Platform provisions via **Platform → Shops → Manage SMS** |
| Shop landline / area code / notes | Shop owner submits **Settings → Phone & SMS → Request SMS setup** |
| Inbound webhooks | Public `APP_URL` (ngrok locally, Vercel in prod) |

---

## 1. Create a Twilio account

1. Go to [console.twilio.com](https://console.twilio.com) and sign up ( **trial is fine** for Macuto testing).
2. Complete phone verification when prompted.
3. Stay on the **Account Dashboard** home page after login.

---

## 2. Copy Account SID and Auth Token

On the Twilio Console **Account Dashboard**:

1. Find **Account Info** (top of the page).
2. Copy **Account SID** — starts with `AC…`.
3. Click **Show** next to **Auth Token** and copy the token (shown once; regenerate if lost).

Do **not** paste these into git, Slack, or shop settings — platform env only.

---

## 3. Add keys to `.env`

In the ShopRally repo root (`ShopRally/.env`), add or update:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Public origin Twilio uses for webhooks (see step 5 for local ngrok)
APP_URL=https://your-public-https-origin
```

Optional (dev fallback only — **not** for production multi-tenant):

```env
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

Never commit `.env`. `.env.example` documents variable names only.

---

## 4. Restart dev stack

From `ShopRally/`:

```bash
npm run db:dev
```

Leave that terminal open, then in another:

```bash
npm run dev
```

Open **http://localhost:3031**.

Settings → Phone & SMS should show **Twilio connected** (not Mock mode) once SID + token load.

---

## 5. ngrok for inbound SMS (local)

Twilio must POST inbound texts to a **public HTTPS** URL.

1. Install [ngrok](https://ngrok.com/) if needed.
2. With `npm run dev` on port **3031**:
   ```bash
   ngrok http 3031
   ```
3. Copy the `https://….ngrok-free.app` (or similar) forwarding URL.
4. Set in `.env`:
   ```env
   APP_URL=https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app
   ```
5. **Restart `npm run dev`** so webhook URLs rebuild from `APP_URL`.

Set `APP_URL` **before** provisioning a number (step 6) so Twilio stores the correct webhook on the new number.

---

## 6. Verify your personal phone (Twilio trial)

Trial accounts can only send SMS to **verified** numbers:

1. Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**.
2. Add your cell and complete verification (SMS or call).

You’ll use this number for **Send test** in step 8.

---

## 7. Provision Macuto test number (platform admin)

1. Sign in as platform admin (`PLATFORM_ADMIN_EMAIL` in `.env`, default `platform@getshoprally.com`).
2. **Platform → Shops** → **Macuto Auto Repair** → **Manage SMS**.
3. Optional area code: `718` (or leave blank for shop state default).
4. Click **Provision test number**.

The app buys a local SMS-capable number, sets Messaging + Voice webhooks to `{APP_URL}/api/webhooks/twilio/…`, and writes `Shop.twilioPhoneNumber`.

**Seed note:** Macuto ships with placeholder `+17185550199` — not a real Twilio number. Clear it in Manage SMS (or re-seed) before provisioning if you see “already has a number.”

**Shop request queue:** If the shop submitted **Request SMS setup** first, Manage SMS shows landline, preferred area code, and notes — use them when provisioning.

---

## 8. Shop wizard + send test

1. **Platform → Enter shop CRM** (Macuto) or use enter link with `shop=shop_macuto`.
2. **Settings → Phone & SMS**:
   - Step 1 — confirm assigned Twilio number.
   - Step 2 — webhook URLs (use **Sync webhooks to Twilio** if needed).
   - Step 3 — accept SMS addendum + TCPA acknowledgment.
   - Step 4 — enable 2-way SMS → **Send test** to your verified phone.

For inbound: text the shop Twilio number from a phone that matches a Macuto customer (`Customer.phone`). Run `npm run db:seed-macuto-sms-consent` if consent flags are missing on an older DB.

---

## Quick status checks

| Check | Expected |
|-------|----------|
| `.env` `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` | Both set |
| Settings → Phone & SMS platform badge | **Twilio connected** |
| Platform → Shops → Macuto SMS column | Number + Enabled |
| Test send | “Test sent via Twilio” (not mock) |
| Inbound | Message in **Workspace → Messages** |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Mock mode / no live send | Add SID + token; restart dev |
| “Unable to create record” on send (trial) | Verify destination in Twilio Console |
| Inbound never arrives | `APP_URL` must be public HTTPS; re-provision or **Sync webhooks** |
| Provision blocked — shop has number | Clear seed placeholder or assign manually after port |
| Shop stuck on “Request pending” | Platform → Manage SMS → Provision or Assign |

---

## Should you upgrade Twilio for live demos?

**Yes — upgrade if** you want a **permanent demo number** that stays with ShopRally and you will text **phones that aren’t pre-verified** (real prospect cells during a live walkthrough).

| | Trial | Upgraded (paid) |
|--|-------|-----------------|
| Account SID / Auth Token | Yes | Yes |
| Buy / keep a number | Yes (limited) | Yes |
| Text to any US mobile | Only **verified** numbers | Yes (after A2P as needed) |
| Best for | Solo Macuto / Planet Auto wiring | Sales demos + lasting “demo line” |

**Recommendation:** Upgrade the Twilio account you use for ShopRally platform, buy **one local number labeled “Planet Auto demo”**, and never reuse your Spectrum / Tekmetric shop line (`518-213-7288`) for demos — keep that for production cutover later.

You do **not** need to finish toll-free verification for a normal local demo number.

---

## Planet Auto — Ignition demo CRM

Dedicated tenant for sales / Twilio demos (Ignition = STARTER, SMS release ON).

```bash
npm run db:seed-planet-auto
# optional legal unblock:
node --env-file=.env scripts/seed-qa-legal-acceptances.mjs shop_planet
```

| | |
|--|--|
| Shop ID | `shop_planet` |
| Enter CRM | http://localhost:3031/platform/enter?shop=shop_planet&next=/dashboard |
| Estimate demo | …`/repair-orders/ro_planet_1001/estimate` |
| Messages | …`/messages` |

**Attach the demo number**

1. Twilio Console → buy/keep a number (after upgrade preferred).
2. Platform → **Planet Auto** → Manage SMS → **Assign** E.164 → Sync webhooks.  
   Or **Provision test number** if you want Twilio to buy a fresh one for this shop.
3. Enter Planet Auto → Settings → Phone & SMS → enable → Send test.
4. For inbound demos, set customer **Ava Nguyen**’s phone to your cell (with SMS consent already seeded).

Planet Auto starts with **no** Twilio number assigned (`twilioPhoneNumber` null) on purpose — avoid seed placeholders.

---

## Production (Vercel)

Same platform keys on Vercel env; `APP_URL=https://app.getshoprally.com` (or your prod domain). No ngrok. See **Production go-live checklist** in [`two-way-sms.md`](./two-way-sms.md).
