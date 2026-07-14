# ShopRally Scale Plan — Core → 200 + AI Instant Quote

> **Updated packaging (2026-07-14):** Ignition is locked at **$49.99/mo** + **AI Plus $20/mo** (mobile included).  
> Use the new outlook: **[`IGNITION-200-OUTLOOK.md`](./IGNITION-200-OUTLOOK.md)** · screen [`ignition-200-outlook.html`](./ignition-200-outlook.html) · `node scripts/ignition-200-outlook.mjs`  
> This document keeps the earlier higher-price Core scenario for comparison.

**Date:** 2026-07-11  
**Status:** Full planning model (superseded on price by Ignition outlook)  
**Interactive screen:** [`scale-plan-core-200.html`](./scale-plan-core-200.html) (also `/opt/cursor/artifacts/shoprally-scale-plan-core-200.html`)  
**Annual P&L scale (Shops × cost lines):** [`CORE-PNL-SCALE.md`](./CORE-PNL-SCALE.md) · `node scripts/core-pnl-scale.mjs`  
**Runner:** `node scripts/core-to-200-scenario.mjs`  
**Prices:** `src/lib/plans.ts` · **Release:** `docs/PHASED-ROLLOUT.md` P0

---

## Headline

| | |
|--|--|
| **Path** | Core only · **no MOTOR** · AI Instant Quote wedge |
| **Time to 200** | **20 months** |
| **MRR @ 200** | **$29,709** |
| **ARR @ 200** | **$356,504** |
| **MOTOR COGS** | **$0** |

**AI Instant Quote example (in the model):**

> how much is front brake pads and rotors on 2014 honda accord exl v6

→ YMM + job + ballpark $ from **shop labor library / AI-labeled hours** (not licensed MOTOR).

---

## 1. Packaging

| Item | Detail | Price / limit |
|------|--------|---------------|
| Core CRM | Job board, ROs, DVIs, email share, shop labor library, 100 VIN/plate | $119 / $109 annual |
| AI Instant Quote (included) | NL → YMM + job + ballpark $ | **40 quotes/mo** |
| AI Instant Quote add-on | Higher allowance · sales wedge | **$39/mo** |
| AI overage | Beyond free tier (heavy non-addon users) | **$15 / 100** |
| Web presence | ShopSite / Local SEO / bundle | $99–$199/mo |
| Licensed MOTOR | **OFF** until Pro + `motorLabor` | $0 COGS |

---

## 2. Milestone plan

| Milestone | Month | Shops | MRR | ARR | Focus |
|-----------|-------|-------|-----|-----|--------|
| 10 shops | M3 | 12 | $1,783 | $21,390 | Founding · Core smoke · AI Quote beta |
| 25 shops | M5 | 25 | $3,714 | $44,563 | Referral loop · outbound hire |
| 50 shops | M8 | 52 | $7,724 | $92,691 | Inbound AI demo landing |
| 100 shops | M13 | 112 | $16,637 | $199,642 | Partner channel · MOTOR talks start |
| 150 shops | M16 | 155 | $23,024 | $276,290 | Support scale · Pro waitlist |
| **200 shops** | **M20** | **200** | **$29,709** | **$356,504** | Steady Core book · Pro/MOTOR gate |

---

## 3. Revenue breakout @ 200

| Line | MRR | Share | ARR |
|------|------|-------|-----|
| Core subscription | $22,700 | 76.4% | $272,400 |
| AI Instant Quote add-on | $3,744 | 12.6% | $44,928 |
| AI quote overage | $225 | 0.8% | $2,700 |
| Web presence | $2,880 | 9.7% | $34,560 |
| VIN overage | $160 | 0.5% | $1,920 |
| **Total** | **$29,709** | **100%** | **$356,504** |

| Cost / contribution | $/mo |
|---------------------|------|
| AI LLM COGS | $961 |
| MOTOR COGS | $0 |
| OpEx ballpark | $24,000 |
| **Contribution** | **~$4,748** |

---

## 4. Sales channel breakout

| Channel | Logos (gross) | Share |
|---------|---------------|-------|
| Founding / referral | 40 | 18% |
| Outbound (AE/SDR) | 71 | 32% |
| **Inbound (AI Quote demo)** | **71** | **32%** |
| Partner / reseller | 37 | 17% |
| **Gross adds** | **220** | **100%** |
| Churned (monthly cohort) | 17 | — |

---

## 5. Product mix @ 200

| Bundle | Shops | MRR |
|--------|------|------|
| Core only | 92 | $10,442 |
| **Core + AI Quote** | **84** | **$12,810** |
| Core + Web | 12 | $2,802 |
| Core + AI + Web | 12 | $3,270 |

---

