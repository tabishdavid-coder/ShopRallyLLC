# ShopRally Ignition — Investor & founder financial pitch

**Audience:** Founder + potential investors / angels  
**Date:** 2026-07-14  
**Team model:** **Solo founder — no planned hires through 200 shops**  
**Product packaging (locked):** Ignition **$89.99/month** · annual **$84.99/month equivalent** · **PartsTech included** · optional **AI Plus $49.99/month**  
**Runner:** `node scripts/ignition-200-outlook.mjs`  
**Screen:** [`ignition-200-outlook.html`](./ignition-200-outlook.html) · pitch HTML: [`ignition-investor-pitch.html`](./ignition-investor-pitch.html)

---

## Direct answer: Is Vercel needed for every shop?

**No. Vercel is one shared host for the whole company — not per shop.**

ShopRally is a **multi-tenant SaaS (Software as a Service)** product:

| What you buy once | What each repair shop “uses” |
|-------------------|------------------------------|
| **One** Vercel project (hosts the Next.js web app) | Their login, data, and traffic share that same deployment |
| **One** Neon Postgres database | Rows tagged with `shopId` (tenant isolation) |
| **One** Clerk application (auth) | Each shop can be an Organization inside that same app |
| **One** domain (e.g. app.getshoprally.com) | Paths / org context separate shops; no new server per logo |

**Cost does go up with more shops**, but only because **usage** rises (more requests, more database storage, more emails, more AI seats) — you do **not** buy a new Vercel account or new server for shop #2, #50, or #200.

Think of it like: **one restaurant kitchen, many customers** — not “build a new kitchen for every customer.”

---

## Glossary (acronyms expanded)

| Term | Meaning |
|------|---------|
| **SaaS** | Software as a Service — subscription software hosted in the cloud |
| **CRM** | Customer Relationship Management — customers, vehicles, repair orders, job board |
| **RO** | Repair Order — the shop’s work ticket / estimate / invoice record |
| **DVI** | Digital Vehicle Inspection — multi-point inspection with photos and share links |
| **MRR** | Monthly Recurring Revenue — subscription revenue this month |
| **ARR** | Annual Recurring Revenue — MRR × 12 (run-rate) |
| **ARPU** | Average Revenue Per User (here: per shop logo) |
| **COGS** | Cost of Goods Sold — variable cost to deliver the product |
| **OpEx** | Operating Expenses — ongoing business costs |
| **G&A** | General & Administrative — legal, insurance, bookkeeping, admin tools |
| **API** | Application Programming Interface — how services talk to each other |
| **TLS / SSL** | Transport Layer Security / Secure Sockets Layer — HTTPS encryption (included on Vercel) |
| **WAF** | Web Application Firewall — blocks common web attacks |
| **DNS** | Domain Name System — how getshoprally.com points to the host |
| **PITR** | Point-In-Time Recovery — database restore to a prior moment (Neon paid plans) |
| **MAU** | Monthly Active Users — Clerk billing metric |
| **SMS** | Short Message Service — text messaging (off on Ignition; Pro later) |
| **VIN** | Vehicle Identification Number |
| **YMM** | Year / Make / Model |
| **NHTSA** | National Highway Traffic Safety Administration — public VIN decode source |
| **MOTOR** | Licensed motor labor / flat-rate data vendor (off on Ignition; Pro later) |
| **LLM** | Large Language Model — AI model (e.g. Google Gemini) used for AI Plus |
| **EAS** | Expo Application Services — cloud builds for the mobile app |
| **APNs** | Apple Push Notification service |
| **FCM** | Firebase Cloud Messaging — Android push |
| **SOC 2** | Service Organization Control 2 — security audit framework (later-stage) |
| **MSA** | Master Service Agreement — shop / platform contract |
| **ToS** | Terms of Service |
| **GCP / AWS** | Google Cloud Platform / Amazon Web Services — not required as primary host; Vercel covers app hosting |

**Vendors named in this model**

