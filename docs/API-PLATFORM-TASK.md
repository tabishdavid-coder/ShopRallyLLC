# API & Developer Platform — Parked Task

**Status:** Parked (not started)  
**Parked:** 2026-07-03  
**Owner:** ShopRally platform  
**Related:** M11 in `docs/competitive-gap-analysis.md`, `docs/cloud-architecture.md`

---

## Why this task exists

Competitors (Shopmonkey, Tekmetric, AutoLeap, Shop-Ware) use APIs to extend shop workflow — parts, accounting, payments, marketing, DVI — and to create switching costs via integration marketplaces. ShopRally today is an **integration consumer** (Stripe, Twilio, Inngest inbound) but not an **integration publisher** (no shop API keys, no outbound webhooks, no public REST).

**Window:** Tekmetric is [not processing new API applications](https://api.tekmetric.com) while security frameworks are updated — ISVs need alternatives.

**ShopRally advantage to preserve:** Built-in Growth Engine (campaigns, automations, win-back) can consume our own webhooks without third-party marketing APIs.

---

## Current state (audit snapshot)

| Capability | Status |
|------------|--------|
| Public REST API (`/api/v1/*`) | ❌ |
| Shop API keys + scopes | ❌ |
| Outbound event webhooks | ❌ |
| Partner OAuth apps | ❌ |
| OpenAPI / developer portal | ❌ |
| Inbound vendor webhooks | ✅ Stripe, Twilio, Inngest |
| Swappable provider interfaces | ✅ `src/server/services/*` |
| Per-shop integration creds | ✅ `ShopIntegration` model |
| Token-based customer pages | ✅ `/approve/[token]`, `/invoice/[token]` |
| API key precedent | ⚠️ `POST /api/tires/intake` (`x-api-key`) |
| CRM writes | Server Actions only (~64 files in `src/server/actions/`) |
| tRPC | Documented in CLAUDE.md, not implemented |

---

## Target state

Shops and partners can connect ShopRally to their stack without email-to-support:

1. **Outbound webhooks** — HMAC-signed events on RO, payment, appointment, customer lifecycle
2. **Shop self-serve API keys** — scoped read/write in Settings (Professional+)
3. **Versioned REST API** — `/api/v1/*` for customers, vehicles, ROs, appointments
4. **Partner OAuth apps** — ISV register → shop consent → scoped access
5. **Developer portal** — OpenAPI spec, sandbox tenant, webhook catalog
6. **Integration directory** — marketing + in-app connect flows (PartsTech, QBO, Zapier)

---

## Phased checklist

### Phase 1 — Quick wins (weeks)

- [ ] **Webhook event catalog** — document events: `repair_order.created|updated|completed`, `payment.captured`, `appointment.scheduled`, `customer.created`
- [ ] **Prisma models** — `WebhookEndpoint`, `WebhookDelivery` (url, secret, events[], shopId)
- [ ] **Outbound webhook dispatcher** — HMAC-SHA256 signing; retry via Inngest
- [ ] **Settings UI** — Settings → Developers: add/edit/test webhook endpoints
- [ ] **Shop API keys** — `ApiKey` model (shopId, scopes, hashed secret, expiresAt)
- [ ] **Settings UI** — generate/revoke API keys; show once on create
- [ ] **Rate limiting** — extend `src/lib/rate-limit.ts` to `/api/v1/*` and webhook registration
- [ ] **Plan gate** — `integrations` feature on Professional+; CDC/stream on Premier (Enterprise)

### Phase 2 — Public REST v1 (1–2 months)

- [ ] **Extract domain services** from Server Actions → `src/server/services/` (shared by actions + API)
- [ ] **REST routes** — `GET/POST/PATCH` for customers, vehicles, repair orders, appointments
- [ ] **API auth middleware** — bearer token from shop API key; resolve `shopId` from key (never from client body)
- [ ] **OpenAPI spec** — generate or hand-write; publish at `/developers` or `developers.karvio.com`
- [ ] **Sandbox shop** — platform admin creates test tenant + test keys for partners
- [ ] **QuickBooks Online OAuth** — invoices, payments, customers (table stakes vs Tekmetric/AutoLeap)
- [ ] **PartsTech live punchout** — complete partner API path (M7/M9 dependency)

### Phase 3 — Partner ecosystem (2–4 months)

- [ ] **OAuth 2.0 apps** — `client_id`, shop consent screen, scoped permissions
- [ ] **Partner apply page** — `/developers/partners` + platform admin approval in `/platform`
- [ ] **Integration directory** — `/integrations` marketing page + in-app vendor hub tiles
- [ ] **Zapier / Make partner application** — distribute via no-code automation
- [ ] **DVI partner contract** — document RO write-back events for AutoVitals / Bolt On-style vendors
- [ ] **Clerk webhook** — `/api/webhooks/clerk` (user + org sync; documented, not built)
- [ ] **Stripe SaaS billing webhook** — `/api/webhooks/stripe-billing` (platform subscriptions)

### Phase 4 — Strategic (3–6+ months)

- [ ] **App marketplace** — ISV register → shop install → OAuth in `/platform`
- [ ] **Event stream / CDC export** — Premier tier: Postgres replica or webhook fan-out to warehouse
- [ ] **Official MCP + AI agent API** — typed read API for AI tooling
- [ ] **Migration importers** — read from Tekmetric / Shopmonkey for shop onboarding
- [ ] **Enterprise API tier** — usage metering, SLA, dedicated sandbox

---

## Key files when work starts

| Area | Paths |
|------|-------|
| New REST surface | `src/app/api/v1/` |
| API auth & validation | `src/server/api/` |
| Outbound webhooks | `src/server/api/webhooks-outbound/` |
| Schema | `prisma/schema.prisma` |
| Existing patterns | `src/app/api/tires/intake/route.ts`, `src/lib/rate-limit.ts` |
| Domain logic to extract | `src/server/actions/*.ts` |
| Tenancy | `src/lib/shop.ts`, `src/server/permission-gates.ts` |
| Plans / gating | `src/lib/plans.ts`, `src/lib/features.ts` |
| Settings UI | `src/app/(app)/settings/integrations/`, new `settings/developers/` |
| Docs | `docs/cloud-architecture.md`, this file |

---

## Competitor reference (research 2026-07-03)

| Platform | Developer portal | Shop API keys | Webhooks | Notes |
|----------|-------------------|---------------|----------|-------|
| [Shopmonkey](https://shopmonkey.dev/) | ★★★★★ | Admin-generated | HMAC, CRUD API | Best DX in segment |
| [Tekmetric](https://api.tekmetric.com) | ★★★★☆ | Partner only | Weak public docs | **New apps paused** |
| [AutoLeap](https://developers.myautoleap.com/) | ★★★★☆ | Partner only | Limited | Broad write API |
| [Shop-Ware](https://developers.shop-ware.com/) | Partner-gated | Per-partner creds | Unknown | Enterprise pricing |
| [RepairShopr](https://api-docs.repairshopr.com/) | Swagger | Scoped tokens | Limited | Good small-shop model |

**Industry integration priority:** Parts → QuickBooks → Payments → Marketing/DVI → VIN/CARFAX → Telephony → Reviews.

---

## Unblocks / dependencies

| Dependency | Blocks |
|------------|--------|
| Clerk orgs wired | Real multi-user API key ownership |
| Domain service extraction | REST without duplicating Server Action logic |
| `UPSTASH_*` or equivalent | Production rate limits before public API |
| PartsTech partner credentials | Live punchout parity on integration directory |
| Intuit OAuth app | QuickBooks Online sync |

---

## How to pick this up

1. Read this doc + codebase audit in agent transcript (2026-07-03 API research session).
2. Start **Phase 1** — webhooks + API keys (smallest slice, highest leverage).
3. Update `CLAUDE.md` Current status and check boxes here as phases complete.
