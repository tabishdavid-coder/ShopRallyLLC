# SEO sites — per-business deployments

Each folder = **one business / one primary domain**.  
All sites deploy from the shared [`../model/`](../model/) playbook — never copy another site’s PROFILE or keywords.

## Layout

```
sites/
  _template/          ← copy for every new client
  shoprally/          ← getShopRally.com (first deployment)
  {next-client}/      ← site 2…N
```

## Onboard a new business

Follow [`../model/DEPLOY.md`](../model/DEPLOY.md).

Quick:

1. Copy `_template/` → `{slug}/`
2. Fill `PROFILE.md`
3. Set `model_version` in `DEPLOYMENT.md`
4. Work modules; keep overrides in `custom/`
5. Chat name: **SEO — {slug}** + paste that site’s `CONTINUE.md`

## Isolation rules

- No shared GSC properties, analytics views, or keyword sheets across site folders
- Model improvements go in `model/` — then roll forward per site
- Timed campaigns for one business: `sites/{slug}/events/` (optional) or `agents/SEO/events/` with `site:` set in the brief