| Vendor | Role |
|--------|------|
| **Vercel** | Hosts the Next.js web application (serverless) — **one project for all shops** |
| **Neon** | Hosted Postgres database — **one database, multi-tenant rows** |
| **Clerk** | Authentication & organizations (logins, sessions) |
| **Inngest** | Background jobs / scheduled tasks |
| **Vercel Blob** | File storage (inspection photos, attachments) |
| **Upstash** | Optional Redis for rate limiting / cache |
| **Resend** | Transactional email (estimates, approvals, invoices) |
| **Twilio** | SMS provider — **$0 on Ignition** (feature gated off) |
| **Stripe Billing** | Collects Ignition + AI Plus subscriptions from shops |
| **Stripe Connect** | Shop-facing card payments — **off on Ignition** (Pro later) |
| **Sentry** | Error monitoring |
| **Better Stack** (or similar) | Uptime / status / logs |
| **Cloudflare** | DNS / CDN (Content Delivery Network) / optional free WAF layer |
| **Google Gemini** | LLM provider for AI Plus intake / labor assist |
| **Apple Developer / Google Play** | Mobile store accounts for the advisor app |
| **Expo / EAS** | Mobile build pipeline |

---

## The ask / the story (one page)

**ShopRally Ignition** is a **cloud multi-tenant auto-repair shop CRM** priced to win independents who do not need MOTOR, SMS marketing, or Stripe Connect on day one.

| | |
|--|--|
| **Price** | **$89.99/month** per shop location ( **$84.99/month** on annual billing ) · PartsTech included |
| **Upsell** | **AI Plus $49.99/month** — freeform / Smart RO intake, labor assist, **advisor mobile app** |
| **Infrastructure** | **Single shared stack** (Vercel + Neon + Clerk …) — not per-shop servers |
| **Team** | **Solo founder** — no hiring plan through 200 shops |
| **Gross story @ 200** | ~**$14.3k MRR** · ~**$172k ARR** · vendors ~**$1.9k/month** · **~87% contribution after vendors** |

That is the investor-relevant unit: **software margin before founder living expenses**. Infra is not the bottleneck; distribution and attach of AI Plus are.

---

## Product included (Ignition) — what shops buy

Detailed commercial list (see also live plan copy in `src/lib/plans.ts`):

- Unlimited users, unlimited Repair Orders (**ROs**) & estimates  
- Job board + full RO workspace  
- Canned jobs & shop labor library  
- Digital estimates, approvals & invoices (**email**)  
- **DVIs** (Digital Vehicle Inspections)  
- Live Operations Daily Snapshot  
- Appointments  
- Payment tracking (manual cash / check / card recorded in-CRM)  
- **NHTSA** VIN decode  
- Inventory basics & shop catalog  

**Explicitly not on Ignition (keeps COGS focused):** licensed **MOTOR** labor data, two-way **SMS**, Stripe Connect text-to-pay, Growth Engine campaigns. **PartsTech is included** on Ignition.

---

## Architecture = why cost is not “× shops”

```
                    ┌─────────────────────────────────────┐
                    │   ONE Vercel deployment (Next.js)    │
                    │   app.getshoprally.com               │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │ ONE Neon DB │         │ ONE Clerk   │         │ ONE Resend  │
    │ shopId rows │         │ one app     │         │ shared mail │
    └─────────────┘         └─────────────┘         └─────────────┘

   Shop A   Shop B   …   Shop 200   ← tenants, not separate hosts
```

| Question | Answer |
|----------|--------|
| New Vercel project per shop? | **No** |
| New Neon database per shop? | **No** (one DB; `shopId` isolation) |
| New Clerk app per shop? | **No** (orgs / memberships inside one app) |
| Does cost rise with shops? | **Yes — usage-based** (requests, storage, email volume, AI seats, Stripe fees) |
| CapEx servers / racks? | **None** — serverless SaaS |

---

## Solo-founder cost model (no hires)

### A. Go-live one-time cash

