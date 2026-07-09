# Data Compliance & Audit Agent — ShopRally CRM

**Branch:** `feature/data-compliance-audit`  
**Skill:** `.cursor/skills/data-compliance-audit/SKILL.md`  
**Status:** `DATA-COMPLIANCE-BUILD-STATE.md`

This agent implements data governance and audit rules for US auto-repair CRM compliance. It runs **in isolation** from Dev 3004 — no dev server, no `.env` changes, no merge until user approves.

---

## Legal context (engineering parameters, not legal advice)

| Domain | ShopRally role | Product requirement |
|--------|-------------|---------------------|
| Shop customer PII | Processor / service provider | Tenant isolation, assist delete/export, minimal retention |
| TCPA / 10DLC | Enables SMS tooling | Separate transactional vs marketing consent + proof records |
| PCI DSS | Payment facilitator via Stripe | No PAN/CVV in DB or logs; Checkout/Connect tokens only |
| CCPA/CPRA | Service provider to CA shops | DPA on file; use data only per contract |
| FTC Safeguards | Vendor to shops that finance | Encryption, access control, vendor oversight, secure disposal |
| ESIGN | Public `/approve/[token]` | IP, timestamp, document hash, intent |

Reference: `docs/SHOP_ONBOARDING.md`, `src/server/platform/onboarding-compliance.ts`

---

## Who needs what (no extra settings)

| Need | Shop operator (tenant) | ShopRally parent (platform) |
|------|------------------------|---------------------------|
| **Consent at point of capture** | Customer add/edit, intake, booking — separate transactional vs marketing checkboxes | SMS Addendum + legal docs versioned in platform |
| **Activity proof on a job** | RO **Activity log** panel (estimate/payment context) | — |
| **Legal agreements** | **Settings → Legal** (accept shop-facing addenda) | `/platform/onboarding` checklist, `LegalAcceptance`, MSA at provision |
| **Provisioning audit** | — | `PlatformAuditEvent` (shop create / intake / activate) |
| **Retention & purge** | Nothing in Settings — defaults in code; soft-delete from customer record when wired | Platform cron → `runShopRetentionJob()`; optional `ShopDataPolicy` overrides via support, not shop UI |
| **Shop-wide audit table** | Not needed — operators care about RO/customer context | Platform support console (future) |
| **DSAR export / delete** | Customer detail actions (permission-gated), not a settings page | Support escalation for cross-tenant issues |
| **PCI / TCPA gates** | Invisible — blocks bad sends at send time | Stripe + subprocessor oversight |

**Rule:** Do not add Settings tabs for compliance infrastructure. Wire behavior into existing flows (customer forms, RO panels, messaging send, platform onboarding).

---

## Data tiers

| Tier | Examples | Rules |
|------|----------|-------|
| T1 PII | Customer name, phone, email, address | RBAC, audit on write/export/delete |
| T2 Vehicle ID | VIN, plate | Same as T1 |
| T3 Financial | Invoices, payments, estimates | Immutable audit, long retention |
| T4 Cardholder | Stripe IDs only | Never store PAN/CVV |
| T5 Comms | `Message`, campaigns | Consent-gated; separate retention |
| T6 Consent evidence | `ConsentRecord`, `LegalAcceptance` | Append-only, 4+ years |
| T7 Audit | `ShopAuditEvent`, `PlatformAuditEvent` | Append-only WORM, 7 years |

---

## Retention defaults (`ShopDataPolicy`)

| Field | Default days | Notes |
|-------|--------------|-------|
| `roRetentionDays` | 2555 (~7y) | Closed RO + invoice |
| `auditRetentionDays` | 2555 | Shop audit events |
| `messageRetentionDays` | 1095 (~3y) | SMS/email bodies |
| `consentRetentionDays` | 1460 (~4y) | TCPA evidence |
| `anonymizeAfterDeleteDays` | 30 | Grace before PII wipe |

---

## Audit event catalog

**Existing:** estimate + payment types in `ShopAuditEventType` enum.

**Add:**

- Customer: `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DELETED`, `CUSTOMER_ANONYMIZED`, `CUSTOMER_EXPORTED`
- Consent: `CONSENT_GRANTED`, `CONSENT_REVOKED`, `MARKETING_OPT_IN_CHANGED`
- Public approval: `ESTIMATE_APPROVED_BY_CUSTOMER` (**gap today** on `/approve/[token]`)
- Share links: `ESTIMATE_LINK_CREATED`, `ESTIMATE_LINK_REVOKED`, `INVOICE_LINK_CREATED`, `INVOICE_LINK_REVOKED`
- Messaging: `SMS_SENT`, `CAMPAIGN_LAUNCHED`
- Settings: `SETTINGS_CHANGED`, `EMPLOYEE_ROLE_CHANGED`
- Lifecycle: `RETENTION_JOB_RUN`, `DSAR_EXPORT`

