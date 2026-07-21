# Deployment — ShopRally

| Field | Value |
|-------|-------|
| **Slug** | `shoprally` |
| **Model version applied** | `1.0.0` |
| **Deploy started** | 2026-07-20 |
| **Last rolled forward** | 2026-07-20 |

## Module status

| Module | Status | Notes / evidence |
|--------|--------|------------------|
| 01 Technical | `done` | `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/marketing-seo.ts`; OG image; CRM paths disallowed |
| 02 On-page | `done` | Per-page metadata + canonicals on money pages; home JSON-LD (Organization, SoftwareApplication, FAQ); H1 keyword align |
| 03 Local | `skipped` | National SaaS; PROFILE `local_seo: false` |
| 04 Content | `done` | Seed keyword map + page inventory; aligns with GROWTH-POSITIONING (no new thin pages this pass) |
| 05 Measurement | `done` | GSC verified + sitemap Success (8 URLs). GA4 `G-9S1J111T3K` on marketing/legal |

## Model roll-forward log

| Date | From → To | What changed |
|------|-----------|--------------|
| 2026-07-20 | — → 1.0.0 | Initial instance |
| 2026-07-20 | 1.0.0 | First SEO build: sitemap, robots, marketing metadata helper, JSON-LD, page SEO |
