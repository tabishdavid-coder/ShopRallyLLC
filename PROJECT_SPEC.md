# ShopRally — Product Specification

> Cloud-based, multi-tenant shop-management CRM for auto repair shops.
> Modeled on the workflows of Tekmetric. Own product, own branding (getShopRally.com).

---

## 1. Product summary

ShopRally is a SaaS application that lets an auto repair shop run its entire
front-of-house and service workflow: manage customers and their vehicles, write
estimates and repair orders, perform digital vehicle inspections, schedule
appointments, order parts through PartsTech, invoice and collect payment, and
communicate with customers by text.

Each **Shop** is an isolated tenant. Users belong to a shop and have roles
(Owner, Manager, Service Writer, Technician). All data is scoped by `shopId`.

---

## 2. Core domains & relationships

```
Shop
 ├── Users (Membership: role)
 ├── Customers
 │     └── Vehicles                 (a customer has many vehicles)
 │           └── RepairOrders       (a vehicle has many repair orders)
 │                 ├── Jobs
 │                 │     ├── LaborLines   (hours × rate)
 │                 │     └── PartLines     (from PartsTech)
 │                 ├── Inspections
 │                 │     └── InspectionItems (red / yellow / green)
 │                 └── Invoice
 │                       └── Payments
 ├── Appointments        (link customer + vehicle, convert to RepairOrder)
 ├── MaintenancePrograms (shop-defined customer subscription / VIP plans)
 │     ├── MaintenancePlan → PlanEntitlement
 │     └── PlanSubscription → PlanRedemption (linked to RepairOrder)
 └── Messages            (two-way SMS thread per customer)
```

Key rules:
- A **Customer** has many **Vehicles**.
- A **Vehicle** is VIN-decoded once and caches its decoded specs.
- A **RepairOrder (RO)** belongs to exactly one customer + one vehicle.
- An RO contains **Jobs**; each Job has **LaborLines** and **PartLines**.
- An RO can have **Inspections** and produces one **Invoice**.
- An **Invoice** has many **Payments** until paid in full.

---

## 3. Feature modules

### 3.1 Customers (CRM core)
- Searchable/sortable customer list (name, phone, vehicles, last visit, total spend).
- Customer detail: contact info, vehicles, RO history timeline, notes, tags,
  marketing opt-in, communication log.
- Quick-add customer + vehicle.

### 3.2 Vehicles
- VIN, year, make, model, trim, engine, transmission, drivetrain, plate, color.
- Mileage history (recorded per visit), full service history.
- Decoded raw data stored as JSON.

### 3.3 Repair Orders, Estimates & Inspections
- RO lifecycle: **Estimate → Approved → In Progress → Completed → Invoiced**.
- Customer authorization, technician + service-writer assignment, mileage in/out.
- Live totals: parts, labor, shop supplies, tax, discounts, grand total.
- Digital Vehicle Inspections (DVI): templated checklists, red/yellow/green
  status, notes, photo upload, attachable to an RO; shareable with the customer.

### 3.4 Scheduling
- Calendar (day/week), drag-to-create, assign technician/bay,
  convert appointment → RO.

### 3.5 Parts (PartsTech)
- Search PartsTech by the vehicle's decoded specs; view part/brand/price/
  availability; add to a Job's part lines; place and track orders.

### 3.6 Invoicing & Payments
- Generate invoice from a completed RO; printable/PDF; Stripe card payments
  plus recorded cash/check; payment status tracking.

### 3.7 Messaging
- Twilio two-way SMS per customer; templates (reminder, "vehicle ready",
  estimate-approval link); inbox; all messages logged on the customer.

### 3.8 Dashboard & Reporting
- KPIs: cars in shop, sales, ARO (average repair order), car count, gross profit.
- Sales chart, technician productivity, end-of-day report.

### 3.9 Maintenance Programs (customer subscriptions)

> Shop-defined maintenance / VIP membership programs for **their customers**
> (distinct from ShopRally SaaS `ShopPlan` billing). Covers prepaid bundles,
> monthly clubs, household plans, and vehicle-class pricing — modeled on patterns
> from All 4 One, Green Drop Garage, Brian's Buddies, CARe Club, UltraCare+.

**Locked product decisions (2026-06-29):**
1. **v1 archetypes:** counted bundles + monthly clubs + **household plans** +
   **vehicle-class pricing matrix** (not deferred).
2. **Redemption UX:** **RO sidebar panel** + standalone **Express Redeem** flow
   (quick-lube / front-counter, no RO required to start).
