# Forms Hub — Implementation Task

**Status:** Not started  
**Created:** 2026-07-05  
**Sprint:** 2 (after Estimate Lab merge)  
**Strategy:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md)  
**Benchmark:** Shopmonkey Work Request Form · Tekmetric Online Booking · RepairShopr intake T&C

---

## Problem

Shops run **Jotform + CRM + PandaDoc** because shop CRMs only ship booking widgets and estimate approval links. Data is copied manually; consent and signatures live in disconnected systems.

**ShopRally today:**
- ✅ `/book/[slug]` — multi-step booking → appointment (`booking-intake-form.tsx`, `submitIntakeForm`)
- ✅ `/approve/[token]` — estimate authorization + signature
- ✅ `/onboard/shop/[token]` — B2B platform intake
- ✅ Staff RO intake — `ro-intake-form.tsx`
- ✅ `ConsentRecord` + `CustomerConsentCheckboxes` on booking (`src/server/consent-records.ts`)
- ❌ General form builder · work request → RO · embed beyond booking · webhook ingress

**Positioning:** *"Stop copying customer info from Jotform into your RO."*

---

## Phase 0 — Consent on all public surfaces (Sprint 1, ~1 day)

Reuse existing infrastructure — no new models.

- [ ] Audit `submitIntakeForm` — confirm `recordInitialCustomerConsents` / `syncCustomerConsentRecords` with source `intake_form` ✅ (already in `src/server/actions/intake.ts`)
- [ ] Add `CustomerConsentCheckboxes` to any public form missing them (approve page if applicable)
- [ ] Add `formSlug` optional field to `ConsentRecord.metadata` JSON when Forms Hub ships
- [ ] Document consent copy in `src/lib/data-compliance.ts` — version bump if text changes
- [ ] Settings → Legal: show disclosure version shops are publishing

---

## Phase 1 — Data model

### Prisma models (proposed)

```prisma
enum ShopFormType {
  WORK_REQUEST
  BOOKING          // mirrors existing booking config
  DROP_OFF_INTAKE
  POST_RO_NPS
  FLEET_INTAKE
  CUSTOM
}

enum ShopFormSubmissionStatus {
  RECEIVED
  PROCESSED
  FAILED
  SPAM
}

model ShopForm {
  id          String       @id @default(cuid())
  shopId      String
  slug        String       // URL-safe, unique per shop
  name        String
  type        ShopFormType
  enabled     Boolean      @default(true)
  config      Json         // field visibility, conditional rules, legal blocks
  embedTheme  Json?        // brand overrides for public render
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  shop        Shop         @relation(fields: [shopId], references: [id], onDelete: Cascade)
  submissions ShopFormSubmission[]

  @@unique([shopId, slug])
  @@index([shopId, enabled])
}

model ShopFormSubmission {
  id            String                   @id @default(cuid())
  shopId        String
  formId        String
  status        ShopFormSubmissionStatus @default(RECEIVED)
  payload       Json                     // raw submitted fields
  customerId    String?
  vehicleId     String?
  repairOrderId String?
  appointmentId String?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime                 @default(now())
  processedAt   DateTime?
  errorMessage  String?

  shop          Shop                     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  form          ShopForm                 @relation(fields: [formId], references: [id], onDelete: Cascade)
  customer      Customer?                @relation(fields: [customerId], references: [id])
  vehicle       Vehicle?                 @relation(fields: [vehicleId], references: [id])
  repairOrder   RepairOrder?             @relation(fields: [repairOrderId], references: [id])

  @@index([shopId, formId, createdAt])
  @@index([shopId, repairOrderId])
}
```

- [ ] Add models to `prisma/schema.prisma`
- [ ] Migration `forms_hub_init`
- [ ] Seed: default Work Request form per demo shop

---

## Phase 2 — Five opinionated templates

Do **not** build a full Jotform clone. Ship templates with fixed field sets + mapping UI.

### Template 1: Work Request (P0 — Shopmonkey parity)

