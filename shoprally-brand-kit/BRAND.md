# ShopRally Brand Kit

## Colors
| Role | Hex | Usage |
|---|---|---|
| Navy | #1E3A56 | Trust/steady. Backgrounds, "Shop" wordmark, first chevron (55% opacity in color versions) |
| Azure | #00A9FF | Bridge/energy. Second chevron, links, secondary accents |
| Racing orange | #F4581C | Action/forward. "Rally" wordmark, third chevron, primary buttons, CTAs |

Rule: orange = action, navy = trust, azure = bridge. Never recolor the chevron sequence.

## Typography
- Wordmark: Inter SemiBold (600). All kit files have text converted to outlines - no font needed.
- Product UI + marketing body: Inter (Google Fonts, free commercial use).

## Mark construction (for designers)
- Chevron height H; stroke = 15% of H; chevron tip depth = 24% of H
- Chevron x-offsets: 8%, 44%, 80% of H; first chevron at 55% opacity (color versions only)
- Wordmark cap height = 70% of H, baseline = chevron bottom
- Mark-to-wordmark gap = 20% of H
- Mono versions: single color, full opacity, no tints (embroidery/print safe)

## File guide
| File | Use |
|---|---|
| svg/lockup-horizontal-color | Website header, email signature, invoices, Google Business Profile |
| svg/lockup-horizontal-color-on-dark | Navy/dark backgrounds: footer, ads, slide titles |
| svg/lockup-horizontal-mono-* | Embroidery, decals, B&W print, single-color contexts |
| svg/lockup-stacked-* | Square ad slots, splash screens, merch chest print |
| svg/mark-* | Any use under 48px wide; social avatars; watermarks |
| svg/app-icon + icons/ | App stores, PWA manifest (512/192), iOS (180), favicon.ico |
| png/app-icon-512.png | Google Workspace org logo, app stores (512×512, from app-icon.svg) |
| png/app-icon-180.png | iOS / smaller avatar slots (180×180) |
| png/app-icon-1024.png | High-res app icon (1024×1024) |
| png/lockup-horizontal-color-1200w.png | Email signatures, docs, tools that reject SVG (1200px wide) |
| png/ | Ready PNG exports; re-run `npx --yes -p sharp node shoprally-brand-kit/scripts/export-pngs.mjs` after SVG edits. Copies of 512/180 also live in `public/brand/`. |

## Rules
1. Below 48px wide: mark only, never the wordmark.
2. Clear space around lockup = one chevron width on all sides.
3. Never place the color lockup on photos/busy backgrounds - use mono white on a navy overlay.
4. "Rally" is always orange; "Shop" is navy on light, white on dark. Never both orange.
5. Do not rotate, outline, shadow, or gradient the mark.

Domains (register): getshoprally.com (primary), shoprallyhq.com, shoprally.io, shoprally.app
Trademark: file ITU, Class 42 - "customer retention and marketing software for automotive repair facilities."