3. **Customer portal:** lightweight public **`/member/[token]`** balance view in v1
   (staff redemption remains primary).
4. **Payments:** **Stripe recurring + pay-in-full from day one** via Connect; also
   **manual in-shop** enrollment (cash/check/recorded).
5. **Feature gate:** **`PROFESSIONAL+`** (`maintenancePrograms` plan feature);
   Starter sees upgrade CTA; Scale/Enterprise unchanged.

#### Domain model

```
Shop
 ├── MaintenanceProgramSettings   (hero copy, slug, enable, embed)
 ├── MaintenancePlan              (template: pricing, term, scope, rules)
 │     ├── PlanEntitlement        (counted / unlimited / interval / perk / credit / coupon)
 │     └── PlanVehicleClassPrice  (optional overrides by vehicle class)
 └── PlanSubscription             (customer purchase instance)
       ├── SubscriptionVehicle    (vehicles covered — 1 for PER_VEHICLE, N for HOUSEHOLD)
       ├── SubscriptionEntitlement (runtime counters + next-eligible dates)
       ├── PlanRedemption         (visit log; optional repairOrderId)
       │     └── RedeemedEntitlement
       ├── SubscriptionPayment    (Stripe + manual ledger)
       └── memberPortalToken      (unguessable → /member/[token])
```

**Scopes:** `PER_VEHICLE` | `PER_HOUSEHOLD` | `PER_CUSTOMER` (shareable card).

**Entitlement kinds:** `COUNTED` | `UNLIMITED` | `INTERVAL` | `EVERY_VISIT` |
`DISCOUNT` | `CREDIT` | `COUPON` | `ACCESS` (priority, VIP lane, towing qty).

**Payment modes:** `PAY_IN_FULL` | `MONTHLY` | `ANNUAL` | `SEMI_ANNUAL` | `MANUAL`.

All money in integer cents. Shop holds funds via Stripe Connect (no third-party
administrator / claims process).

#### UI surfaces

| Surface | Route | Purpose |
|---------|-------|---------|
| Program settings | `/marketing/maintenance-programs` | Page copy, slug, templates, plan list |
| Plan editor | `.../plans/[id]` | Entitlements, pricing, vehicle classes, terms |
| Public catalog | `/plans/[slug]` | Shop-branded plan cards + signup wizard |
| Subscribers hub | `/maintenance-programs/subscribers` | Search, filters, progress pills |
| Subscription detail | `/maintenance-programs/subscribers/[id]` | Progress, payments, history |
| Express Redeem | `/maintenance-programs/redeem` | Phone/plate lookup → check-off → optional RO |
| RO redemption panel | RO detail sidebar | Auto-detect member; eligible items only |
| Customer portal | `/member/[token]` | Balance, digital card, book link |
| Customer detail tab | `/customers/[id]` | Active memberships |

Public signup wizard reuses `/book/[slug]` patterns (mobile step shell, VIN decode,
vehicle-class selector when plan uses class pricing).

#### Process flows

**Sell:** configure plan → public or in-shop → Stripe Checkout / Subscription or
manual record → create `PlanSubscription` + entitlement counters → SMS/email confirm
+ portal link.

**Visit (RO path):** open/create RO → member chip → sidebar shows eligible items →
check off → apply discount perks to RO → log redemption → optional $0 canned jobs.

**Visit (Express path):** lookup customer → select subscription → check off → create
RO from redemption or link later.

**Retain:** Inngest jobs for due reminders, payment-failed grace, auto-renewal,
expiry/forfeiture reporting; Marketing campaigns for lapsed members.

#### Rules (configurable per plan)

- Term length (6–60 months), auto-renew, cancel policy
- No rollover (default), non-transferable, vehicle-specific
- Min interval between same service (unlimited / interval entitlements)
- Discount scope + per-visit cap (e.g. labor only, max $100)
- Payment past-due: grace days then block redemption (configurable)
- Manager override on expired / early interval (audit log)

#### Reporting

Active subs, MRR, new signups, churn, utilization (redeemed ÷ entitled), breakage
(unused at expiry), upsell on member ROs, expiring 30/60/90 days.

#### Integrations

- **Stripe Connect:** one-time + recurring customer payments; webhooks update
  `SubscriptionPayment` and status.
- **Twilio:** signup confirm, redemption receipt, due reminders.
- **RO / Canned Jobs:** optional link entitlement → canned job for $0 lines.
- **Appointments:** priority flag for members; book from portal.

