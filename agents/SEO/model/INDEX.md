# SEO Model v1.0.0 — index

Deploy modules in this order for every new site.

| Order | Module | Required? | Notes |
|------:|--------|-----------|-------|
| 1 | Technical | **Yes** | Blocks ranking work if broken |
| 2 | On-page | **Yes** | Per URL templates |
| 3 | Measurement | **Yes** | GSC + analytics before content scale |
| 4 | Content | **Yes** | Pillars after IA is clear |
| 5 | Local | Optional | Only if business has physical/service area |

## Site artifact after deploy

Each site under `sites/{slug}/` must have:

- `PROFILE.md` — business identity (never shared across sites)
- `DEPLOYMENT.md` — model version + per-module status
- `BUILD-STATE.md` — work log
- `custom/` — overrides only (extra keywords, unique schema, legal pages)

Shared playbook stays in `model/`. Site folders only track **instance** state.
