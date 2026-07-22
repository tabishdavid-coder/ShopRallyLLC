# Marketing site go-live (Phase 1 — website now, CRM later)

**Decision:** One Vercel project = this ShopRally Next.js app. Public marketing on **getShopRally.com** now; CRM unlocks later with Clerk (same project, optional `app.getshoprally.com`).

**Domain spelling:** Branded name **getShopRally.com**; DNS host **getshoprally.com** (case-insensitive). Env / `APP_URL` stay lowercase HTTPS: `https://getshoprally.com`.

**Do not** flip `MARKETING_LAUNCH.preLaunch` yet — keep waitlist / founding-seat CTAs until self-serve CRM is real. See [`MARKETING-GO-LIVE-FLIP.md`](./MARKETING-GO-LIVE-FLIP.md) for Phase B.

**Prod gate:** Vercel Production serves **marketing only**. Gate is on when `MARKETING_ONLY=true`, or by fail-safe when `VERCEL=1` + `VERCEL_ENV=production` and `MARKETING_ONLY` is unset. **Clerk keys do not unlock CRM** — set `MARKETING_ONLY=false` only when CRM release is intentional. Blocked CRM routes go to `/crm-unavailable`. Local + Preview keep full CRM unless you set `MARKETING_ONLY=true`. See [`MARKETING-ONLY-DEPLOY.md`](./MARKETING-ONLY-DEPLOY.md). Code: [`src/lib/marketing-prod-gate.ts`](../src/lib/marketing-prod-gate.ts), [`src/middleware.ts`](../src/middleware.ts).

---

## 1. Vercel Production

Linked project (local `.vercel/project.json`): **`shoprally`**.

1. Confirm Production branch = `main` (or your release branch).
2. **Environment variables → Production** (minimum for marketing + waitlist):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon pooled Postgres URL (same DB as waitlist `SupportTicket` writes) |
| `APP_URL` | `https://getshoprally.com` |
| `MARKETING_ONLY` | `true` — keep CRM off Production (fail-safe also defaults on) |

Optional:

| Variable | Notes |
|----------|--------|
| `RESEND_API_KEY` | Lead-notification email; waitlist still works via DB without it |
| Clerk keys | Optional for marketing phase; **do not** treat as CRM unlock |

3. Deploy Production:

```bash
npx vercel --prod
```

Or push to the Production branch if Git integration is connected.

4. Confirm deploy URL responds `200` on `/`, `/pricing`, `/launch`, `/features`, `/demo`.

---

## 2. DNS — getShopRally.com (Porkbun)

**Diagnosis (2026-07-19):**

| Check | Result |
|-------|--------|
| Nameservers | **Porkbun** (`curitiba` / `fortaleza` / `maceio` / `salvador.ns.porkbun.com`) — authoritative |
| Apex A | `207.207.210.36` / `207.207.210.50` (Porkbun parking / URL forward) |
| www | CNAME → `uixie.porkbun.com` (Porkbun forward) |
| HTTP today | `302` → `https://getshoprally-com.l.ink/` (Linktree-style) |
| MX | `smtp.google.com` — **keep** (Google Workspace / Gmail) |
| SiteGround | Not on NS. If an old SiteGround site/redirect still exists in a SiteGround panel, disable it so it does not confuse ops — but **Porkbun DNS** is what the public internet uses. |

**Goal:** Vercel project `shoprally` is the only public web host. Keep Porkbun as DNS (do **not** move NS to SiteGround or Vercel unless you choose to).

### 2a. Domains on Vercel (done)

Both attached to project **shoprally**:

```bash
npx vercel domains add getshoprally.com shoprally
npx vercel domains add www.getshoprally.com shoprally
```

**Production is live now** on the project aliases (until Porkbun DNS flips):

- https://shoprally.vercel.app (preferred short Production alias)
- https://shoprally-getshoprally.vercel.app (team Production alias)
- https://shoprally-tabishdavid-coder-getshoprally.vercel.app (user-scoped Production alias)

**Legacy:** Vercel may still keep `https://repairpilot2.vercel.app` as an old alias from before the rename. Prefer `shoprally.vercel.app` in docs and bookmarks. Custom domains `getshoprally.com` / `www.getshoprally.com` stay attached — do **not** remove them. See §2e to drop the legacy hostname if desired.

### 2b. Porkbun click-by-click (user-only — required for getShopRally.com)

Keep **Porkbun nameservers** (do not switch to SiteGround). Prefer **DNS records** over moving NS to Vercel.