**Public fields:** first/last name, phone, email, plate OR VIN OR YMM, concerns (textarea), optional appt preference  
**On submit:**
1. Match or create `Customer` (phone/email dedupe)
2. Match or create `Vehicle` (VIN decode if present)
3. Create `RepairOrder` status `ESTIMATE` with concerns[]
4. Optional: create `Appointment` if slot selected
5. `recordInitialCustomerConsents` source `work_request_form`
6. Toast/email confirmation to customer
7. Notify shop (notification or SMS to shop line)

**Files to create:**
- `src/lib/forms/work-request-schema.ts` — zod shared client/server
- `src/server/actions/forms/work-request.ts` — `submitWorkRequestForm`
- `src/components/forms/public-work-request-form.tsx`
- `src/app/forms/[shopSlug]/[formSlug]/page.tsx`

### Template 2: Drop-off intake (tablet)

**Fields:** verify customer/vehicle, odometer in, keys, damage notes, diagnostic auth limit, signature canvas  
**On submit:** Update RO + `RoActivity` + attach signature metadata to RO  
**Reuse:** `EstimateLabOdometerBar` patterns, `ApprovalSignaturePanel`

### Template 3: Post-RO NPS

**Fields:** 1–10 score, comment, optional Google review redirect  
**Trigger:** Automation on RO COMPLETED sends link `/forms/.../nps?ro=token`  
**On submit:** If score < 7 → enqueue win-back campaign segment

### Template 4: Fleet intake

**Fields:** company name, PO, billing contact, fleet vehicle list upload or multi-vehicle  
**On submit:** Customer type BUSINESS + tag `fleet` + draft RO or lead record

### Template 5: Storage / liability waiver

**Fields:** storage terms acknowledgment, daily rate, vehicle, signature  
**On submit:** PDF stub or `ConsentRecord` + link to RO if exists

---

## Phase 3 — Staff UI

**Route:** `/marketing/forms` (Growth Engine nav)

- [ ] List forms — name, type, slug, enabled, submission count (7d)
- [ ] Enable/disable toggle
- [ ] Copy embed code: `<script src=".../embed.js" data-form="slug">` + iframe fallback
- [ ] Copy full-page URL: `https://{domain}/forms/{shopSlug}/{formSlug}`
- [ ] Submissions table — date, customer, RO# link, status
- [ ] Reprocess failed submissions (admin)

**Components:**
- `src/app/(app)/marketing/forms/page.tsx`
- `src/components/forms/shop-forms-list.tsx`
- `src/components/forms/form-embed-dialog.tsx`

**Nav:** Add to `AP_GROWTH_NAV_ITEMS` in `src/lib/autopilot3030/nav.ts`

---

## Phase 4 — Embed + ShopSite

**Master spec:** [`WEBSITE-CREATION-TASK.md`](./WEBSITE-CREATION-TASK.md) (Phase B + C)

- [ ] **FH-W2** `src/components/forms/public-work-request-form.tsx` — shared embed
- [ ] **FH-W1** `ensureDefaultWorkRequestForm(shopId)` in `src/server/services/form-processor.ts`
- [ ] **FH-W6** Set `marketingSource: "website_work_request"` on created RO
- [ ] **FH-W7** Accept `?service=` query → prefill concerns
- [ ] `src/app/forms/embed/[shopSlug]/[formSlug]/route.ts` — CORS-safe embed for external sites
- [ ] **WEB-B2** ShopSite contact page embed (Website Code agent)
- [ ] **WEB-B1** Hero dual CTAs (Website Code agent)
- [ ] **WEB-C1** Editor Conversion tab toggles work request (Website Code agent)
- [ ] Google Business Profile link → full-page form URL

---

## Phase 5 — Webhook ingress (power users)

For shops keeping Cognito/Jotform for edge cases:

```
POST /api/forms/{formId}/submit
Headers: X-ShopRally-Signature: sha256=...
Body: { fields: { ... }, externalId?: string }
```