| Item | Low | High |
|------|----:|-----:|
| Domain + **DNS** | $20 | $40 |
| Apple Developer Program (year 1) | $99 | $99 |
| Google Play Console | $25 | $25 |
| Cards on file for Vercel / Neon / Clerk | $0 | $50 |
| Legal: **ToS** + Privacy + **MSA** templates | $500 | $2,500 |
| Brand polish (optional) | $0 | $1,500 |
| Founding ads / waitlist (optional) | $500 | $3,000 |
| First **Expo / EAS** production builds | $0 | $200 |
| **Total one-time** | **~$1,140** | **~$7,410** |

### B. Monthly vendors (shared platform — scales with usage)

| Scale | Shops | MRR | Vendor $/mo | Contrib after vendors |
|------:|------:|----:|------------:|----------------------:|
| Launch | 1 | ~$47 | **~$33** | ~$15 |
| Early | 10 | ~$600 | **~$153** | ~$447 |
| Traction | 25 | ~$1.6k | **~$331** | ~$1.3k |
| Proof | 50 | ~$3.4k | **~$457** | ~$2.9k |
| Scale | 100 | ~$6.8k | **~$1.0k** | ~$5.8k |
| Target | **200** | **~$14.3k** | **~$1.9k** | **~$12.4k** |

**@ 200 shops — vendor breakout (~$1,911/month)**

| Category | $/mo | Detail |
|----------|-----:|--------|
| **Infrastructure** | ~**$800** | Vercel ~$220 · Neon ~$199 · Clerk ~$149 · Inngest ~$120 · Blob ~$80 · Redis ~$30 · DNS ~$2 |
| **Security / reliability** | ~**$120** | Sentry ~$80 · uptime/logs ~$40 · **TLS** $0 · optional free Cloudflare **WAF** |
| **Email** | ~**$80** | Resend (estimate / approve / invoice mail) |
| **SMS** | **$0** | Twilio unused on Ignition |
| **AI COGS** | ~**$380** | Gemini for ~100 AI Plus seats (~50% attach) |
| **Mobile platform** | ~**$55** | Apple / Play amortized + **EAS** builds + push (**APNs** / **FCM**) |
| **Stripe Billing fees** | ~**$476** | ~2.9% + $0.30 per subscription invoice |
| **Data licenses (MOTOR / paid VIN)** | **$0** | NHTSA decode path |
| **Total** | **~$1,911** | **~13% of ARR** |

### C. Solo OpEx (no employees)

| Line | Treatment in this pitch |
|------|-------------------------|
| Salaries / headcount | **$0 hired payroll** |
| Founder living draw | **Owner choice** — taken from contribution after vendors, not a “must hire” cost |
| Light tools / bookkeeping / insurance | ~$150–$400/month G&A early → ~$1–2k/month at 200 (insurance, CPA, tools) |
| Marketing | Keep **customer-funded / organic / content** until MRR supports paid; model holds a modest discretionary ads line |

**Illustrative solo P&L @ 200 (business entity view)**

| | Annual |
|--|------:|
| **ARR** | **~$172,000** |
| Vendors (infra + security + AI + mobile + Stripe + email) | ~$23,000 |
| Light G&A (tools, insurance, CPA) | ~$12,000–$24,000 |
| Discretionary marketing | $0–$12,000 |
| **Cash left for founder draw + tax + reinvestment** | **~$110,000–$140,000** |

That is the solo-operator case investors should underwrite — **not** a 4-person payroll on $172k ARR.

---

## Revenue assumptions (transparent)

| Lever | Assumption |
|-------|------------|
| Ignition list | $89.99 / month |
| Annual mix | 55% of logos on annual → blended base **ARPU ~$47.24** before add-ons |
| AI Plus price | $49.99 / month (includes mobile) |
| AI Plus attach @ 200 | **50%** of shops |
| Web presence attach | Soft **12%** blended ~$120 ARPU (ShopSite / SEO) — optional |
| Blended ARPU @ 200 | **~$71.64** |
| MOTOR / SMS / Connect | **$0 revenue and $0 COGS** on this path |

If AI Plus attach is only 30% at 200: ARPU falls ~$4; MRR still ~$13k+.  
If AI Plus attach is 70%: ARPU rises ~$4; Gemini COGS rises with seats.

---

## Security — what you pay vs what you build

