# Ignition financial outlook — 1 → 200 shops

**Date:** 2026-07-14
**Status:** Locked Ignition packaging · planning model
**Runner:** `node scripts/ignition-200-outlook.mjs`

## Packaging (locked)

| Item | Price | Notes |
|------|------:|-------|
| **Ignition** (Core CRM) | **$49.99/mo** ($44.99/mo annual) | Job board, ROs, DVIs, email share/approve, shop labor library, appointments, payment tracking, Live Ops Snapshot, NHTSA VIN |
| **AI Plus** | **$20/mo** | Smart / freeform RO intake · labor assist · **advisor mobile app** |
| MOTOR / PartsTech / SMS / Stripe Connect | — | **Off** until Pro |
| ShopSite / Local SEO | $99–$199/mo | Optional attach (soft) |

Base Ignition ARPU ≈ **$47.24/mo** before AI/web attach.

## Headline @ 200

| | |
|--|--|
| **Shops** | **200** |
| **Blended ARPU** | **$71.64/mo** (50% AI Plus) |
| **MRR** | **$14k** |
| **ARR** | **$172k** |
| **Vendor run-rate** | **$1,911/mo** (13.3% of ARR) |
| **Contribution after vendors** | **$12k/mo** |
| **Op. profit (after payroll)** | **-$375k/yr** (-218% margin) |

## Revenue ramp

| Shops | AI Plus attach | ARPU | MRR | ARR | Vendor $/mo | Contrib $/mo |
|------:|---------------:|-----:|----:|----:|------------:|-------------:|
| 1 | 0% | $47.24 | $47 | $567 | $33 | $15 |
| 5 | 20% | $57.24 | $286 | $3,434 | $82 | $204 |
| 10 | 28% | $60.04 | $600 | $7,205 | $153 | $447 |
| 25 | 35% | $63.84 | $1,596 | $19k | $331 | $1,265 |
| 50 | 40% | $67.24 | $3,362 | $40k | $457 | $2,906 |
| 100 | 45% | $68.24 | $6,824 | $82k | $1,017 | $5,807 |
| 150 | 48% | $70.04 | $11k | $126k | $1,288 | $9,218 |
| 200 | 50% | $71.64 | $14k | $172k | $1,911 | $12k |

## What it costs to stay live (monthly vendors)

### Stack map

| Category | Services | Notes |
|----------|----------|-------|
| **Infrastructure** | Vercel, Neon Postgres, Clerk, Inngest, Vercel Blob, Upstash (optional), domain/DNS | Scales with traffic & DB size |
| **Security / reliability** | Vercel TLS, Cloudflare (free), Sentry, uptime/logs | No separate WAF bill early; Clerk = auth security |
| **Email** | Resend | Estimate / invoice / approval mail |
| **SMS** | — | **$0 on Ignition** |
| **AI COGS** | Gemini (or current provider) | Only for AI Plus seats |
| **Mobile** | Apple Developer, Google Play, EAS builds, push | Required for AI Plus advisor app |
| **Payments** | Stripe Billing | Collects Ignition + AI Plus subs (~2.9%+$0.30) |
| **Data licenses** | — | **$0** (no MOTOR · NHTSA VIN free) |

### Vendor detail at key scales

#### 1 shop — **$33/mo** vendors (MRR $47)

| Line | $/mo |
|------|-----:|
| Vercel | $20 |
| Neon | $0 |
| Clerk | $0 |
| Inngest | $0 |
| Blob storage | $0 |
| Redis (rate limit) | $0 |
| Domain / DNS | $2 |
| **Infra subtotal** | **$22** |
| Sentry | $0 |
| Uptime / logs | $0 |
| **Security subtotal** | **$0** |
| Resend email | $0 |
| Twilio SMS | $0 |
| Gemini AI COGS | $0 |
| Mobile (Apple/Play/EAS) | $9 |
| Stripe Billing fees | $2 |
| **Total vendors** | **$33** |

#### 25 shops — **$331/mo** vendors (MRR $1,596)

