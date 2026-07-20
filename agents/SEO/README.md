# SEO

**One shared SEO model** in the background → **deployed separately** to each business/site.

```
model/          ← playbook (shared). Improve once; reuse for every client.
sites/          ← one folder per business. Isolated PROFILE + deployment status.
SeoForShopRally/← standing agent (maintains model + ShopRally site)
events/         ← optional timed campaigns (tie to a site in the brief)
```

---

## How it works

| Layer | Purpose | Example |
|-------|---------|---------|
| **Model** | Canonical SEO system (technical, on-page, local, content, measurement) | `model/v1.0.0` |
| **Site instance** | That model applied to one domain | `sites/shoprally`, `sites/client-b`, … |
| **Custom** | Only what’s unique to that business | keywords, NAP, page inventory |

When you improve the model, existing sites **do not** auto-change. You roll each site forward on purpose (`DEPLOYMENT.md`).

---

## Folder layout

```
agents/SEO/
  model/                      # SHARED SEO MODEL (background)
    README.md
    INDEX.md
    01-technical.md … 05-measurement.md
    DEPLOY.md                 # how to onboard a new business
  sites/
    _template/                # copy → new client
    shoprally/                # getShopRally.com (first deploy)
    {client-slug}/            # sites 2…N
  SeoForShopRally/            # agent prompts for ShopRally + model stewardship
  events/                     # optional campaign packs
```

---

## Onboard a new client (site #2…#10+)

1. Read [`model/DEPLOY.md`](./model/DEPLOY.md)
2. Copy `sites/_template/` → `sites/{slug}/`
3. Fill `PROFILE.md` · set model version in `DEPLOYMENT.md`
4. Apply modules from `model/INDEX.md`
5. Chat: **SEO — {slug}** → paste `sites/{slug}/CONTINUE.md`

---

## SEO for ShopRally (this product’s marketing site)

1. Chat name: **SEO for ShopRally**
2. Paste [`SeoForShopRally/CONTINUE.md`](./SeoForShopRally/CONTINUE.md)
3. Site instance: [`sites/shoprally/`](./sites/shoprally/)
4. Shared playbook: [`model/`](./model/)

---

## Do not confuse with

| Agent | Owns |
|-------|------|
| **SEO (this)** | Marketing SEO model + per-site deploys (ShopRally + future client sites) |
| **SEO Autopilot** | In-app Growth Engine SEO product for shop tenants |
| **Website Code** | Tenant ShopSite microsites / editor |