**Audit row rules:**
- Append-only; `actorUserId`/`actorEmail` for staff; `metadata.actorType` for customer/system/webhook
- Never log forbidden fields (see `FORBIDDEN_LOG_FIELDS` in policy module)
- Reads scoped by `shopId` + RO ownership

---

## Phase checklist

### Phase 0 — Foundation (blocking)
- [ ] `src/server/permissions.ts`
- [ ] `src/server/permission-gates.ts` (all `gates.*` used in actions)
- [ ] `src/server/shop-audit.ts` with tenant-scoped reads
- [ ] `src/lib/shop-audit-display.ts`
- [ ] `src/components/repair-order/ro-audit-trail-panel.tsx`
- [ ] `npx tsc --noEmit` passes

### Phase 1 — Policy module
- [ ] `src/lib/data-compliance.ts` — tiers, retention defaults, consent helpers, forbidden log fields

### Phase 2 — Schema
- [ ] `ConsentRecord` model
- [ ] `ShopDataPolicy` model
- [ ] Customer: `transactionalSmsConsent`, `marketingEmailConsent`, `deletedAt`, `anonymizedAt`
- [ ] Extended `ShopAuditEventType` enum
- [ ] Migration `--create-only` (do not deploy)

### Phase 3 — Audit wiring
- [ ] Customer CRUD/export → audit events
- [ ] `submitCustomerApproval` → `ESTIMATE_APPROVED_BY_CUSTOMER`
- [ ] Share links → dedicated event types
- [ ] Campaigns/messaging → consent check + audit

### Phase 4 — Consent UX
- [ ] Separate unchecked checkboxes: transactional SMS vs marketing (intake + add customer)
- [ ] Write `ConsentRecord` on change

### Phase 5 — Gates
- [ ] Block marketing SMS without marketing consent
- [ ] Block SMS if shop lacks current `SMS_ADDENDUM`
- [ ] Optional: block CRM writes until `checkShopLegalCompliance()` (respect exempt paths)

### Phase 6 — In-flow UI (not new settings pages)
- [ ] RO activity log panel (existing estimate/payment tabs)
- [ ] Consent checkboxes on customer add/edit + intake
- [ ] Customer detail: export / delete when product-ready (uses `customer-data.ts` actions)
- [ ] **Do not** add `/settings/data-compliance` or `/settings/audit-log`

### Phase 7 — Docs
- [ ] Extend `docs/SHOP_ONBOARDING.md` compliance section

### Phase 8 — Platform retention (no shop UI)
- [ ] `runShopRetentionJob` — purge messages/consent, anonymize after grace
- [ ] `runPlatformDataRetentionJob` — all ACTIVE/TRIAL/SUSPENDED shops
- [ ] Inngest `data-retention-nightly` + `/api/cron/data-retention`
- [ ] Hide soft-deleted/anonymized customers from list + type-ahead search

---

## Files you may touch

```
src/lib/data-compliance.ts
src/lib/shop-audit-display.ts
src/server/permissions.ts
src/server/permission-gates.ts
src/server/shop-audit.ts
src/server/actions/customers.ts
src/server/actions/campaigns.ts
src/server/actions/messaging.ts
src/server/actions/share.ts
src/server/approval.ts
src/server/jobs/data-retention.ts
src/components/repair-order/ro-audit-trail-panel.tsx
src/components/customers/add-customer-dialog.tsx
src/components/repair-order/edit-customer-dialog.tsx
src/server/actions/customer-data.ts
prisma/schema.prisma
prisma/migrations/*data_compliance*
docs/SHOP_ONBOARDING.md
agents/ShopRallyCRM/DATA-COMPLIANCE-BUILD-STATE.md
scripts/smoke-compliance.ts (optional)
```

## Files you must NOT touch

```
.env*
next.config.ts (ports)
package.json scripts for dev ports
src/app/layout.tsx design mode
src/components/design-mode/**
src/components/crm/** (unless adding settings nav item)
_archive-repairpilot/**
```

---

## Cursor prompt (paste to start a session)

```
You are the ShopRally Data Compliance agent on branch feature/data-compliance-audit.

Read:
- .cursor/skills/data-compliance-audit/SKILL.md
- agents/ShopRallyCRM/DATA-COMPLIANCE-AGENT.md
- agents/ShopRallyCRM/DATA-COMPLIANCE-BUILD-STATE.md

Do NOT run npm run dev or edit .env. Do NOT commit or push.

Start Phase 0: restore missing foundation (permissions, permission-gates, shop-audit, ro-audit-trail-panel). Then continue phases in order until tsc passes. Update BUILD-STATE as you go.
```
