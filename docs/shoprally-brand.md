# ShopRally brand — locked direction

**ShopRally** (formerly RepairPilot). Domain: **getShopRally.com** (DNS: `getshoprally.com`). Legal entity: **ShopRally LLC**.

Source kit: `shoprally-brand-kit/BRAND.md` and `shoprally-brand-kit/svg/`.

## Positioning

- **Audience:** US independent & multi-location auto repair shops (B2B SaaS).
- **Tone:** Confident, operational, modern — shop workflow from estimate → bay → paid RO.
- **Signature idea:** **Forward motion** — three chevrons in navy, azure, and racing orange.

## Logo system — chevron mark (locked)

### Mark (app icon / favicon / sidebar / CRM header)

- **Navy rounded square** tile (`#1E3A56`).
- **Three chevrons:** first at 55% white opacity, second **azure** (`#00A9FF`), third **racing orange** (`#F4581C`).
- Never recolor or reorder the chevron sequence.

### Wordmark

- **Shop** in navy on light backgrounds, or white on dark chrome.
- **Rally** always in racing orange (`#F4581C`). Never both orange.

### Don’t

- Rotate, outline, shadow, or gradient the mark.
- Place the color lockup on busy photos without a navy overlay (use mono white lockup).
- Use azure for body copy on white (WCAG) — azure is for links, focus, and active nav.

## Official palette (implemented in `shoprally-theme.css` + `globals.css`)

| Token | Hex | Role |
|-------|-----|------|
| **Navy** | `#1E3A56` | Trust — sidebar, chrome, primary text (`brand-navy`) |
| **Azure** | `#00A9FF` | Bridge — focus rings, active nav, links (`brand-light`) |
| **Racing orange** | `#F4581C` | Action — Rally wordmark, primary CTAs (`brand-red` token name kept) |
| **Signal** | `#C81E1E` | Destructive / urgent alerts only — not in logo |

Legacy CSS token names (`--brand-navy`, `--brand-light`, `--brand-red`) map to the ShopRally palette above.

Semantic UI colors (inspection R/Y/G, status pills, money green) **unchanged**.

### Sidebar & CRM chrome

- Background: navy `#1E3A56`.
- **Active item:** azure accent bar (`brand-light`).
- Focus ring: azure.
- **Primary CTAs:** orange with white text.
- **Signal red:** destructive actions and urgent alerts only.

## Typography

- **Wordmark:** Inter SemiBold (600).
- **App / marketing UI:** Inter (Google Fonts).

## Files

- Theme tokens: `src/app/shoprally-theme.css` (canonical), imported by `src/app/globals.css`
- Constants: `src/lib/brand.ts`
- Logo components: `src/components/brand/shoprally-logo.tsx`
- Mark geometry (OG image): `src/components/brand/shoprally-mark-paths.ts`
- Brand SVGs: `public/brand/` (from `shoprally-brand-kit/svg/`)
- Favicon: `src/app/icon.svg`, `src/app/apple-icon.svg`, `public/icon.svg`, `public/brand/app-icon.svg`
- OG: `src/app/opengraph-image.tsx`
- Preview page: `src/app/brand/page.tsx`

## Retired palettes (reference only)

- **Graphite Garage:** `#1A1D21` / `#0EA5E9` — superseded by ShopRally official palette
- **Kinetic / Copper Bay:** not adopted
