# SEO model (shared base)

This is the **background SEO system** every client site deploys from.

- **Edit here** when improving the playbook for *all* future businesses.
- **Do not** put client-specific keywords, NAP, or GSC credentials here.
- **Deploy** a copy of this model into `../sites/{site-slug}/` via [`DEPLOY.md`](./DEPLOY.md).

## Version

| Field | Value |
|-------|-------|
| **Model version** | `1.0.0` |
| **Last updated** | 2026-07-20 |

Bump the version (semver) whenever you change deployable requirements in this folder. Site `DEPLOYMENT.md` files record which version they applied.

## Modules

| File | What it defines |
|------|-----------------|
| [`INDEX.md`](./INDEX.md) | Full checklist map + deploy order |
| [`01-technical.md`](./01-technical.md) | Crawl, index, sitemap, robots, HTTPS, Core Web Vitals |
| [`02-on-page.md`](./02-on-page.md) | Titles, meta, H1, internal links, schema |
| [`03-local.md`](./03-local.md) | NAP, GBP, local pages (skip if not local) |
| [`04-content.md`](./04-content.md) | Pillars, service/location pages, freshness |
| [`05-measurement.md`](./05-measurement.md) | GSC, analytics, KPIs |
| [`DEPLOY.md`](./DEPLOY.md) | How to onboard a new business onto this model |

## Rule

Improving the model ≠ auto-updating live sites. After a model bump, roll out to each site intentionally (mark status in that site’s `DEPLOYMENT.md`).
