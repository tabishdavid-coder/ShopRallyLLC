# ShopRally CRM — Dev 3031

**Canonical workspace for shop CRM development.**

| What | Where |
|------|--------|
| **Open this folder** | `C:\Users\tabis\OneDrive\Documents\ClaudeCode\ShopRally` |
| **Start dev** | `npm run dev` → http://localhost:3031 |
| **Agent chat** | **ShopRallyCRM** — paste `agents/ShopRallyCRM/CONTINUE.md` |
| **Build state** | `agents/ShopRallyCRM/BUILD-STATE.md` |
| **Cursor skill** | `.cursor/skills/shoprally-crm/SKILL.md` |

## Local CRM vs Vercel marketing

| Surface | What you get |
|---------|----------------|
| **Local** `npm run dev` (:3031) | **Full CRM** + marketing routes |
| **Vercel Production** (getShopRally.com) | **Marketing only** — CRM blocked |

Production uses `MARKETING_ONLY` / Vercel fail-safe. Details: [`docs/MARKETING-ONLY-DEPLOY.md`](./MARKETING-ONLY-DEPLOY.md).

Do not expect `/job-board` or `/customers` to load the app shell on getShopRally.com until CRM is intentionally unlocked (`MARKETING_ONLY=false`).

## Key routes (3031)

- **Dashboard (default):** `/dashboard/snapshot`
- **Quick Labor + MOTOR:** `/quick-labor`
- **Job board:** `/job-board`
- **New RO:** `/repair-orders/new`

## MOTOR DaaS (licensed labor times)

Integration lives in `src/server/services/motor/`. Facade: `src/server/services/labor-guide-catalog.ts`.

Add to `.env.local` (never commit):

```env
MOTOR_ENABLED=true
MOTOR_PUBLIC_KEY=          # 10-char public key — required
MOTOR_PRIVATE_KEY=         # Shared HMAC private key — required
# MOTOR_API_BASE_URL=https://api.motor.com
```

**Sandbox:** MOTOR publishes a shared DaaS sandbox pair at [motor.com/daas-sandbox](https://www.motor.com/daas-sandbox/) (same host as production). Partner onboarding may issue a different key pair via `Sandbox_Info_2025.pdf` — both keys are required; a 24-char value alone is the **private** key.

Smoke test: `npm run test:motor`

Set `MOTOR_ENABLED=false` to disable without removing code.

## Do not confuse with

| Path / port | Role |
|-------------|------|
| **`karvio/` sibling folder** | Legacy platform fork — **do not develop CRM here**. Latest MOTOR work is synced into `ShopRally/`; karvio is archive/reference only until retired. |
| **:3000** | `_archive-repairpilot/` (legacy reference) |
| **:3001** | Old `CrmShell` chrome (`npm run dev:3001`) |
| **:3004** | Legacy design-mode dev (`npm run dev:3004`) |
| **:3030** | Isolated Autopilot preview (`npm run dev:3030`) |

## OneDrive CSS cache gotcha

If `globals.css` / theme tokens look stale after edits: delete `.next` and `node_modules/.cache`, then restart dev.

## Cursor workspace tip

Open **`ShopRally`** as the workspace root (not `karvio`) for CRM chats named **ShopRallyCRM**. Only one process should bind port **3031** at a time.
