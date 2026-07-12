# Core plan — annual P&L scale model

**Runner:** `node scripts/core-pnl-scale.mjs`  
**ARPU:** ~$148.52/mo (Core $119/$109 · AI 48%@$39 · Web 12%@$120)  
**vs Pro-stack sheet:** lower ARR/shop · **MOTOR $0** · **SMS $0** · higher AI+email (Instant Quote)

| Shops | HC | ARR (sales) | Data licenses | SMS | Infra | Stripe | AI + email | Payroll | Marketing | G&A | Total cost | Op. profit | Margin |
|------:|---:|------------:|--------------:|----:|------:|-------:|-----------:|--------:|----------:|----:|-----------:|-----------:|-------:|
| 25 | 1 | $45k | $450 | $0 | $3,350 | $1,337 | $1,892 | $180k | $8,000 | $18k | $213k | -$168k | -378% |
| 50 | 1.5 | $89k | $900 | $0 | $3,900 | $2,673 | $3,784 | $218k | $8,000 | $19k | $256k | -$167k | -187% |
| 100 | 2.5 | $178k | $1,800 | $0 | $5,000 | $5,347 | $7,568 | $300k | $14k | $21k | $355k | -$177k | -99% |
| 200 | 4 | $356k | $2,400 | $0 | $6,000 | $11k | $15k | $480k | $23k | $26k | $563k | -$207k | -58% |
| 250 | 4.5 | $446k | $3,000 | $0 | $6,800 | $13k | $19k | $540k | $29k | $26k | $637k | -$191k | -43% |
| 500 | 7 | $891k | $6,000 | $0 | $11k | $27k | $38k | $784k | $58k | $34k | $957k | -$66k | -7% |
| 750 | 10 | $1.34M | $6,750 | $0 | $12k | $40k | $57k | $1.12M | $74k | $42k | $1.35M | -$14k | -1% |
| 1000 | 14 | $1.78M | $9,000 | $0 | $15k | $53k | $76k | $1.61M | $98k | $52k | $1.91M | -$131k | -7% |
| 2000 | 24 | $3.56M | $14k | $0 | $23k | $107k | $151k | $2.76M | $178k | $72k | $3.31M | $259k | 7% |

### Column notes (Core)

| Column | Core treatment |
|--------|----------------|
| **ARR (sales)** | Core subscription + AI Instant Quote attach + web attach + light overages |
| **Data licenses** | VIN/plate API only — **no MOTOR DaaS** |
| **SMS** | **$0** — Core plan gates two-way SMS |
| **Infra** | Neon + Vercel + Clerk + observability |
| **Stripe** | ~3% of ARR (Billing collection) |
| **AI + email** | Instant Quote LLM (~$0.04/quote) + Resend |
| **Payroll** | Fully loaded HC (leaner than Pro-stack sheet) |
| **Marketing** | ~5–8% of ARR (AI demo inbound lowers paid mix) |
| **G&A** | Legal / accounting / admin step function |

### Read of the curve

- **25–250:** Investment phase — payroll dominates; margins deeply negative (same shape as Pro sheet, worse % because lower ARPU).
- **~200 (scenario target):** ~$356k ARR · ~-$207k op · **-58%** — still building.
- **500–750:** Approaching breakeven (**-7% → -1%**).
- **1000:** HC step (10→14) dips margin (**-7%**) — same pattern as Pro sheet 750→1000.
- **2000:** First clear profit zone (**+$259k · 7%**).

Pro/MOTOR unlock earlier lifts ARPU toward ~$229 and restores a Data licenses + SMS cost line — use the reference sheet for that path.