#### Prisma schema sketch

```prisma
enum MaintenancePlanScope { PER_VEHICLE PER_HOUSEHOLD PER_CUSTOMER }
enum MaintenancePlanArchetype { BUNDLE MONTHLY_CLUB HOUSEHOLD UNLIMITED_TIER }
enum EntitlementKind {
  COUNTED UNLIMITED INTERVAL EVERY_VISIT DISCOUNT CREDIT COUPON ACCESS
}
enum SubscriptionStatus {
  PENDING ACTIVE PAST_DUE PAUSED CANCELLED EXPIRED
}
enum SubscriptionPaymentMode { PAY_IN_FULL MONTHLY ANNUAL SEMI_ANNUAL MANUAL }
enum VehicleClass { CAR SUV_TRUCK HEAVY_DUTY EV LUXURY OTHER }

model MaintenanceProgramSettings {
  id               String  @id @default(cuid())
  shopId           String  @unique
  enabled          Boolean @default(false)
  plansSlug        String? @unique
  heroTitle        String?
  heroSubtitle     String?
  termsDefault     String? @db.Text
  shop             Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
}

model MaintenancePlan {
  id              String                   @id @default(cuid())
  shopId          String
  name            String
  tagline         String?
  description     String?                  @db.Text
  idealFor        String?
  archetype       MaintenancePlanArchetype @default(BUNDLE)
  scope           MaintenancePlanScope     @default(PER_VEHICLE)
  maxVehicles     Int?                     // HOUSEHOLD cap; null = unlimited
  termMonths      Int                      @default(12)
  autoRenew       Boolean                  @default(true)
  allowRollover   Boolean                  @default(false)
  transferable    Boolean                  @default(false)
  retailCents     Int?
  payInFullCents  Int?
  monthlyCents    Int?
  annualCents     Int?
  featured        Boolean                  @default(false)
  sortOrder       Int                      @default(0)
  active          Boolean                  @default(true)
  terms           String?                  @db.Text
  rules           Json?                    // minIntervalDays, discountExcludes, etc.
  entitlements    PlanEntitlement[]
  classPrices     PlanVehicleClassPrice[]
  subscriptions   PlanSubscription[]
  shop            Shop                     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  @@index([shopId, active])
}

model PlanEntitlement {
  id              String           @id @default(cuid())
  shopId          String
  planId          String
  kind            EntitlementKind
  label           String
  quantity        Int?             // COUNTED / COUPON / ACCESS (tows per year)
  intervalDays    Int?             // INTERVAL / UNLIMITED min spacing
  discountBps     Int?             // DISCOUNT: basis points
  discountCapCents Int?
  creditCents     Int?             // CREDIT: starting balance
  cannedJobId     String?          // optional RO auto-line
  sortOrder       Int              @default(0)
  plan            MaintenancePlan  @relation(fields: [planId], references: [id], onDelete: Cascade)
  @@index([planId])
}

model PlanVehicleClassPrice {
  id            String        @id @default(cuid())
  shopId        String
  planId        String
  vehicleClass  VehicleClass
  payInFullCents Int?
  monthlyCents   Int?
  annualCents    Int?
  surchargeCents Int?         // additive to base
  plan          MaintenancePlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  @@unique([planId, vehicleClass])
}

model PlanSubscription {
  id                    String                 @id @default(cuid())
  shopId                String
  planId                String
  customerId            String
  status                SubscriptionStatus     @default(PENDING)
  paymentMode           SubscriptionPaymentMode
  vehicleClass          VehicleClass?
  startsAt              DateTime
  endsAt                DateTime
  autoRenew             Boolean                @default(true)
  stripeSubscriptionId  String?
  stripePaymentIntentId String?
  memberPortalToken     String                 @unique @default(cuid())
  enrolledByUserId      String?
  cancelledAt           DateTime?
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
  plan                  MaintenancePlan        @relation(fields: [planId], references: [id])
  customer              Customer               @relation(fields: [customerId], references: [id])
  vehicles              SubscriptionVehicle[]
  entitlements          SubscriptionEntitlement[]
  redemptions           PlanRedemption[]
  payments              SubscriptionPayment[]
  @@index([shopId, status])
  @@index([customerId])
}

model SubscriptionVehicle {
  id             String           @id @default(cuid())
  shopId         String
  subscriptionId String
  vehicleId      String
  subscription   PlanSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  vehicle        Vehicle          @relation(fields: [vehicleId], references: [id])
  @@unique([subscriptionId, vehicleId])
}

model SubscriptionEntitlement {
  id               String           @id @default(cuid())
  shopId           String
  subscriptionId   String
  planEntitlementId String
  usedCount        Int              @default(0)
  remainingCount   Int?
  creditBalanceCents Int?
  nextEligibleAt   DateTime?
  subscription     PlanSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  @@unique([subscriptionId, planEntitlementId])
}

model PlanRedemption {
  id               String           @id @default(cuid())
  shopId           String
  subscriptionId   String
  repairOrderId    String?
  vehicleId        String?
  mileageIn        Int?
  redeemedByUserId String?
  notes            String?
  createdAt        DateTime         @default(now())
  subscription     PlanSubscription @relation(fields: [subscriptionId], references: [id])
  repairOrder      RepairOrder?     @relation(fields: [repairOrderId], references: [id])
  items            RedeemedEntitlement[]
  @@index([shopId, subscriptionId])
}

model RedeemedEntitlement {
  id                        String                  @id @default(cuid())
  shopId                    String
  redemptionId              String
  subscriptionEntitlementId String
  quantity                  Int                     @default(1)
  redemption                PlanRedemption          @relation(fields: [redemptionId], references: [id], onDelete: Cascade)
}

model SubscriptionPayment {
  id               String           @id @default(cuid())
  shopId           String
  subscriptionId   String
  amountCents      Int
  method           PaymentMethod
  stripePaymentId  String?
  paidAt           DateTime         @default(now())
  periodStart      DateTime?
  periodEnd        DateTime?
  subscription     PlanSubscription @relation(fields: [subscriptionId], references: [id])
  @@index([subscriptionId])
}
```

