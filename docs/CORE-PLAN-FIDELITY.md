# Core Plan Fidelity — product spec & audit

**Plan enum:** `STARTER` · **Display name:** Core  
**Branch:** `cursor/core-plan-fidelity-5e7c`  
**Change log:** `agents/ShopRallyCRM/CORE-PLAN-FIDELITY-CHANGELOG.md`

When a shop is on **Core**, this document defines what they **see**, **can click**, and **what persists** on the server.

---

## 1. Entitlement source of truth

```478:506:src/lib/plans.ts
const starterFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  maxVinPlateDecodesPerMonth: VIN_PLATE_DECODE_PLAN_COPY.coreIncluded,
  cannedJobs: true,
  partsTech: false,
  laborGuide: true,
  motorLabor: false,
  customerEmail: true,
  customerSms: false,
  digitalInspections: true,
  appointments: true,
  reports: true,
  integrations: false,
  multiLocation: false,
  approvalLinks: true,
  invoiceSharing: true,
  advancedReports: false,
  markupMatrices: false,
  shopSite: false,
  websiteSeo: false,
  marketingCampaigns: false,
  maintenancePrograms: false,
  aiReviewReplies: false,
  aiCampaignDrafting: false,
  aiSeoContent: false,
  aiCustomerInsights: false,
  aiReceptionist: false,
};
```

**Gate helpers:** `canUseFeature(shopId, feature)` · `canUseReleasedFeature(shopId, feature)`  
**P0 release:** Phase 1+ modules dark in production (`docs/PHASED-ROLLOUT.md`).

---

## 2. Navigation & sections (what Core sees)

| Section / area | Core | Mechanism today | Audit status |
|----------------|:----:|-----------------|--------------|
| Dashboard / Operations Daily Snapshot | ✅ | Permission-based | ⬜ verify |
| Customers, vehicles, ROs, job board | ✅ | Permission-based | ⬜ verify |
| Catalog (canned jobs, inspections, labor guide) | ✅ | Permission-based | ⬜ verify |
| **Shop Growth** top section | ❌ | `growthPlanOk` hides section | ⬜ verify |
| `/marketing/**` routes | ❌ | `checkCrmRouteAccess` + release | ⬜ verify |
| `/maintenance-programs/**` | ❌ | Same | ⬜ verify |
| Messages / SMS inbox prominence | ❌ | `capabilities.sms` in shell | ⬜ verify |
| Payments nav / Stripe Connect | ❌ | `capabilities.stripePayments` partial | ⚠️ audit `/payments` route |
| Reports (basic) | ✅ | `reports: true` | ⬜ verify |
| Settings → Subscription | ✅ | Shows Core plan | ⬜ verify |

---

## 3. Labor & estimates (Core path)

| Behavior | Core | Target |
|----------|:----:|--------|
| Shop labor library / canned jobs | ✅ | Primary estimate path |
| Licensed MOTOR (BOOK) hours | ❌ | Hidden + server blocked |
| AI labor drafts | TBD | Product decision (Instant Quote vs in-estimate AI) |
| Markup matrices auto-apply | ❌ | `markupMatrices: false` |
| PartsTech ordering | ❌ | `partsTech: false` |

**Known gap (2026-07-12):** `motorEnabledForShop` exists but resolver may still serve MOTOR when platform env is on — **must enforce per shop**.

---

## 4. Communications & payments

| Channel | Core |
|---------|:----:|
| Email estimate / invoice / approval | ✅ |
| SMS share / campaigns / two-way | ❌ |
| Stripe Connect checkout on RO | ❌ |
| Manual payment recording | ✅ (if implemented without Connect) |

---

## 5. Platform admin (Master CRM)

Assigning **Core** on `/platform/shops`:

1. Set `Shop.plan = STARTER`
2. P0: keep `planFeatures._release` dark for `growthEngine`, `sms`, `motorLabor`, etc.
3. **Enter shop** → experience must match tables above

---

## 6. Test procedure

1. `npm run dev` → :3031
2. Platform admin → shop detail → plan **Core**
3. Enter shop CRM
4. Walk checklist in `agents/ShopRallyCRM/CORE-PLAN-FIDELITY.md`
5. Log results + fixes in `CORE-PLAN-FIDELITY-CHANGELOG.md`

**Demo seed:** `prisma/seed.ts` includes shops; set one shop to `STARTER` for fidelity QA.

---

## 7. Merge policy

- All Core fidelity work stays on `cursor/core-plan-fidelity-5e7c`
- Scenario / P&L docs stay on `cursor/core-to-200-shops-scenario-5e7c`
- Merge fidelity branch → `main` when checklist green for P0 Core
