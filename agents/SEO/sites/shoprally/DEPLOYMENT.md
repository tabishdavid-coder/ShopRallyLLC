# Deployment — ShopRally

| Field | Value |
|-------|-------|
| **Slug** | `shoprally` |
| **Model version applied** | `1.0.0` |
| **Deploy started** | 2026-07-20 |
| **Last rolled forward** | 2026-07-21 |

## Module status

| Module | Status | Notes / evidence |
|--------|--------|------------------|
| 01 Technical | `done` | Sitemap (incl. `/compare/*`), robots, OG `/opengraph-image` + prod-gate allowlist |
| 02 On-page | `done` | Money-page meta; legal privacy/terms unique meta; home JSON-LD |
| 03 Local | `skipped` | National SaaS; PROFILE `local_seo: false` |
| 04 Content | `done` | Keyword map + inventory; compare hub + 3 alternative pages; home FAQ related links |
| 05 Measurement | `done` | GSC verified + sitemap Success. GA4 `G-9S1J111T3K`. Re-submit sitemap after compare deploy |

## Model roll-forward log

| Date | From → To | What changed |
|------|-----------|--------------|
| 2026-07-20 | — → 1.0.0 | Initial instance |
| 2026-07-20 | 1.0.0 | First SEO build: sitemap, robots, marketing metadata helper, JSON-LD, page SEO |
| 2026-07-21 | 1.0.0 | Batch: OG wire-up, legal meta, compare pages, FAQ/footer internal links |