| Line | $/mo |
|------|-----:|
| Vercel | $45 |
| Neon | $69 |
| Clerk | $25 |
| Inngest | $20 |
| Blob storage | $10 |
| Redis (rate limit) | $0 |
| Domain / DNS | $2 |
| **Infra subtotal** | **$171** |
| Sentry | $26 |
| Uptime / logs | $20 |
| **Security subtotal** | **$46** |
| Resend email | $20 |
| Twilio SMS | $0 |
| Gemini AI COGS | $22 |
| Mobile (Apple/Play/EAS) | $18 |
| Stripe Billing fees | $54 |
| **Total vendors** | **$331** |

#### 100 shops — **$1,017/mo** vendors (MRR $6,824)

| Line | $/mo |
|------|-----:|
| Vercel | $120 |
| Neon | $129 |
| Clerk | $99 |
| Inngest | $75 |
| Blob storage | $40 |
| Redis (rate limit) | $10 |
| Domain / DNS | $2 |
| **Infra subtotal** | **$475** |
| Sentry | $80 |
| Uptime / logs | $20 |
| **Security subtotal** | **$100** |
| Resend email | $35 |
| Twilio SMS | $0 |
| Gemini AI COGS | $144 |
| Mobile (Apple/Play/EAS) | $35 |
| Stripe Billing fees | $228 |
| **Total vendors** | **$1,017** |

#### 200 shops — **$1,911/mo** vendors (MRR $14k)

| Line | $/mo |
|------|-----:|
| Vercel | $220 |
| Neon | $199 |
| Clerk | $149 |
| Inngest | $120 |
| Blob storage | $80 |
| Redis (rate limit) | $30 |
| Domain / DNS | $2 |
| **Infra subtotal** | **$800** |
| Sentry | $80 |
| Uptime / logs | $40 |
| **Security subtotal** | **$120** |
| Resend email | $80 |
| Twilio SMS | $0 |
| Gemini AI COGS | $380 |
| Mobile (Apple/Play/EAS) | $55 |
| Stripe Billing fees | $476 |
| **Total vendors** | **$1,911** |

## Annual P&L (vendors + people)

| Shops | HC | ARR | Vendor | Payroll | Marketing | G&A | Sec. projects | Total cost | Op. profit | Margin |
|------:|---:|----:|-------:|--------:|----------:|----:|--------------:|-----------:|-----------:|-------:|
| 1 | 1 | $567 | $391 | $160k | $6,000 | $12k | $0 | $178k | -$178k | -31369% |
| 5 | 1 | $3,434 | $987 | $160k | $6,000 | $12k | $0 | $179k | -$176k | -5112% |
| 10 | 1 | $7,205 | $1,840 | $160k | $6,000 | $12k | $0 | $180k | -$173k | -2396% |
| 25 | 1.5 | $19k | $3,968 | $195k | $10k | $18k | $0 | $227k | -$208k | -1085% |
| 50 | 2 | $40k | $5,478 | $260k | $10k | $18k | $6,000 | $299k | -$259k | -642% |
| 100 | 3 | $82k | $12k | $345k | $10k | $28k | $6,000 | $401k | -$319k | -390% |
| 150 | 3.5 | $126k | $15k | $403k | $10k | $28k | $18k | $474k | -$348k | -276% |
| 200 | 4 | $172k | $23k | $460k | $10k | $36k | $18k | $547k | -$375k | -218% |

Payroll dominates. Infra stays a small % of ARR even at 200.

## Go-live one-time costs (before / at shop #1)

| Item | Low | High |
|------|----:|-----:|
| Domain + DNS setup | $20 | $40 |
| Apple Developer Program (year 1) | $99 | $99 |
| Google Play Console | $25 | $25 |
| Clerk / Neon / Vercel card on file (pro rates) | $0 | $50 |
| Legal: ToS + Privacy + MSA template | $500 | $2500 |
| Logo / brand polish (optional) | $0 | $1500 |
| Founding launch ads / waitlist boost | $500 | $3000 |
| First Expo production builds + TestFlight cycle | $0 | $200 |
| **Total** | **$1144** | **$7414** |

