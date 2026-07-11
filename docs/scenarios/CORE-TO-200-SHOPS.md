# Scenario: Core → 200 shops + AI Instant Quote (no MOTOR)

**Date:** 2026-07-11  
**Status:** Planning model (runnable)  
**Runner:** `node scripts/core-to-200-scenario.mjs`  
**Canonical Core prices:** `src/lib/plans.ts` (`STARTER`)  
**Release alignment:** `docs/PHASED-ROLLOUT.md` — **P0 Core CRM** + Core-safe AI quote (not Elite `aiSuite`)

---

## Thesis

Ship **Core** to **200 paying shops** with **no licensed MOTOR**, and lead with **AI Instant Quote** — a natural-language input that turns customer/advisor questions into ballpark estimates.

**Example input (part of the model):**

> how much is front brake pads and rotors on 2014 honda accord exl v6

**System parses → returns:**

| Step | Output |
|------|--------|
| Vehicle | 2014 Honda Accord EX-L V6 |
| Job | Front brake pads + rotors (R&R) |
| Labor | Hours from **shop library** or **AI-labeled** estimate (not MOTOR EWT) |
| Parts | Placeholder / catalog hints |
| $ | Ballpark at shop labor rate + parts matrix |

This is the Core-path answer to “we don’t have MOTOR yet” — advisors still quote fast; hours are clearly **non-licensed**.

---

## Product packaging (Core path)

| Layer | Default | Notes |
|-------|---------|--------|
| **Included on Core** | **40 NL quotes / mo** | Enough for light advisor use |
| **AI Instant Quote add-on** | **$39/mo** | Higher allowance (~500 quotes); sales wedge |
| **Overage** | **$15 / 100** | Heavy free-tier users |
| **LLM COGS** | ~**$0.04 / quote** (illustrative) | Stays tiny vs MRR |
| **MOTOR** | **OFF** | Unlock Pro + `motorLabor` later |

Do **not** market these hours as MOTOR/Mitchell flat-rate.

---

## Assumptions (default run)

| Input | Default |
|-------|---------|
| Start / target | 0 → **200** Core shops |
| Core price | $119 / $109 annual · **55%** annual → Core ARPU **$113.50** |
| AI Quote attach | **48%** @ $39 |
| Web attach | **12%** @ ~$120 blended |
| Churn | 2.5%/mo on monthly cohort |
| VIN overage | ~8% of shops × $10 pack |
| Horizon | **~20 months** to 200 |

---

## Revenue breakout @ 200 shops

*From `node scripts/core-to-200-scenario.mjs` — re-run for authoritative $.*

| Line | MRR | Share |
|------|------|-------|
| **Core subscription** | **$22,700** | 76.4% |
| **AI Instant Quote add-on** | **$3,744** | 12.6% |
| **AI quote overage** | $225 | 0.8% |
| **Web presence** | $2,880 | 9.7% |
| **VIN overage** | $160 | 0.5% |
| **Total** | **$29,709 MRR · $356,504 ARR** | 100% |

**COGS @ 200:** MOTOR **$0** · AI LLM ~**$961**/mo · contribution after lean OpEx ~**$4.7k**/mo.

Vs Core-only without AI add-on (~$25.6k MRR): AI Quote line adds **~$4.0k MRR** plus the inbound demo wedge.

---

## Sales breakout

### A) Channel mix (gross logos over the ramp)

| Channel | Role | Approx share of adds |
|---------|------|----------------------|
| **Founding / referral** | Early trust | High early → low later |
| **Outbound (AE/SDR)** | Independent shops, Clever-class price | Steady ~30–35% |
| **Inbound (AI Quote demo)** | “Type a job + YMM → ballpark” landing / sales demo | Grows to **~40%** by scale |
| **Partner / reseller** | Accountants, bay builders, multi-shop ops | ~10–20% |

AI Instant Quote is the **inbound wedge**: same demo line every time — paste the Honda brakes sentence, show ballpark in &lt;10s.

### B) Product mix @ 200 shops

| Bundle | ~Shops | ~MRR |
|--------|--------|------|
| Core only | ~90 | Core ARPU |
| **Core + AI Quote** | ~85 | Core + $39 |
| Core + Web | ~15 | Core + ~$120 |
| **Core + AI + Web** | ~10 | Core + $39 + ~$120 |

Most revenue still Core subscription; AI is the **attach / conversion** lever, not the whole P&L.

---

## Operating rules

1. NL quotes never return sandbox MOTOR hours in prod.
2. UI labels AI / shop-library hours distinctly from future `motor_ewt`.
3. Meter free tier (40/mo); sell $39 add-on in onboarding and when advisors hit the cap.
4. Keep Elite `aiSuite` (receptionist, review AI, etc.) separate — Instant Quote is **Core-safe**.
5. Pro unlock still requires signed MOTOR DaaS before licensed hours.

---

## How to run

```bash
node scripts/core-to-200-scenario.mjs
node scripts/core-to-200-scenario.mjs --ai-attach=0.55 --web-attach=0.15
node scripts/core-to-200-scenario.mjs --json
```

---

## Related

- `docs/GROWTH-POSITIONING.md`  
- `docs/PHASED-ROLLOUT.md`  
- `docs/design/taxonomy-scaffold-ai-gap-fill.md`  
- `src/lib/plans.ts` — Core cents; Elite AI suite is separate  