- [ ] HMAC verification with per-form secret
- [ ] Field mapping config in `ShopForm.config.mapping`
- [ ] Idempotency via `externalId`
- [ ] Same processor pipeline as native templates

**Reuses:** Outbound webhook patterns from [`API-PLATFORM-TASK.md`](./API-PLATFORM-TASK.md) Phase 1 when built.

---

## Conditional logic (v1 scope)

Keep minimal — match 80% use cases:

| Rule | Implementation |
|------|----------------|
| If `customerType === fleet` → show PO field | `config.conditionalFields` JSON |
| If VIN empty → show YMM pickers | Client-side branch (reuse booking form) |
| If diagnostic only → show max auth amount | Template config flag |
| Hide email if phone provided | Optional field config |

Full visual rule builder → v2.

---

## State-specific legal blocks (v2)

- [ ] Shop `state` from `Shop.address` → inject disclosure snippet
- [ ] CA BAR authorization language template
- [ ] Log authorization method on RO: `electronic` | `oral` | `written`
- [ ] Reference: California BAR Write It Right

---

## File map (new)

```
src/
  app/
    (app)/marketing/forms/page.tsx
    forms/[shopSlug]/[formSlug]/page.tsx
    api/forms/[formId]/submit/route.ts
  components/forms/
    public-work-request-form.tsx
    shop-forms-list.tsx
    form-embed-dialog.tsx
  lib/forms/
    work-request-schema.ts
    form-templates.ts
  server/
    actions/forms/
      work-request.ts
      shop-forms-admin.ts
    services/
      form-processor.ts      # shared submit → Customer/Vehicle/RO
```

---

## Reuse existing code

| Need | Reuse |
|------|-------|
| VIN decode | `decodeVin` action |
| Plate lookup | `lookupPlate` |
| Customer create | `createCustomer` patterns from `customers.ts` |
| RO create | `createRepairOrder` from `repair-orders.ts` |
| Consent | `recordInitialCustomerConsents`, source extend to `work_request_form` |
| Booking field config | `BookingFieldConfig` pattern in `src/lib/booking-settings.ts` |
| Public page layout | `/book/[slug]/page.tsx` structure |

---

## Plan gating

| Feature | Plan |
|---------|------|
| Booking form | All |
| Work request form | Professional+ |
| Custom form slug + embed | Professional+ |
| Webhook ingress | Premier |
| Fleet / waiver templates | Premier |

Add `formsHub` to `src/lib/plans.ts` `shopHasFeature()`.

---

## Test plan

1. Submit work request on demo shop → new RO # appears on job board Estimates column  
2. Duplicate phone → matches existing customer, new RO  
3. VIN decode populates vehicle on submission  
4. Marketing SMS unchecked → `marketingOptIn` false + no promotional campaign eligibility  
5. Transactional SMS checked → appt reminder allowed  
6. Embed on ShopSite contact → mobile 375px width usable  
7. Webhook submit with bad signature → 401  
8. Tenant isolation — form from shop A cannot create RO in shop B  

---

## Success metrics

- Shops can disable Jotform for work requests  
- Submissions → RO without staff copy-paste  
- Consent audit exportable for TCPA dispute  
- Sales can demo Shopmonkey Work Request parity in < 2 min **from live ShopSite contact page**

---

## ShopSite integration (required)

See [`WEBSITE-CREATION-TASK.md`](./WEBSITE-CREATION-TASK.md). Do not ship form backend without ShopSite embed (FH-W2 + WEB-B2).

| ID | Task | Owner |
|----|------|-------|
| FH-W1 | `ensureDefaultWorkRequestForm(shopId)` on editor save | ShopRallyCRM |
| FH-W2 | `PublicWorkRequestForm` component | ShopRallyCRM |
| FH-W3 | Contact page embed | Website Code |
| FH-W4 | Hero dual CTAs | Website Code |
| FH-W5 | `conversionSettings` on `ShopWebsiteConfig` | Website Code |
| FH-W6 | `marketingSource: website_work_request` | ShopRallyCRM |
| FH-W7 | Service page `?service=` prefill | Both |
