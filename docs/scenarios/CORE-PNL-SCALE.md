# Core plan — annual P&L scale model

**Runner:** `node scripts/core-pnl-scale.mjs`  
**ARPU:** ~$147.72/mo (Core $119/$109 · AI 48%@$39 · Web 12%@$120)  
**Decode:** **VIN/plate OFF** · **MOTOR OFF** · **SMS OFF**  
**Vehicle ID:** manual YMM entry · AI Instant Quote parses YMM from NL text (e.g. “2014 honda accord exl v6”)

| Shops | HC | ARR (sales) | Data licenses | SMS | Infra | Stripe | AI + email | Payroll | Marketing | G&A | Total cost | Op. profit | Margin |
|------:|---:|------------:|--------------:|----:|------:|-------:|-----------:|--------:|----------:|----:|-----------:|-----------:|-------:|
| 25 | 1 | $44k | $0 | $0 | $3,350 | $1,329 | $1,892 | $180k | $8,000 | $18k | $213k | -$168k | -380% |
| 50 | 1.5 | $89k | $0 | $0 | $3,900 | $2,659 | $3,784 | $218k | $8,000 | $19k | $255k | -$166k | -188% |
| 100 | 2.5 | $177k | $0 | $0 | $5,000 | $5,318 | $7,568 | $300k | $14k | $21k | $353k | -$176k | -99% |
| 200 | 4 | $355k | $0 | $0 | $6,000 | $11k | $15k | $480k | $23k | $26k | $561k | -$206k | -58% |
| 250 | 4.5 | $443k | $0 | $0 | $6,800 | $13k | $19k | $540k | $29k | $26k | $634k | -$191k | -43% |
| 500 | 7 | $886k | $0 | $0 | $11k | $27k | $38k | $784k | $58k | $34k | $951k | -$65k | -7% |
| 750 | 10 | $1.33M | $0 | $0 | $12k | $40k | $57k | $1.12M | $73k | $42k | $1.34M | -$14k | -1% |
| 1000 | 14 | $1.77M | $0 | $0 | $15k | $53k | $76k | $1.61M | $97k | $52k | $1.9M | -$131k | -7% |
| 2000 | 24 | $3.55M | $0 | $0 | $23k | $106k | $151k | $2.76M | $177k | $72k | $3.29M | $256k | 7% |

### Column notes (Core · no VIN)

| Column | Treatment |
|--------|-----------|
| **ARR (sales)** | Core + AI Instant Quote attach + web attach (no VIN overage) |
| **Data licenses** | **$0** — no VIN/plate decode API · no MOTOR |
| **SMS** | **$0** |
| **Infra** | Neon + Vercel + Clerk + observability |
| **Stripe** | ~3% of ARR |
| **AI + email** | Instant Quote LLM + Resend |
| **Payroll / Marketing / G&A** | Same lean Core drivers |

### 1 vs 25 shops (monthly vendor cost)

| | 1 shop | 25 shops |
|--|------:|--------:|
| Sales | ~$148 | ~$3.7k |
| Vendor stack (Vercel/Neon/Clerk/AI/Stripe) | **~$40** | **~$410** |
| VIN/data | **$0** | **$0** |