## 6. Phase plan (ops)

| Phase | Months | Shops | Product | GTM | Release flags |
|-------|--------|-------|---------|-----|---------------|
| **P0a Founding** | 1–3 | 0→12 | Core + AI Quote beta | Founding / referral | All Phase1+ dark |
| **P0b Traction** | 4–8 | 12→52 | AI add-on sell-through | Outbound starts | `motorLabor` OFF |
| **P0c Inbound** | 9–13 | 52→112 | AI demo landing | Inbound rises | `motorLabor` OFF |
| **P0d Scale** | 14–20 | 112→200 | Steady Core book | Partner + inbound | MOTOR talks only |
| **P1/P2 Unlock** | post-200 or ≥100 + license | — | Pro + MOTOR | Upgrade path | `motorLabor` pilots |

---

## 7. Full monthly ramp

| Mo | Shops | +Adds | -Churn | Core MRR | AI MRR | Web MRR | Other | Total MRR | ARR |
|----|------:|------:|-------:|---------:|-------:|--------:|------:|----------:|----:|
| 1 | 3 | 3 | 0 | $341 | $59 | $43 | $2 | $446 | $5,348 |
| 2 | 7 | 4 | 0 | $795 | $139 | $101 | $6 | $1,040 | $12,478 |
| 3 | 12 | 5 | 0 | $1,362 | $238 | $173 | $10 | $1,783 | $21,390 |
| 4 | 18 | 6 | 0 | $2,043 | $357 | $259 | $14 | $2,674 | $32,085 |
| 5 | 25 | 7 | 0 | $2,838 | $496 | $360 | $20 | $3,714 | $44,563 |
| 6 | 33 | 8 | 0 | $3,746 | $655 | $475 | $26 | $4,902 | $58,823 |
| 7 | 42 | 9 | 0 | $4,767 | $833 | $605 | $34 | $6,239 | $74,866 |
| 8 | 52 | 10 | 0 | $5,902 | $1,031 | $749 | $42 | $7,724 | $92,691 |
| 9 | 62 | 11 | 1 | $7,037 | $1,231 | $893 | $50 | $9,210 | $110,516 |
| 10 | 73 | 12 | 1 | $8,286 | $1,449 | $1,051 | $58 | $10,844 | $130,124 |
| 11 | 85 | 13 | 1 | $9,648 | $1,686 | $1,224 | $68 | $12,626 | $151,514 |
| 12 | 98 | 14 | 1 | $11,123 | $1,945 | $1,411 | $78 | $14,557 | $174,687 |
| 13 | 112 | 15 | 1 | $12,712 | $2,223 | $1,613 | $90 | $16,637 | $199,642 |
| 14 | 126 | 15 | 1 | $14,301 | $2,501 | $1,814 | $101 | $18,716 | $224,597 |
| 15 | 141 | 16 | 1 | $16,004 | $2,798 | $2,030 | $113 | $20,945 | $251,335 |
| 16 | 155 | 16 | 2 | $17,593 | $3,076 | $2,232 | $124 | $23,024 | $276,290 |
| 17 | 170 | 17 | 2 | $19,295 | $3,373 | $2,448 | $136 | $25,252 | $303,028 |
| 18 | 185 | 17 | 2 | $20,998 | $3,671 | $2,664 | $148 | $27,480 | $329,766 |
| 19 | 195 | 12 | 2 | $22,133 | $3,869 | $2,808 | $156 | $28,966 | $347,591 |
| **20** | **200** | **10** | **2** | **$22,700** | **$3,969** | **$2,880** | **$160** | **$29,709** | **$356,504** |

---

## 8. Assumptions

| Input | Value |
|-------|--------|
| Core list / annual | $119 / $109 |
| Annual mix | 55% → Core ARPU $113.50 |
| AI attach / price | 48% @ $39 |
| Web attach / ARPU | 12% @ $120 |
| Monthly churn (monthly cohort) | 2.5% |
| Start → target | 0 → 200 |
| AI free quotes / overage | 40/mo · $15/100 |
| LLM COGS | ~$0.04 / quote (illustrative) |

---

## 9. Pro / MOTOR unlock gate

Unlock **only when all are true:**

1. MOTOR DaaS **commercial** license signed  
2. ≥ ~100 Core shops **or** paid Pro waitlist  
3. Support capacity for labor-data tickets  
4. Release flag pilots → GA (`motorLabor`)

Until then: sell AI Instant Quote + shop library honestly — never claim licensed flat-rate guides.

---

## Re-run

```bash
node scripts/core-to-200-scenario.mjs
node scripts/core-to-200-scenario.mjs --ai-attach=0.55 --web-attach=0.15
open docs/scenarios/scale-plan-core-200.html
```
