# Core Plan Fidelity — ShopRally CRM session

**Branch:** `cursor/core-plan-fidelity-5e7c` (merge to `main` later)  
**Dev:** `npm run dev` → http://localhost:3031  
**Goal:** When `Shop.plan = STARTER` (Core), the customer **only sees and can only operate** what Core entitles — nav, routes, server actions, labor, payments, growth, AI.

**Canonical entitlements:** `src/lib/plans.ts` → `starterFeatures`  
**Gates:** `canUseFeature` / `canUseReleasedFeature` in `src/lib/subscription.ts`  
**Route guard:** `src/server/crm-access.ts` + `src/lib/crm-access.ts`  
**Release (P0):** `docs/PHASED-ROLLOUT.md` — Phase 1+ dark in prod even if entitled

---

## Session rules

1. **Every change** gets a row in [`CORE-PLAN-FIDELITY-CHANGELOG.md`](./CORE-PLAN-FIDELITY-CHANGELOG.md).
2. **Test as Core:** platform → assign shop **Core** (`STARTER`) → enter shop CRM → verify UI + API.
3. **Dual gate:** plan entitlement **and** release flag where applicable.
4. **Do not** weaken Pro/Elite paths while fixing Core.
5. **Merge later** — keep scenario/P&L work on `cursor/core-to-200-shops-scenario-5e7c` separate.

---

## Core customer experience (target)

### Included — must work

| Area | Surface | Notes |
|------|---------|--------|
| CRM core | Customers, vehicles, ROs, job board, workflow | Unlimited users/ROs |
| Estimates | Estimate tab, canned jobs, shop labor library | No licensed MOTOR |
| DVIs | Inspections | |
| Share | Email estimate / approval / invoice links | No SMS share on Core |
| Snapshot | Operations Daily Snapshot | `/dashboard/snapshot` |
| Reports | Basic reports | `reports: true` |
| Appointments | Schedule surfaces | `appointments: true` |
| Settings | Shop settings (except Pro-only matrices where gated) | |

### Excluded — must hide or block

| Feature | Plan flag | Release module | Current gap |
|---------|-----------|----------------|-------------|
| Licensed MOTOR labor | `motorLabor: false` | `motorLabor` | ⚠️ Resolver may still serve MOTOR when env on — enforce per shop |
| PartsTech punchout | `partsTech: false` | `partsTech` | Open PR #26 — nav + Vendor Connect + test connection |
| Stripe Connect / RO payments | `integrations: false` | — | Collect CTA hidden; manual Record path (2026-07-13) |
| Two-way SMS | `customerSms: false` | `sms` | Shell hides SMS count; audit share + messages |
| Growth Engine | `marketingCampaigns: false` | `growthEngine` | Growth section + settings hidden (2026-07-13) |
| ShopSite / SEO | `shopSite` / `websiteSeo: false` | `shopSite`, `websiteSeo` | |
| Care Plans | `maintenancePrograms: false` | `growthEngine` | Hidden from Core nav + drawer (2026-07-21) |
| AI suite (receptionist, review AI, etc.) | all `ai*: false` | `aiSuite` | Smart Intake = Core + AI Plus only |
| Markup matrices (Pro) | `markupMatrices: false` | — | Audit Settings → Markups |
| Multi-location | `multiLocation: false` | — | |
| Auto.dev plate decode | `autodevDecoding: false` | — | Manual plate + NHTSA VIN only (2026-07-13) |
| Customer Finances tab / Credit Memo | — | — | Open PR #29 |
| Catalog-only YMM | — | — | Open PR #27 — free-type YMM on Core |

---

## Verification checklist (Core shop)

Run with demo shop on **STARTER** plan (seed: **`shop_macuto`** — Macuto Auto Repair):

- [ ] Top nav: **no Shop Growth** section
- [ ] Operations: job board, customers, ROs, inspections, labor (shop lane only)
- [ ] Labor Book: **no MOTOR BOOK** rows / no licensed hours UI
- [ ] RO Payment tab: no Stripe Connect capture (email/manual only)
- [ ] Share dialogs: **email only**, SMS disabled/hidden
- [ ] `/marketing/**` → redirect or access denied
- [ ] `/maintenance-programs/**` → denied
- [ ] Settings → Subscription shows Core bullets only
- [ ] Server: `motorEnabledForShop` false → MOTOR API/cache not used
- [ ] Platform release flags OFF in prod for Phase 1+

---

## Key files (edit map)

| Concern | Files |
|---------|--------|
| Plan matrix | `src/lib/plans.ts`, `src/lib/billing-shared.ts` |
| Gates | `src/lib/subscription.ts`, `src/server/labor-entitlement.ts` |
| Nav / sections | `src/lib/autopilot3030/nav.ts`, `src/lib/crm-access.ts` |
| Layout / capabilities | `src/app/(app)/layout.tsx`, `src/lib/shop-capabilities.tsx` |
| Route guard | `src/server/crm-access.ts` |
| Labor resolver | `src/server/labor-guide-resolver.ts`, `labor-catalog-mode.ts` |
| MOTOR | `src/server/services/motor/*` |
| Payments | `src/server/services/stripe-connect.ts`, payment tab components |
| SMS | `src/server/services/sms.ts`, share components |

---

## Related docs

- `docs/CORE-PLAN-FIDELITY.md` — full product spec + audit matrix
- `docs/PHASED-ROLLOUT.md` — P0 Core go-live
- `agents/ShopRallyCRM/PLAN-TIER-LABOR-MOTOR.md` — MOTOR tier plan
- `docs/scenarios/CORE-TO-200-SHOPS.md` — GTM scenario (separate branch)

---

## Current task

*Platform changes for Core fidelity — track in changelog below.*

See [`CORE-PLAN-FIDELITY-CHANGELOG.md`](./CORE-PLAN-FIDELITY-CHANGELOG.md).