1. Log in → [porkbun.com](https://porkbun.com) → **Domain Management** → **getshoprally.com**.
2. Open **DNS** records. Confirm NS still show Porkbun (`*.ns.porkbun.com`).
3. **Disable URL forwarding / Linktree**
   - Remove any forward to `getshoprally-com.l.ink` (or similar) under URL Forwarding / Redirects.
4. **Replace web records only** — **do not delete MX** (`smtp.google.com`):

| Action | Type | Host | Answer / value |
|--------|------|------|----------------|
| **Delete** | A | `@` | `207.207.210.36` and `207.207.210.50` |
| **Delete** | CNAME | `www` | `uixie.porkbun.com` |
| **Add** | A | `@` | `216.198.79.1` *(Vercel recommended #1)* |
| **Add** | A | `@` | `64.29.17.1` *(Vercel recommended #1 second IP)* |
| **Add** | CNAME | `www` | `37a1079701315ee3.vercel-dns-017.com` |

Fallback if Porkbun only allows one apex A: use single A `@` → `76.76.21.21` (Vercel recommended #2).

5. Optional: turn off Porkbun parking / “Coming Soon”.
6. Wait for propagation → Vercel → Domains should show **Valid**. Then `https://getshoprally.com` serves the marketing site.

### 2c. SiteGround (only if you still have a panel)

SiteGround is **not** answering NS today. If you previously pointed the domain there or set a SiteGround redirect:

1. SiteGround → Sites / Domain → disable site or URL redirect for getshoprally.com.
2. Do **not** change Porkbun nameservers to SiteGround.

### 2d. Smoke after DNS

```bash
curl -sI https://getshoprally.com/
curl -sI https://www.getshoprally.com/pricing
curl -sI https://getshoprally.com/dashboard
# Expect /dashboard → redirect to /crm-unavailable?from=/dashboard
```

### 2e. Prefer ShopRally Vercel hostnames (optional cleanup)

CLI already assigned the short alias:

```bash
npx vercel alias set shoprally-getshoprally.vercel.app shoprally.vercel.app
```

If `repairpilot2.vercel.app` still appears under the project and you want it gone:

1. Open [Vercel Dashboard](https://vercel.com) → team **Shoprally** / **getshoprally** → project **shoprally**.
2. **Deployments** → open the current **Production** deployment → **Domains** (or project **Settings → Domains**).
3. Confirm **shoprally.vercel.app** (and `getshoprally.com` / `www`) are listed.
4. Remove only the legacy **repairpilot2.vercel.app** assignment if present — do **not** remove getShopRally.com domains.
5. Optionally **Settings → General** → confirm **Project Name** is `shoprally` (display name for the dashboard).

Renaming the project in the dashboard does **not** always retire the old `*.vercel.app` slug; alias/domain removal is the reliable fix.

---

## 3. Operator access while marketing is live

- Use **Vercel Preview** or local `npm run dev` (:3031) for platform / Macuto:
  - `/platform/enter?shop=shop_macuto`
- Do **not** rely on production stub login until Clerk ships.

---

## 4. Smoke — waitlist → Neon

1. Open `https://getshoprally.com/launch` (or Preview/local).
2. Complete reserve form → success state.
3. Local/Preview: Platform → Leads (or query `SupportTicket` for the email).
4. Confirm Production `DATABASE_URL` is the Neon project you inspect.

---

## 5. Phase 2 — CRM later (Q4 / when ready)

Follow [`IGNITION-GO-LIVE.md`](./IGNITION-GO-LIVE.md) then [`MARKETING-GO-LIVE-FLIP.md`](./MARKETING-GO-LIVE-FLIP.md):

1. Add Clerk Orgs + keys on Production; map org → `Shop.clerkOrgId`.
2. Set **`MARKETING_ONLY=false`** on Production (required — Clerk alone does **not** unlock CRM).
3. Add DNS **`app.getshoprally.com`** → same Vercel project (recommended: marketing on apex, product on `app`).
4. Set `APP_URL=https://app.getshoprally.com` for CRM canonical links.
5. Provision founding shops from Platform; do not open self-serve until Stripe Prices + checkout verified.
6. Flip `preLaunch = false` only when “Start now” truly creates access / trial.

---

## Success criteria

| Now | Later |
|-----|--------|
| Public sees Ignition story + Q4 / 50-seat reserve | Founding shops log in with Clerk |
| Waitlist leads land in Neon | `/login` is real auth, not stub |
| CRM/platform not openly browsable on prod without Clerk | Marketing CTAs flip to real start/trial |
