# CRM Logo Render Audit — 2026-07-05

**Environment:** Dev `:3004` (`http://localhost:3004`)  
**Reference lockup:** User-provided PNG — charcoal tile + white/blue **K**, **Kar** (charcoal) + **vio** (bright blue)  
**Design mode:** Shop/platform routes visited with `?design=open`  
**Method:** Playwright headless screenshots (1280×800) + HTTP asset checks. Browser MCP tabs were unavailable; Playwright CLI used instead.

## Asset inventory

| Path | HTTP | Size | Used by |
|------|------|------|---------|
| `/brand/shoprally-logo.png` | 200 | 35 KB | `ShopRallyLogo` default (light backgrounds) |
| `/brand/karvio-mark.png` | 200 | 93 KB | Brand preview / favicon exports |
| `/shoprally-logo.svg` | 200 | ~1 KB | Email/CMS fallback (`logoLockupSvg`) |
| `/icon.svg` | 200 | 598 B | Favicon / mark SVG |

Source of truth: `src/lib/brand.ts` → `BRAND_ASSETS.logoLockup = "/brand/shoprally-logo.png"`.

## Screenshots

| Route | File |
|-------|------|
| `/dashboard?design=open` (sidebar expanded) | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/01-dashboard-expanded.png` |
| `/dashboard?design=open` (`sidebar_state=false` cookie) | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/02-dashboard-sidebar-collapsed.png` |
| `/platform?design=open` | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/03-platform.png` |
| `/login` | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/04-login.png` |
| `/` (marketing home) | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/05-marketing-home.png` |
| `/repair-orders/cmr6ecri30003hh3kzoxhcee6/estimate?design=open` | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/06-ro-estimate.png` |
| `/brand` | `docs/audits/screenshots/crm-logo-render-audit-2026-07-05/07-brand-preview.png` |

## Summary

| Result | Count |
|--------|------:|
| **Pass** | 7 routes |
| **Fail** | 0 (after fixes) |

**Overall: PASS** — logos load on all audited surfaces; no broken images, 404 asset paths, or visible stretch/pixelation. One build-blocking syntax error on `/brand` was fixed during this audit.

## Findings by route

| Route | Pass/Fail | Screenshot | Notes |
|-------|-----------|------------|-------|
| `/dashboard?design=open` | **Pass** | `01-dashboard-expanded.png` | Merged CRM uses **top `CrmHeader`** for full wordmark: inline `ShopRallyMark` SVG + white **Kar** / light-blue **vio** + **CRM** badge on navy chrome. Crisp, high contrast. Left rail shows mark-only (by layout, not PNG lockup). |
| `/dashboard` (collapsed rail) | **Pass** | `02-dashboard-sidebar-collapsed.png` | `sidebar_state=false` cookie — rail narrows; **K mark** (32px SVG) remains centered and legible. Header wordmark unchanged. |
| `/platform?design=open` | **Pass** | `03-platform.png` | `PlatformSidebar` — mark + **ShopRally** wordmark + **Master CRM** subtitle. Mark tile visible on navy; subtitle muted but readable. |
| `/login` | **Pass** | `04-login.png` | Centered **PNG lockup** via `ShopRallyLogo` default variant. Charcoal **Kar** + blue **vio** matches reference; not broken, correct aspect ratio at `h-7`/`h-9`. |
| `/` (marketing) | **Pass** | `05-marketing-home.png` | Header **PNG lockup** on white/blur nav. Sharp edges, no alt-text fallback. Sticky launch banner does not overlap logo. |
| `/repair-orders/{id}/estimate?design=open` | **Pass** | `06-ro-estimate.png` | RO #1377 estimate — same **`CrmHeader`** logo as dashboard. Visible above estimate workspace; no duplicate/broken header logo. |
| `/brand` | **Pass** (after fix) | `07-brand-preview.png` | PNG lockup, SVG export, React components, and on-dark sidebar samples all render. Initial capture failed with Turbopack parse error (see fixes). |

## Rendering modes verified

| Surface | Implementation | Verdict |
|---------|----------------|---------|
| Light backgrounds (marketing, login) | `<img src="/brand/shoprally-logo.png">` | Pass — loads, crisp, correct colors |
| Dark chrome (CRM header, sidebars) | `ShopRallyMark` SVG + CSS wordmark (`Kar` white, `vio` `text-brand-light`) | Pass — icon visible on navy; wordmark readable |
| Collapsed sidebar | `ShopRallyMark` only (`group-data-[collapsible=icon]`) | Pass — mark scales cleanly at ~32px |
| Favicon / app icon | `/icon.svg` (200) | Pass (asset present; not visually audited in-browser) |

## Issues found

| Issue | Severity | Route | Resolution |
|-------|----------|-------|------------|
| `/brand` JSX parse error — stray `</h2>` closed a `<p>` tag | **Blocker** | `/brand` | Fixed in `src/app/brand/page.tsx` (restored `</p>`, added missing section heading) |
| First estimate capture used `/repair-orders/new/estimate` (404) | Audit only | estimate | Re-shot with valid RO id `cmr6ecri30003hh3kzoxhcee6` |
| Merged CRM has no classic “expanded sidebar lockup” | Info | `/dashboard` | By design — full branding lives in top header; sidebar rail is icon-only |

## Minor observations (non-blocking)

- **SVG vs PNG wordmark:** `/shoprally-logo.svg` uses system-font `<text>` elements; spacing differs slightly from the approved PNG on `/brand`. Production UI uses PNG on light surfaces — acceptable.
- **`ShopRallyMark` on dark:** Tile uses `#252930` with subtle white stroke (not pure charcoal `#1A1D21` from reference tile) — intentional sidebar contrast tweak.
- **Design-mode overlay** visible in screenshots (`?design=open`) — does not obscure logo chrome.

## Fixes applied (this audit)

1. **`src/app/brand/page.tsx`** — corrected malformed JSX that prevented `/brand` from compiling (logo preview page).

No logo path / asset fixes required — `/brand/shoprally-logo.png` and related assets serve correctly.

## Re-run

```bash
node scripts/logo-audit-screenshots.mjs
```

Requires dev server on `:3004` and Playwright Chromium installed.
