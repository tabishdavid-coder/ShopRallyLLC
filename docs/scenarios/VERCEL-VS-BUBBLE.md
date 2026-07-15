# Vercel vs Bubble — ShopRally hosting


### Vercel vs Bubble (monthly hosting)

Same Core path (no VIN · no MOTOR · no SMS). **Left = Vercel (as-built ShopRally). Right = Bubble (would rebuild).**

| Shops | Sales | Vercel plan | Vercel host | **Vercel total*** | Bubble plan | Bubble host | **Bubble total*** | Δ (B−V) | Cheaper |
|------:|------:|-------------|------------:|------------------:|-------------|------------:|------------------:|--------:|:-------:|
| 1 | $148 | Pro ($20 seat) | $30 | **$40** | Starter (12k WU) | $29 | **$39** | $-1 | Bubble |
| 25 | $3,693 | Pro + usage | $139 | **$408** | Team (300k WU) | $349 | **$618** | +$210 | Vercel |
| 50 | $7,386 | Pro + usage | $158 | **$695** | Team (500k WU) | $349 | **$886** | +$191 | Vercel |
| 100 | $14,772 | Pro + usage | $319 | **$1,393** | Team + WU (1000k WU) | $499 | **$1,573** | +$180 | Vercel |
| 200 | $29,544 | Pro + usage (busy) | $438 | **$2,585** | Team + WU (1600k WU) | $597 | **$2,744** | +$159 | Vercel |
| 250 | $36,930 | Pro + usage (busy) | $476 | **$3,161** | Team + WU (2000k WU) | $687 | **$3,372** | +$211 | Vercel |
| 500 | $73,860 | Pro + usage (busy) | $845 | **$6,214** | Team + WU (4000k WU) | $979 | **$6,348** | +$134 | Vercel |
| 750 | $110,790 | Pro + usage (busy) | $1,123 | **$9,177** | Team + WU (6000k WU) | $1,339 | **$9,393** | +$216 | Vercel |
| 1000 | $147,720 | Pro + usage (busy) | $1,310 | **$12,048** | Team + WU (8000k WU) | $1,699 | **$12,437** | +$389 | Vercel |
| 2000 | $295,440 | Pro + usage (busy) | $2,410 | **$23,886** | Team + WU (16000k WU) | $3,139 | **$24,615** | +$729 | Vercel |


\* total = hosting + Stripe (~3% ARR) + AI/email COGS

| | **Vercel (current)** | **Bubble (rebuild)** |
|--|----------------------|----------------------|
| What you host | One Next.js app (Master + Shop CRM) | One Bubble app |
| DB / auth | Neon + Clerk (separate) | Included in Bubble |
| Scales with | Requests / Fluid Compute | Workload Units (WU) |
| 1 shop | ~$40–50/mo vendor | Starter ~$30–50 + AI/Stripe |
| 25 shops | ~$400/mo vendor | Growth/Team + WU — usually **higher** |
| Codebase | Keep ShopRally | Full rebuild (lose Next/tRPC/Prisma) |

**Recommendation:** Stay on **Vercel** — you already have the CRM; Bubble is a rewrite, and WU cost for a multi-tenant RO CRM climbs faster at 50+ shops.

