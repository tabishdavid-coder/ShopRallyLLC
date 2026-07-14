# Core Plan Fidelity — change log

Track every change on branch `cursor/core-plan-fidelity-5e7c` so we can merge safely and prove Core tier behavior.

| Date | Area | Change | Files | Core verify |
|------|------|--------|-------|-------------|
| 2026-07-12 | Session | Opened Core fidelity branch + tracking docs (no product code yet) | `agents/ShopRallyCRM/CORE-PLAN-FIDELITY*.md`, `docs/CORE-PLAN-FIDELITY.md` | — |
| 2026-07-12 | Seed | Added **Macuto Auto Repair** (`shop_macuto`, plan `STARTER`) for Core QA — owner + platform admin memberships, legal acceptances | `prisma/seed.ts` | ⬜ pending DB |
| 2026-07-12 | Labor | Gate `getLaborBookMotorInit` + `getLaborBookMotorApplications` with `motorEnabledForShop` — Core gets reference/shop guide only | `src/server/actions/labor-book-motor.ts` | ⬜ pending |
| 2026-07-12 | Nav + routes | Plan-filter nav hrefs (`/messages`, `/payments`, `/orders`, vendors, markups) + route guard; platform admin on Core shop now gets filtered sections | `src/server/crm-access.ts`, `src/lib/subscription.ts` | ⬜ pending |
| 2026-07-12 | Seed / estimate | Macuto estimate RO **#1001** — Maria Cortes, 2014 Honda Accord EX-L, front brakes job (`ro_macuto_1001`) | `prisma/seed.ts`, `src/lib/shop-constants.ts` | ⬜ re-seed + open URL |
| 2026-07-12 | RO access | Fix shop mismatch: honor platform admin cookie; auto-switch shop via `/platform/enter?next=` when RO is on another tenant | `src/lib/shop.ts`, `src/server/repair-order-access.ts`, `src/lib/platform-routing.ts` | ⬜ pending |
| 2026-07-12 | Platform enter | **Root cause fix:** `/platform/enter` moved to Route Handler — `switchShop` cookie set failed in Server Component ("Cookies can only be modified in a Server Action or Route Handler") | `src/app/(app)/platform/enter/route.ts` | ✅ loads locally |
| 2026-07-13 | Estimate toolbar | Core hides Labor Book, Parts lookup, + Work line / Pro Job cluster; single Core `+ Job` (canned/blank only). Gate Labor Book from launcher, line lookup, type menu, parts strip | `estimate-lab-toolbar.tsx`, `shop-capabilities.tsx`, `estimate-job-launcher.tsx`, … | ⬜ Macuto verify |
| 2026-07-13 | Growth nav | Hide Business → Growth (`/marketing`) + Lead Tracking / booking settings on Core | `src/server/crm-access.ts`, settings catalog/overview | ⬜ Macuto verify |
| 2026-07-13 | Labor Book nav | Hide Shop → Labor Book (`/quick-labor`) on Core — MOTOR VIN/plate lookup; Catalog Labor Library stays | `src/server/crm-access.ts` | ⬜ Macuto verify |
| 2026-07-13 | Vehicle specs | Hide estimate right-rail VEHICLE SPECS (vPIC) + drawer specs on Core | `shop-capabilities.tsx`, `estimate-lab-right-rail.tsx`, context drawer | ⬜ Macuto verify |
| 2026-07-13 | Payments | Core: no Stripe Collect CTA — Money card **Record $…**, manual cash/check/card/other only; hide Stripe connect upsells in finance/share/dashboard | `estimate-lab-right-rail.tsx`, `payment-methods-panel.tsx`, `payment-finance-panel.tsx`, `share-invoice-dialog.tsx`, `dashboard-view.tsx`, `ro-context-deck.tsx` | ⬜ Macuto verify |
| 2026-07-13 | Vehicle decode | Core: no Auto.dev plate→VIN — manual plate entry + free NHTSA VIN only (`autodevDecoding` plan gate) | `plans.ts`, `vehicles.ts`, `vin.ts`, vehicle drawer/edit/add dialogs | ⬜ Macuto verify |
| 2026-07-13 | Settings | Prune Core admin settings to plan-included sections; redirect blocked settings → Subscription | `settings-plan-gates.ts`, settings layout/nav | ⬜ Macuto verify |
| 2026-07-13 | AI intake | Smart RO Intake gated to Core + AI Plus add-on only | `plans.ts`, `shop-capabilities.tsx`, `smart-ro-intake.ts` | ⬜ Macuto verify |
| 2026-07-14 | PartsTech | **Open PR #26** — keep PartsTech fully gated off Core (nav / Parts Center / Vendor Connect / `testVendorConnection`) | `nav.ts`, `module-subnav.tsx`, `shop-capabilities.tsx`, `vendor-integrations.ts` | ⬜ pending merge |
| 2026-07-14 | Vehicle form | **Open PR #27** — free-type Year/Make/Model/Trim on Core (skip catalog pickers); hide registration state from VIN decode header | `add-vehicle-dialog.tsx`, vehicle form controls | ⬜ pending merge |
| 2026-07-14 | Customer drawer | **Open PR #29** — hide Finances tab on Core; remove Credit Memo stub from drawer rail | `estimate-lab-context-drawer*.tsx` | ⬜ pending merge |

### Open Core gatekeeping PRs (not yet on `main`)

| PR | Branch | Intent |
|----|--------|--------|
| [#26](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/26) | `cursor/core-partstech-gate-keep-5e7c` | PartsTech stays off Core |
| [#27](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/27) | `cursor/core-manual-ymm-type-5e7c` | Manual YMM typing + VIN header cleanup |
| [#29](https://github.com/tabishdavid-coder/ShopRallyLLC/pull/29) | `cursor/core-hide-finances-tab-5e7c` | Hide Finances / Credit Memo on Core |

### Template (copy for new rows)

```markdown
| YYYY-MM-DD | Nav / Labor / Payments / … | What changed and why | `path/to/file` | ✅ Core shop tested / ⬜ pending |
```
