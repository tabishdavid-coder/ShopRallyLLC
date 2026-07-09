# ShopRally — CRM + marketing site

**Canonical app:** `ShopRally/` on **http://localhost:3031** (Dev 3031)

One Next.js project serves:

- **Marketing website** — `/`, `/features`, `/pricing`, `/demo`, `/signup`
- **Shop CRM (Dev 3031)** — AutopilotShell + Tekmetric IA + ShopRally branding

## Dev environments (codenames)

| Codename | Port | What it is | Status |
|----------|------|------------|--------|
| **:3000 / RepairPilot** | 3000 | Legacy (`_archive-repairpilot/`) | Reference only |
| **:3001 / ShopRally CRM shell** | 3001 | Old `CrmShell` header-tab chrome | Deprecated shell |
| **Dev 3004** | 3004 | Legacy dev port with design mode overlay | Comparison only |
| **Dev 3031 / ShopRallyCRM** | **3031** | Merged build — AutopilotShell + ShopRally features | **Active** |

Legacy `repairpilot/` is archived as `_archive-repairpilot/` — do not run it as primary.

## Dev 3031 (ShopRallyCRM agent)

```bash
cd ShopRally
npm install
npm run dev          # http://localhost:3031
npm run dev:3031     # same
npm run dev:3001     # legacy CRM shell port (avoid unless comparing)
```

**Agent:** Start a new Cursor chat named **ShopRallyCRM** with workspace root `ShopRally/`. Paste the prompt from `agents/ShopRallyCRM/CONTINUE.md`.

Env vars live in `ShopRally/.env` (copy from `.env.example`). Never commit `.env`.

## Layout (Dev 3031)

- **Shell:** `AutopilotShell` — Operations sidebar + top section nav
- **Nav:** `src/lib/autopilot3030/nav.ts` → `AP_OPERATIONS_NAV_ITEMS`, `AP_TOP_NAV_SECTIONS`
- **Colors:** `src/app/shoprally-theme.css` (canonical tokens) + `globals.css`
- **Features:** `/home`, `/quick-labor`, `/workflow` + full CRM

Do not revert to `CrmShell` as default chrome without explicit approval.

## Deploy (Vercel)

Project: **getshoprally/ShopRally** (or your Vercel project name)

```bash
cd ShopRally
npx vercel          # preview
npx vercel --prod   # production
```

Build runs `prisma generate`, `prisma migrate deploy`, then `next build` (see `vercel.json`).

Production URL: **https://getshoprally.com**
