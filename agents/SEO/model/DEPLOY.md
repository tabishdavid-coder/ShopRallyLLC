# Deploy the SEO model to a new business

Use this whenever you onboard a client site (ShopRally itself, or site #2…#N).

## Principle

| Layer | Lives in | Shared? |
|-------|----------|---------|
| **Model** (playbook) | `agents/SEO/model/` | Yes — one source of truth |
| **Site instance** | `agents/SEO/sites/{slug}/` | No — isolated per business |

Improving the model helps *future* deploys. Existing sites stay on their recorded model version until you roll them forward.

---

## Steps

### 1. Create the site folder

```text
Copy:  agents/SEO/sites/_template/  →  agents/SEO/sites/{slug}/
```

Slug examples: `shoprally`, `inout-autohaus`, `acme-garage`.

### 2. Fill PROFILE.md

Business name, primary domain, brand, local vs national, target keywords, contacts.  
**Never** put secrets (API keys) in PROFILE — reference env names only.

### 3. Record DEPLOYMENT.md

- Set `model_version` to the current version in `model/README.md`
- Mark each module: `pending` → `in_progress` → `done` / `skipped`

### 4. Apply modules in INDEX order

Work through `01` → `05` using the model docs.  
Site-specific notes and overrides go in `sites/{slug}/custom/` only.

### 5. Code / CMS work

- **ShopRally marketing:** `src/app/(marketing)/`, marketing-site components (SEO for ShopRally agent)
- **Other client sites:** only paths the user names (external repo, ShopSite slug, etc.) — keep evidence + checklists in that site’s SEO folder even if code lives elsewhere

### 6. Open a chat (optional)

- Standing brand work: **SEO for ShopRally**
- Client-specific: **SEO — {site}** → paste `sites/{slug}/CONTINUE.md`

### 7. After a model bump

For each live site you want updated:

1. Note new `model_version` in DEPLOYMENT.md
2. Diff modules that changed
3. Apply only deltas; don’t re-mix other clients’ content
