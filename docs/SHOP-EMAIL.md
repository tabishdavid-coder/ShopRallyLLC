# Shop-owned email (go-live)

**Decision (2026-07-18):** The shop owns their email. They enter it in Settings when they go live. All customer communication (estimate/invoice share, maintenance links, campaigns, booking confirmations) uses that shop-provided identity.

## Model

| Concern | Owner |
|--------|--------|
| From name, From address, Reply-to | Shop — Settings → Communications → Email |
| Transport | Platform Resend (`RESEND_API_KEY`) |
| Enable for CRM sends | Shop — explicit **Enable shop email** (or auto-enable after a successful test) |
| Domain verification | Ops/shop — verify the shop’s From domain in [Resend Domains](https://resend.com/domains) |

Fields on `Shop`: `emailFromName`, `emailFromAddress`, `emailReplyTo`, `emailEnabled`, `emailConfiguredAt`.

Outbound path: `sendShopEmail()` → Resend with shop From / Reply-To. Not ready → mailto fallback (or mock log in local dev when `RESEND_API_KEY` is unset).

## Platform contact vs shop email

| Address | Purpose |
|--------|---------|
| `hello@getshoprally.com` | ShopRally platform contact — marketing site, CRM Help & Support, billing, owner ops copy (`src/lib/brand.ts` → `PLATFORM_CONTACT_EMAIL`) |
| Shop `emailFromAddress` | Customer-facing estimate/invoice/campaign sends (shop-owned) |
| `PLATFORM_ADMIN_EMAIL` | Stub platform admin auth only — not shown as public contact |

### Marketing lead notifications

Demo, trial signup, founding waitlist, and website-need forms create a `SupportTicket` and email the ops inbox (`PLATFORM_LEAD_NOTIFY_EMAIL` / `PLATFORM_CONTACT_EMAIL` / `hello@getshoprally.com`) via `sendPlatformEmail` → Resend.

| Env | Role |
|-----|------|
| `RESEND_API_KEY` | Required for live lead emails (Vercel Production) |
| `EMAIL_FROM` | Recommended From on a verified domain; defaults to `ShopRally <hello@getshoprally.com>` |
| `PLATFORM_LEAD_NOTIFY_EMAIL` | Optional ops inbox override (comma-separated) |

If Resend is unset, the form still succeeds (DB ticket + `/platform/leads`); server logs `[marketing-lead-email] RESEND_API_KEY not configured`. Code: `src/server/services/marketing-lead-notify.ts`.

## Operator go-live checklist

Do these in order. Steps 1–3 are platform ops; 4–6 are per shop.

### 1. Resend account + API key (once per platform)

1. Create / sign in at [resend.com](https://resend.com).
2. Create an API key (full send access).
3. Paste into env (never commit):
   - **Local:** `RESEND_API_KEY=` in `ShopRally/.env` (see `.env.example`).
   - **Vercel:** Project → Settings → Environment Variables → `RESEND_API_KEY` (Production + Preview as needed).
4. Restart `npm run dev` / redeploy so the app picks up the key.
5. Optional legacy fallback for *internal* platform mail only: `EMAIL_FROM=` (must be on a verified Resend domain). Customer-facing CRM sends **do not** use this — they use the shop From address.

### 2. Verify the shop’s From domain in Resend

1. Decide the shop From address (e.g. `service@yourshop.com`).
2. In [Resend → Domains](https://resend.com/domains), add the domain (`yourshop.com`).
3. Add the DNS records Resend shows (SPF / DKIM — and DMARC if recommended).
4. Wait until Resend shows the domain as **Verified**.
5. Repeat for each distinct shop domain that will send (multi-tenant: one platform key, many verified domains).

Without domain verification, Resend rejects live sends even if `RESEND_API_KEY` and Settings fields look correct.

### 3. Confirm platform transport in the app

- Settings → Communications → Email → **Platform transport** badge should read **Resend connected** (not Mock mode).
- Platform console System view also reflects Resend vs mailto fallback when `RESEND_API_KEY` is set.

### 4. Per-shop Settings (CRM)

Path: **Settings → Communications → Email**

1. **From name** — display name customers see (defaults from shop name).
2. **From email** — address on the verified domain.
3. **Reply-to** — optional; where customer replies go.
4. Save, then either:
   - **Enable shop email**, or
   - **Send test** to a real inbox you control (success auto-enables and marks **Ready for Share**).

New shops get From/Reply defaults from provision/seed, but **`emailEnabled` stays false** until enable or a successful test.

### 5. Verify Share Estimate email

1. Open a repair order → Share estimate (email channel).
2. Expect **no** “Not ready for Share” banner when status is Ready.
3. Send to yourself or a test address (not a real customer on first go-live check).
4. Confirm inbox: From = shop identity, Reply-to as configured, link works.
5. If send fails: check Resend domain status for that From domain, then Settings fields + Enable/test again.

### 6. Local / mock behavior (no key)

| Condition | Behavior |
|-----------|----------|
| `RESEND_API_KEY` unset | Mock mode — test send logs to server console; Share may offer mailto fallback |
| Key set, shop not Ready | Mailto fallback for Share |
| Key set + shop Ready + domain verified | Live Resend send |

Do **not** invent placeholder API keys. Until the real key is in `.env` / Vercel, treat email as non-live.

## Provision defaults

New shops get **From name** = shop name and **From / Reply-to** = shop business email when present. **`emailEnabled` stays false** until the shop enables (or completes a successful test). Defaults alone do not go live.

## Key files

- UI: `src/components/settings/email-settings.tsx` · `/settings/communications/email`
- Actions: `src/server/actions/email-settings.ts`
- Send: `src/server/services/shop-email.ts`
- Transport: `src/server/services/email.ts` (`RESEND_API_KEY`, optional `EMAIL_FROM`)
- Share: `src/server/actions/share.ts` + Share dialogs / `EmailNotConfiguredBanner`

## Deferred

Custom domain DNS wizard, per-shop Resend API keys, HTML templates, `EmailSendLog` table.