Add `maintenancePrograms Boolean` to `PlanFeature` in `src/lib/plans.ts`
(`false` Starter, `true` Professional+). Wire `canUseFeature(shopId, "maintenance_programs")`.

#### Wireframes (build reference)

**A. Marketing → Maintenance Programs (settings hub)**
```
┌─────────────────────────────────────────────────────────────────┐
│ Maintenance Programs          [Preview public page] [Copy embed]│
├─────────────────────────────────────────────────────────────────┤
│ ☑ Enable public plans page    URL: getShopRally.com/plans/iohaus│
│ Hero title: [Making Every Day Car Maintenance Easy        ]    │
│ Hero subtitle: [textarea                                    ]    │
├─────────────────────────────────────────────────────────────────┤
│ Your plans                              [+ New plan] [Templates]│
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ★ Soccer Mom Synthetic  $539 or $50/mo  Active  12 subs  ✎ │ │
│ │   I Just Need It Done   $269 or $25/mo  Active   8 subs  ✎ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**B. Plan editor**
```
┌─ Edit plan ─────────────────────────────────────────────────────┐
│ [Basics] [Entitlements] [Pricing] [Rules] [Terms] [Preview]     │
├─────────────────────────────────────────────────────────────────┤
│ Name [Soccer Mom Synthetic]  Archetype [Bundle ▼] Scope [Vehicle]│
│ Entitlements                          [+ Add row]               │
│  ● Semi-synthetic oil change   COUNTED   qty [5]                │
│  ● Tire rotation               COUNTED   qty [5]                │
│  ● Fluid top-off               EVERY_VISIT                      │
│  ● 15% labor discount          DISCOUNT  [1500] bps cap [$100]  │
│ Pricing (base)                                                  │
│  Retail [$699]  Pay-in-full [$539]  Monthly [$50] × [12] mo     │
│ Vehicle class overrides ☑                                       │
│  CAR +$0   SUV +$6/mo   EV +$0   LUXURY +$15/mo                 │
│ Live preview card →                                             │
└─────────────────────────────────────────────────────────────────┘
```

**C. Public `/plans/[slug]`**
```
┌─ [Logo] Shop Name ──────────────────────────────────────────────┐
│        Hero headline + subcopy                                    │
│  ┌─────────────┐  ┌─────────────★┐  ┌─────────────┐              │
│  │ Plan A      │  │ Plan B       │  │ Plan C      │              │
│  │ • includes  │  │ • includes   │  │ • includes  │              │
│  │ ~~$699~~    │  │              │  │             │              │
│  │ $539        │  │              │  │             │              │
│  │ OR $50/mo   │  │              │  │             │              │
│  │ [Choose]    │  │ [Choose]     │  │ [Choose]    │              │
│  └─────────────┘  └──────────────┘  └─────────────┘              │
│  Vehicle type: ( ) Car ( ) SUV ( ) EV   ← when class pricing on  │
│  ▼ Terms & conditions                                             │
└───────────────────────────────────────────────────────────────────┘
Signup steps: Plan → Payment option → Contact → Vehicle(s) → Terms → Pay
```

**D. Subscribers hub**
```
┌─ Subscribers ───────────────────────────────────────────────────┐
│ [Search...]  Status [Active ▼]  Expiring [Any ▼]  [Express ↗]  │
│ Customer        Vehicle      Plan           Progress    Expires  │
│ Tabish David    '24 Pilot   Soccer Mom     3/5 oil     Jun '27  │
│ Mark Johnson    '19 F-150   Family Plan    2/4 oil     Mar '27  │
└─────────────────────────────────────────────────────────────────┘
```

**E. Subscription detail + RO redemption sidebar**
```
┌─ Subscription detail ─────────────────┐  ┌─ RO #1042 sidebar ───┐
│ Soccer Mom · 2024 Honda Pilot         │  │ 🎫 VIP Member         │
│ Active · $50/mo (8/12)                │  │ Plan: Soccer Mom      │
│ Oil change      ████░ 3/5             │  │ Eligible today:       │
│ Tire rotation   ████░ 3/5             │  │ ☑ Oil change          │
│ 15% labor       Active                │  │ ☑ Tire rotation       │
│ [Record visit] [Send SMS] [Portal link]│  │ ☑ 21-pt inspection    │
│ Visit history…                        │  │ [Apply to RO]         │
└───────────────────────────────────────┘  └───────────────────────┘
```

**F. Express Redeem (`/maintenance-programs/redeem`)**
```
┌─ Express Redeem ────────────────────────────────────────────────┐
│ Phone or plate [________________] [Lookup]                      │
│ → Tabish David · 2024 Honda Pilot · Soccer Mom Synthetic      │
│   ☑ Oil change (2 remaining)  ☑ Rotation (2 remaining)         │
│   Mileage [45210]   [Redeem only]  [Redeem + new RO]            │
└─────────────────────────────────────────────────────────────────┘
```

**G. Customer portal `/member/[token]`**
```
┌─ [Shop logo] Your membership ───────────────────────────────────┐
│ Soccer Mom Synthetic · 2024 Honda Pilot                         │
│ Oil changes: ●●●○○ 3 of 5 used                                  │
│ Tire rotations: ●●●○○ 3 of 5 used                               │
│ Valid through Jun 29, 2027                                      │
│ [Book a visit]  [View visit history]                            │
│ Digital member card [QR]                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation phases

