# Shop onboarding & compliance

ShopRally provisions **multi-tenant shop tenants** from the platform console (`/platform/**`). Each shop is isolated by `shopId` on every row, a unique **shop master ID** (`RP-{code}-{digits}` — legacy `RP-` prefix kept for compatibility), and explicit shop-context switching for platform admins.

This document summarizes industry patterns, our implementation, and the compliance checklist platform owners should verify before go-live.

---

## How competitors onboard shops

| Pattern | Tekmetric / Shopmonkey / AutoLeap | ShopRally |
|--------|-----------------------------------|-------------|
| **Entry** | Sales-led demo → account setup; some self-serve trial signup | Platform **Add shop** (direct) or **intake link** (`/onboard/shop/[token]`) |
| **Business info** | Legal name, EIN (10DLC), address, primary contact | `legalEntityName`, DBA `name`, address, `primaryContactName`, contact email |
| **Trial → paid** | Stripe/subscription after onboarding call | `BillingStatus.TRIAL` → Stripe Billing (stub) |
| **MSA / TOS** | Clickwrap at signup; re-accept on version bump | `/onboarding/legal` clickwrap → `LegalAcceptance` audit rows |
| **SMS / TCPA** | 10DLC registration, EIN match, SMS privacy policy (Tekmessage) | SMS Addendum + shop `marketingOptIn` on customers; Twilio 10DLC deferred |
| **Security** | Tekmetric SOC 2 | Tenant isolation + audit events; SOC 2 future |
| **First login** | Owner invited by CSM | Clerk org (M1b) or stub platform admin → shop switcher |
| **Audit** | Support/CSM records | `PlatformAuditEvent` on create / intake / activate |

---

## Compliance checklist (US auto shop SaaS)

Use **`/platform/onboarding`** per shop — compliance steps are computed live:

1. **Master key issued** — `Shop.masterId` assigned at provision.
2. **MSA / TOS accepted** — current `PLATFORM_TOS` + required agreements in `LegalAcceptance`.
3. **Privacy acknowledged** — current `PRIVACY_POLICY` acceptance.
4. **DPA acknowledged** — `DPA` agreement (enterprise / EU customers).
5. **SMS consent policy** — `SMS_ADDENDUM` when Twilio/SMS is enabled.
6. **Tenant isolation confirmed** — shop scoped to `platformId` + unique master ID.
7. **Primary admin identified** — `primaryContactName` or first `Membership`.
8. **Pre-go-live MSA commitment** — intake/add-shop checkbox **or** full legal acceptance.

### Legal acceptance record

- Documents: `AgreementDocument` (versioned, content hash).
- Acceptances: `LegalAcceptance` (signer, IP, user-agent, timestamp).
- Shop flow: `/onboarding/legal` (required before full CRM use when gated).
- Public previews: `/legal/terms`, `/legal/privacy`, `/legal/dpa`, `/legal/sms-addendum`.

### Platform audit trail

`PlatformAuditEvent` records:

| Event | When |
|-------|------|
| `SHOP_CREATED` | Platform admin **Add shop** |
| `SHOP_INTAKE_SUBMITTED` | Prospect submits `/onboard/shop/[token]` |
| `SHOP_ACTIVATED` | Admin approves `PENDING` → `TRIAL` |

Fields: `actorUserId`, `actorEmail`, `method` (`PLATFORM_DIRECT` \| `INTAKE_FORM`), `metadata` JSON.

---

## Flows

### A. Platform direct add (`/platform/shops/new`)

1. Platform admin fills full shop form (legal name, DBA, address, contact, plan).
2. **MSA commitment checkbox** required before create.
3. `provisionPlatformShop` → master ID, default matrices, `PlatformAuditEvent`.
4. Master key revealed once → onboarding checklist.

### B. Prospect intake (`/onboard/shop/[token]`)

1. Admin sends invite from **Shops → Send intake link** (`ShopIntakeToken`, 14-day expiry).
2. Prospect completes form + **MSA preview checkbox** (links to `/legal/*`).
3. Shop created as `PENDING`; audit event `SHOP_INTAKE_SUBMITTED`.
4. Admin **Approve & activate** on `/platform/onboarding` → `TRIAL` + master key reveal.
   - Blocked if neither MSA pre-ack nor full legal acceptance.

