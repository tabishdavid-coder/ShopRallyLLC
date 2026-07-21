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
  maxVinPlateDecodesPerMonth: null, // unlimited NHTSA VIN
  cannedJobs: true,
  partsTech: true,
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
| **Shop Growth** top section | ❌ | `growthPlanOk` hides section | 🟡 gated 2026-07-13 |
| `/marketing/**` routes | ❌ | `checkCrmRouteAccess` + release | 🟡 gated 2026-07-13 |
| `/maintenance-programs/**` (Care Plans) | ❌ | Elite premium only — Core never entitled | ✅ plan `maintenancePrograms: false` |
| Customer drawer **Care Plan** tab | ❌ | Hidden when `!maintenancePrograms` | ✅ 2026-07-21 |
| Messages / SMS inbox prominence | ❌ | `capabilities.sms` in shell | ⬜ verify |
| Payments nav / Stripe Connect | ❌ | Manual Record path; Stripe Collect hidden | 🟡 gated 2026-07-13 |
| Customer drawer Finances / Credit Memo | ❌ | Drawer tab + stub removed (PR #29 merged) | ✅ |
| Reports (basic) | ✅ | `reports: true` | ⬜ verify |
| Settings → Subscription | ✅ | Shows Core plan; blocked settings redirect | 🟡 gated 2026-07-13 |

---

## 3. Labor & estimates (Core path)

| Behavior | Core | Target |
|----------|:----:|--------|
| Shop labor library / canned jobs | ✅ | Primary estimate path |
| Licensed MOTOR (BOOK) hours | ❌ | Hidden + server blocked (`motorEnabledForShop`) |
| Labor Book nav / toolbar lookup | ❌ | Hidden on Core (2026-07-13) |
| AI labor drafts / Smart intake | Core + AI Plus add-on only | Gated 2026-07-13 |
| Free-type YMM (no catalog required) | ✅ | PR #27 merged |
| Markup matrices auto-apply | ❌ | `markupMatrices: false` |
| PartsTech ordering / Vendor Connect | ✅ | `partsTech: true` on Ignition (2026-07-19 packaging) |
| Auto.dev plate→VIN | ❌ | Unlimited NHTSA VIN only |

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

**Demo seed:** `prisma/seed.ts` — use **`shop_macuto`** (Macuto Auto Repair, `STARTER`) for Core fidelity QA; `shop_eastside` is also `STARTER`.

---

## 7. Merge policy

- All Core fidelity **tracking docs** stay on `cursor/core-plan-fidelity-5e7c`
- Product gates land as small focused PRs (log each in `CORE-PLAN-FIDELITY-CHANGELOG.md`)
- Scenario / P&L docs stay on `cursor/core-to-200-shops-scenario-5e7c`
- Merge fidelity tracking → `main` when checklist green for P0 Core

### Open Core gatekeeping PRs (2026-07-14)

| PR | Intent |
|----|--------|
| [#26](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/26) | PartsTech stays fully gated off Core |
| [#27](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/27) | Free-type YMM + VIN header cleanup |
| [#29](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/29) | Hide Finances tab / Credit Memo on Core |