## Mobile app (AI Plus) — cost notes

- **Included in AI Plus $20/mo** for the customer — Advisor mobile companion.
- **Your COGS:** Apple $99/yr, Google Play $25 once, EAS build minutes, push infra.
- Model treats mobile as **~$9 → $55/mo** platform cost from 1 → 200 shops (builds + store ops), not per-seat.
- Gemini usage for intake/labor assist scales with AI Plus attach (~$2.50–$3.80 per AI seat / mo).

## Security costs — what you actually pay

| Layer | Cost treatment |
|-------|----------------|
| TLS / HTTPS | $0 (Vercel) |
| Auth / MFA / org isolation | Clerk (in infra) |
| Multi-tenant `shopId` isolation | Engineering (payroll) |
| Error monitoring | Sentry (~$0 → $80/mo) |
| Uptime | Better Stack / similar (~$0 → $40/mo) |
| WAF / DDoS | Cloudflare free for early; upgrade later |
| Backups | Neon PITR on paid plans |
| Pen test / SOC2 path | Annual projects from ~50–150 shops ($6k → $18k/yr) |

## Decisions to watch

1. **AI Plus attach** drives both ARPU and Gemini COGS — mobile is the conversion lever.
2. **Stay on Vercel+Neon+Clerk** — vendor % of ARR stays mid–single digits at 200.
3. **People, not infra, gate profit** — hire carefully until ~100+ logos.
4. **No MOTOR / SMS on Ignition** keeps variable COGS near zero until Pro.



## Founder-draw reality check (important)

At **$49.99 Ignition**, vendor costs stay healthy — but **full-market payroll sinks the P&L** until ARPU or logos grow further.

Contribution after vendors @ 200 ≈ **$12k/mo (~$146k/yr)**. That can fund:

| Draw style @ 200 | Annual people + G&A ballpark | Op. result vs $172k ARR |
|------------------|------------------------------|-------------------------|
| Full 4 HC loaded (~$115k each) + mkt + G&A | ~$524k | Large loss (table above) |
| **2 HC** (you + 1) @ $90k loaded + light mkt | ~$220k | Still tight / small loss |
| **Founder + contractor** ~$120k all-in + $10k mkt + $20k G&A | ~$150k | Near breakeven / small profit |
| **Founder sweat equity** $60k draw + $8k mkt + $12k G&A + vendors $23k | ~$103k | **Profit ~$69k** |

**Read:** Infra does **not** block going live. Cash risk is **how fast you hire** vs Ignition ARPU. Keep HC lean until AI Plus attach and/or Pro tier expand ARPU.

### Cash needed to reach 25 / 100 / 200 (illustrative)

Assumes vendor costs from model + $8–12k/mo living/ops burn while growing (founder salary heavy early):

| Milestone | Logos | Monthly burn focus | Rough runway cash if start near $0 |
|-----------|------:|--------------------|-------------------------------------|
| Live | 1 | ~$33 vendors + your time | **$1.1k–$7.4k** one-time + 3 mo personal runway |
| Traction | 25 | ~$331 vendors + light ads | Prefer customers fund ads; avoid big hire |
| Scale | 100 | ~$1.0k vendors | First support hire only when MRR > ~$5–6k |
| 200 | 200 | ~$1.9k vendors · ~$14k MRR | Ops hire(s) funded by contribution, not debt |

---

## Related

- Prior (higher-price) Core model: [`CORE-TO-200-SHOPS.md`](./CORE-TO-200-SHOPS.md), [`CORE-PNL-SCALE.md`](./CORE-PNL-SCALE.md)
- Hosting compare: [`VERCEL-VS-BUBBLE.md`](./VERCEL-VS-BUBBLE.md)
- Live packaging: `src/lib/plans.ts` (Ignition $49.99 · AI Plus $20)