| Layer | Cash cost | Notes |
|-------|-----------|-------|
| **TLS / HTTPS** | $0 | Included with Vercel |
| Auth, sessions, org boundaries | Inside Clerk bill | Multi-tenant shop switch via memberships |
| Data isolation | Engineering already in product | Every query scoped by `shopId` |
| Error monitoring | Sentry (~$0 → ~$80/mo) | Turn on as traffic grows |
| Uptime | ~$0 → ~$40/mo | Optional until 25+ shops |
| Backups / **PITR** | Inside Neon paid plan | Why Neon scales with logos |
| Pen test / **SOC 2** path | Later (~$6k–$18k/year) | Not required to take first 25–50 shops live |
| Separate “security vendor per shop” | **None** | Same as hosting — shared |

---

## Mobile app economics (AI Plus)

| Side | Economics |
|------|-----------|
| **Customer** | Pays AI Plus **$49.99/month** — gets Smart intake + labor assist + **advisor mobile app** |
| **Platform cash COGS** | Apple **$99/year**, Google Play **$25 once**, Expo/**EAS** build minutes, push (**APNs**/**FCM**) → modeled **~$9 → $55/month** as shops/builds grow |
| **AI inference COGS** | Gemini ~**$2.50–$3.80 per AI Plus seat per month** at moderate usage |
| **Separate mobile host per shop?** | **No** — one App Store / Play listing; shops log into the same binary against the same API |

---

## Why this is investable as a solo founder

1. **Gross margin after vendors is software-grade** (~85%+ at 200).  
2. **CapEx is near zero** — no fleet of servers.  
3. **Variable costs tracked to attach** — AI and Stripe fees rise only when customers pay.  
4. **Clear expansion vector** — Pro unlocks MOTOR / SMS / Connect later without rewriting the host model.  
5. **No forced hiring** to keep the product online; hiring becomes a reinvestment choice after contribution is real.

### Risks (say them out loud)

| Risk | Mitigation |
|------|------------|
| Solo bandwidth / support load at 200 | In-product help, email-only support tiers, AI intake reduces advisor typing time |
| AI Plus attach below plan | Mobile value demo; usage limits on free tier; keep Ignition useful alone |
| Stripe / tax / chargebacks complexity | Stripe Billing Tax later; start simple US cards |
| Compliance expectations from larger shops | MSA + privacy early; SOC 2 as enterprise pull, not day-one gate |

---

## Milestone money map (solo)

| Milestone | Logos | Approx MRR | Vendor $/mo | What “success” looks like |
|-----------|------:|-----------:|------------:|---------------------------|
| Live | 1 | ~$50 | ~$33 | Product online · first paying shop |
| Habit | 10 | ~$600 | ~$153 | Retention + referral loop |
| Proof | 25 | ~$1.6k | ~$331 | Founder draw can begin lightly |
| Cash comfort | 50 | ~$3.4k | ~$457 | Ads optional · still solo |
| Scale | 100 | ~$6.8k | ~$1.0k | Strong founder income after tax |
| Target | **200** | **~$14.3k** | **~$1.9k** | **~$12k/mo after vendors** before personal draw |

---

## Bottom line

- **Vercel (and Neon, Clerk, etc.) = one shared platform**, not a per-shop host.  
- **Going live** costs roughly **$1k–$7k** once plus **tens of dollars per month** at shop #1.  
- At **200 shops** under locked Ignition + AI Plus: **~$172k ARR**, **~$1.9k/month** in vendors, **~$12k/month** left before founder pay — with **zero hired staff**.  
- The financial risk to watch is **distribution and AI Plus attach**, not infrastructure.

---

## Files

| File | Purpose |
|------|---------|
| `scripts/ignition-200-outlook.mjs` | Numeric model |
| `docs/scenarios/IGNITION-200-OUTLOOK.md` | Cost tables |
| `docs/scenarios/ignition-investor-pitch.md` | **This pitch** |
| `docs/scenarios/ignition-investor-pitch.html` | Presentable HTML |
| `src/lib/plans.ts` | Live commercial packaging |
