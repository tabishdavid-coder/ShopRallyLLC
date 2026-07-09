# Master CRM — merge guide

Branch: **`feature/master-crm`**  
Built **parallel to** ShopRallyCRM Dev `:3004` — shop shell untouched until you merge.

---

## What ships (platform-only)

- Master CRM shell at `/platform/**` (sidebar, top bar, breadcrumbs)
- Enter Shop CRM via `EnterShopCrmButton` + `/platform/enter?shop={id}`
- `src/lib/platform-routing.ts` — shared route constants
- Overview context card (Master vs Shop CRM)

---

## Before merge

If ShopRallyCRM WIP is uncommitted on `main`, stash or commit it first:

```bash
git stash push -m "shoprally-crm-wip" --include-untracked
git checkout feature/master-crm
git pull origin feature/master-crm
```

---

## Merge into main / ShopRallyCRM branch

```bash
git checkout main   # or your ShopRallyCRM branch
git merge feature/master-crm
```

Conflicts are unlikely outside `nav.ts` if ShopRallyCRM did not edit platform files.

---

## Post-merge: wire Shop CRM for operators

~~Apply these after merging Master CRM if you want full round-trip UX.~~ **Done (2026-07-03)** — operator banner, Master CRM header link, and `SHOP_CRM_ENTERED` audit are in main app layout. See `docs/PLATFORM-ACCESS-COMPLIANCE.md`.

Remaining optional:

In `src/app/(app)/layout.tsx`:

- Import `isPlatformAdmin`, `PlatformShopContextBar`
- When `platformAdmin && activeShop && !isPlatformRoute`, render `PlatformShopContextBar` with `bannerChrome="platform"`
- Keep existing `ShopContextBanner` for non-admin users only

See `agents/MasterCRM/patches/shop-crm-integration.md` for a copy-paste diff.

### 2. CrmHeader — back to Master CRM

In `src/components/crm/crm-header.tsx`:

- Add optional `isPlatformAdmin` prop
- Show link to `/platform` (“Master CRM”) when true

Pass `isPlatformAdmin` from `(app)/layout.tsx` → `CrmShell` → `CrmHeader`.

### 3. Default landing for platform admin

In `src/lib/platform-routing.ts`, use `defaultAppHome(isPlatformAdmin)`:

- **Clerk:** set platform admin users’ `afterSignInUrl` to `/platform` (or conditional in middleware)
- **Stub auth:** redirect `/dashboard` → `/platform` when `isPlatformAdmin()` in a thin server page or middleware

Do **not** change shop-owner landing — they stay on `/dashboard`.

---

## Manual QA after full merge

| Surface | Check |
|---------|--------|
| `/platform` | Master CRM sidebar, context card, enter shop |
| `/dashboard` (as admin) | Navy operator banner + Master CRM header link |
| `/dashboard` (shop staff) | No platform chrome |
| Switch shop | Cookie + tenant data correct |

---

## Files touched by Master CRM branch (reference)

```
src/app/(app)/platform/layout.tsx
src/app/(app)/platform/page.tsx
src/app/(app)/platform/enter/page.tsx
src/components/platform/platform-shell.tsx
src/components/platform/platform-sidebar.tsx
src/components/platform/platform-top-bar.tsx
src/components/platform/platform-context-card.tsx
src/components/platform/enter-shop-crm-button.tsx
src/components/platform/platform-breadcrumbs.tsx
src/components/platform/platform-shop-detail.tsx
src/components/platform/platform-header.tsx  (@deprecated)
src/lib/platform-routing.ts
docs/MASTER-CRM.md
agents/MasterCRM/**
```

**Not touched:** `(app)/layout.tsx` shop branch, `crm-shell`, `crm-header`, `middleware.ts`, `package.json`.
