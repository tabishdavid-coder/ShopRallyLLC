# Scenario: Core-only to 200 shops (no MOTOR)

**Date:** 2026-07-11  
**Status:** Planning model (runnable)  
**Runner:** `node scripts/core-to-200-scenario.mjs`  
**Canonical prices:** `src/lib/plans.ts` (`STARTER` / Core)  
**Release alignment:** `docs/PHASED-ROLLOUT.md` — **P0 Core CRM**

---

## Thesis

Ship **Core first** to **200 paying shops** with **no licensed MOTOR data**.

| Layer | Choice | Why |
|-------|--------|-----|
| **Plan** | Core only (`STARTER`) | $119/mo · $109 annual — lowest friction vs Tekmetric/AutoLeap |
| **Labor** | Shop labor library + reference taxonomy + AI gap-fill | `LABOR_CATALOG_MODE=reference` — **no MOTOR DaaS commercial license** |
| **Release flags** | `motorLabor`, `sms`, `growthEngine`, `partsTech`, `shopSite`, `websiteSeo`, `aiSuite` **dark** in prod | Deploy ≠ release; Core has no release flag |
| **Payments** | Email estimates / invoices; Stripe Connect deferred | Matches Core entitlement (no Stripe Connect on Core) |
| **MOTOR unlock** | After ~100–150 Core shops **and** signed DaaS contract | Avoids per-shop / platform COGS before product-market fit |

This is the **cheapest legal path** to a real multi-tenant CRM book: no MOTOR redistribution risk, no SMS Twilio burn, no Growth Engine support load until Core retention is proven.

---

## What Core shops get (and do not)

**Included (P0):** Job board, ROs/estimates, customers/vehicles, DVIs, email share/approve, canned jobs, Operations Daily Snapshot, unlimited users/ROs, **100 VIN & plate decodes/mo** ($10 per extra 100), **shop labor library**.

**Not included (gate to Pro+):** Licensed MOTOR, unlimited VIN/plate, PartsTech punchout, Stripe Connect, two-way SMS, Growth Engine, online booking, Google Reviews, ShopSite/SEO (except paid add-ons), AI suite.

Labor UX without MOTOR: browse **reference** System → Group → SubGroup tree; hours from shop library + **AI estimates labeled as non-MOTOR**. See `docs/design/taxonomy-scaffold-ai-gap-fill.md`.

---

## Scenario assumptions (default run)

| Input | Default | Notes |
|-------|---------|--------|
| Start | 0 paying shops | “From now” = founding go-live |
| Target | 200 Core shops | One location = one shop |
| List price | $119 / $109 annual | From `PLANS.STARTER` |
| Annual mix | 55% | Blended Core ARPU ≈ **$113.50** |
| Soft churn | 2.5%/mo on **monthly** cohort only | Annual treated as prepaid year |
| Web add-on attach | 12% @ ~$120 blended | ShopSite $99 / SEO $129 / bundle $199 |
| Effective ARPU | ≈ **$127.90** | Core + add-on contribution |
| MOTOR COGS | **$0** | Entire ramp |
| Horizon | ~18–24 months | Ramp curve in script |

OpEx at 200 (~$22.5k/mo infra+support+sales) is **illustrative**, not a full P&L.

---

## Path (default ramp)

Run output is authoritative; order of magnitude:

| Milestone | ~Month | Approx MRR (effective ARPU) |
|-----------|--------|------------------------------|
| 10 shops | early | ~$1.3k |
| 25 shops | mid single-digits | ~$3.2k |
| 50 shops | ~M7–9 | ~$6.4k |
| 100 shops | ~M12–14 | ~$12.8k |
| 150 shops | ~M15–17 | ~$19.2k |
| **200 shops** | **~M18–22** | **~$25.6k MRR · ~$307k ARR** |

Sales motion: founding shops → referral/partner → outbound to single-bay / independent shops that want cloud CRM **without** paying for MOTOR or marketing add-ons.

---

## Operating rules while on this path

1. **Never** serve sandbox MOTOR hours in production customer UI.
2. Keep `MOTOR_ENABLED=false` / `motorLabor` release OFF until commercial DaaS is signed.
3. Sell Core honestly: “shop labor library + AI estimates” — do **not** claim licensed flat-rate guides.
4. Meter VIN/plate on Core (100/mo); do not silently give unlimited.
5. Platform console onboards shops on **Core** plan; Pro assignment only when MOTOR + Pro modules are ready.
6. Expand-only migrations; one shared prod version (`docs/MIGRATION-EXPAND-CONTRACT.md`).

---

## When to break out of Core-only

Unlock **Pro + `motorLabor`** when **all** are true:

1. MOTOR DaaS **commercial** license signed (not sandbox).
2. ≥ ~100 Core shops **or** clear paid demand for licensed hours (lost deals / upgrade waitlist).
3. Support capacity for labor-data tickets.
4. Release flag ramp: pilot Pro shops → GA (`docs/PHASED-ROLLOUT.md` P1→P2).

Until then, every dollar of Core MRR has **$0 MOTOR COGS**.

---

## How to re-run

```bash
node scripts/core-to-200-scenario.mjs
node scripts/core-to-200-scenario.mjs --annual-share=0.7 --addon-attach=0.2
node scripts/core-to-200-scenario.mjs --json
```

Flags: `--monthly-price`, `--annual-price`, `--annual-share`, `--monthly-churn`, `--addon-attach`, `--addon-arpu`, `--start`, `--target`, `--json`.

---

## Related

- `docs/GROWTH-POSITIONING.md` — public plan cards  
- `docs/PHASED-ROLLOUT.md` — P0 vs MOTOR release  
- `docs/design/taxonomy-scaffold-ai-gap-fill.md` — labor without license  
- `src/lib/plans.ts` — Core cents & bullets  