| Phase | Scope |
|-------|--------|
| M9a | Schema migration + plan builder + public catalog (read-only) |
| M9b | Signup wizard + Stripe + manual enroll |
| M9c | Subscribers hub + detail + `/member/[token]` |
| M9d | RO redemption panel + Express Redeem |
| M9e | Reminders, auto-renew webhooks, reporting |

---

## 4. Integrations

| Integration | Purpose | Notes |
|-------------|---------|-------|
| **VIN decoder** | Decode VIN → year/make/model/trim/engine/trans/drivetrain | **NOW: NHTSA vPIC** as primary, behind a swappable `VinService` interface so upgrading to a paid decoder (DataOne/VinAudit) later is a one-file change. |
| **PartsTech** | Parts catalog search + ordering | User has a PartsTech **username/password** (good for punchout/SSO). Full ordering API may need separate partner API credentials — confirm at M7. |
| **Stripe** | Card payments + customer maintenance subscriptions | Connect for shop; Billing for platform |
| **Twilio** | Two-way SMS | |
| **Clerk** | Auth + Organizations (multi-tenancy) | Each shop = one Org. |

---

## 5. Non-functional requirements
- **Multi-tenant isolation** enforced on every query (`shopId`).
- Role-based access control (Owner / Manager / Service Writer / Technician).
- Cloud-hosted (Vercel + Neon Postgres), responsive for shop tablets.
- Auditable money math (store amounts in integer cents).
- Background jobs (Inngest) for VIN/parts sync and SMS.

---

## 6. Open questions (to confirm with stakeholder)
1. Tax handling — single shop tax rate, or per-jurisdiction?
2. Labor pricing — flat-rate hours from a labor guide, or manual entry to start?
3. Which paid VIN provider do you have/want an account with (DataOne vs VinAudit)?
4. Multi-location shops (one owner, several shops) in v1, or single-shop only?
5. Do you need accounting export (QuickBooks) in v1?
