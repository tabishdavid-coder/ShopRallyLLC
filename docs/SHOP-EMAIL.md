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

Outbound path: `sendShopEmail()` → Resend with shop From / Reply-To. Not ready → mailto fallback.

## Provision defaults

New shops get **From name** = shop name and **From / Reply-to** = shop business email when present. **`emailEnabled` stays false** until the shop enables (or completes a successful test). Defaults alone do not go live.

## Key files

- UI: `src/components/settings/email-settings.tsx` · `/settings/communications/email`
- Actions: `src/server/actions/email-settings.ts`
- Send: `src/server/services/shop-email.ts`
- Share: `src/server/actions/share.ts` + Share dialogs / `EmailNotConfiguredBanner`

## Deferred

Custom domain DNS wizard, per-shop Resend API keys, HTML templates, `EmailSendLog` table.