### C. Go-live

- Shop owner completes `/onboarding/legal` (ESIGN-style clickwrap).
- Platform verifies compliance checklist before setting `ACTIVE` + paid billing.
- SMS: enable only after SMS Addendum + 10DLC registration (future automation).

---

## Shop data governance (in-app)

Compliance is **in the workflow**, not a separate settings area.

| Who | What they see / do |
|-----|---------------------|
| **Shop staff** | Consent checkboxes when adding/editing customers; RO **Activity log** on estimate/payment; **Settings → Legal** for shop agreements; SMS/marketing blocked at send time if consent or addendum missing |
| **Platform team** | `/platform/onboarding` checklist; `PlatformAuditEvent` on provision/activate; retention jobs via platform cron (`runShopRetentionJob`) — defaults in `src/lib/data-compliance.ts`, optional `ShopDataPolicy` row for support overrides only |

| Control | Implementation |
|---------|----------------|
| **Consent evidence** | `ConsentRecord` rows on opt-in change; separate transactional SMS vs marketing SMS/email |
| **Retention** | Code defaults (~7y RO/audit, ~3y messages, ~4y consent) — no shop-facing retention editor |
| **Audit trail** | Append-only `ShopAuditEvent` on RO/customer/payment/consent actions; RO-scoped UI only |
| **SMS gate** | Outbound SMS requires current `SMS_ADDENDUM` + transactional consent |
| **Marketing gate** | Campaigns require marketing consent + channel-specific opt-in |
| **PCI** | Stripe tokenization only — no PAN/CVV in DB or audit metadata |

Policy constants: `src/lib/data-compliance.ts`. Consent writes: `src/server/consent-records.ts`.

### Platform retention (parent team)

Nightly job (Inngest `data-retention-nightly`, 04:00 UTC) or manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/data-retention
```

Per shop: purge messages/consent past policy windows, clear stale AI insight caches, anonymize customers whose `deletedAt` is older than the grace period (default 30 days). Audit: `RETENTION_JOB_RUN`, `CUSTOMER_ANONYMIZED`.

---

## TCPA / CAN-SPAM / 10DLC notes

- **TCPA**: separate **transactional** vs **marketing** SMS consent (`transactionalSmsConsent`, `marketingOptIn`); proof in `ConsentRecord`; opt-out footer on outbound messages.
- **CAN-SPAM**: shop-configured `emailFromAddress` (shop owns From / Reply-to — see `docs/SHOP-EMAIL.md`); unsubscribe on marketing campaigns (future).
- **10DLC**: legal entity name + EIN must match IRS filings (collect `taxId` in shop settings when wiring Twilio registration).

---

## Recommended future work

- Stripe Tax + billing address validation at subscription checkout.
- SOC 2 Type II (Tekmetric-class expectation for enterprise shops).
- Automated 10DLC registration workflow tied to `legalEntityName` + `taxId`.
- Clerk Organizations: map shop ↔ org; SCIM for enterprise.
- Subprocessor list page + webhook secret rotation UI.
- Block CRM write paths until `checkShopLegalCompliance()` passes (middleware gate).

---

## Key files

| Area | Path |
|------|------|
| Provision + audit | `src/server/platform/provision-shop.ts`, `audit.ts` |
| Shop audit + consent | `src/server/shop-audit.ts`, `src/server/consent-records.ts`, `src/lib/data-compliance.ts` |
| Compliance steps | `src/server/platform/onboarding-compliance.ts` |
| Intake actions | `src/server/actions/shop-intake.ts` |
| Legal acceptance | `src/server/actions/legal.ts`, `src/server/legal.ts` |
| UI checklist | `src/components/platform/platform-onboarding.tsx` |
| Intake form | `src/components/platform/shop-intake-form.tsx`, `src/app/onboard/shop/[token]/page.tsx` |
| Schema | `prisma/schema.prisma` — `PlatformAuditEvent`, `ShopIntakeToken`, `LegalAcceptance` |

Run migrations after schema changes:

```bash
npm run db:migrate
```
