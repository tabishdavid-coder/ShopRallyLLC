# Wiring Diagrams — ShopRally CRM

**Last updated:** 2026-07-24  
**Release flag:** `wiringDiagrams` (default OFF in production)  
**Entry point:** Labor Book → operation detail → **Wiring** tab

---

## Purpose

Shop-licensed OEM wiring diagram cache keyed by **vehicle** + **wiring system**. Downloads run only on explicit user action (never on estimate page load). Cached PDFs/PNGs are tenant-scoped and must not be redistributed.

## Wiring systems

| Enum | Label |
|------|-------|
| `ENGINE_MANAGEMENT` | Engine Management |
| `ABS` | ABS |
| `BODY_CONTROL` | Body Control |
| `HVAC` | HVAC |
| `OTHER` | Other |

## UI (Labor Book detail panel)

1. Advisor opens **Labor Book** from the estimate toolbar.
2. Selects a job → operation detail opens with tabs: **Labor** | **Wiring**.
3. **Wiring** tab loads availability on open only (`getWiringDiagramPanelState`).
4. Left column: system picker with **Cached** badge when a diagram exists.
5. Right panel:
   - **Cached:** inline iframe preview + **Open** (new tab via `/api/wiring-diagrams/[id]`).
   - **Not cached:** **Download now** when plan + release + active OEM subscription; otherwise explanatory copy.
6. **Stub provider** badge when Playwright live mode is off (local dev default).

Branding: ShopRally navy tab chrome, light-blue accents, red for blocked/error states.

## Gates

| Layer | Check |
|-------|--------|
| Plan | `wiringDiagrams` — Pro+ (`shopHasFeature`) |
| Release | `planFeatures._release.wiringDiagrams` — `canUseReleasedFeature("wiring_diagrams")` |
| Kill switch | `RELEASE_KILL_WIRING_DIAGRAMS=true` |
| Subscription | `WiringDiagramSource` row with active date window for vehicle OEM brand |
| Permission | `gates.estimateView` (read) / `gates.estimateEdit` (download) |

## Data model

- **`WiringDiagramSource`** — per shop + OEM brand: portal URL pattern, `credentialsEnvKey` (env var name only), subscription window.
- **`WiringDiagram`** — cached file metadata + `storageKey` under `.data/uploads/shops/{shopId}/wiring/…`.
- **`WiringDiagramDownloadJob`** — PENDING/RUNNING/COMPLETED/FAILED for mutex + audit.

## Services

- `src/server/services/wiring-diagrams/wiring-diagram-service.ts` — orchestration (VinService-style facade).
- `providers/honda-techinfo.ts` — Honda/Acura Playwright skeleton + documented selectors.
- `download-mutex.ts` — one active job per vehicle+system.
- `rate-limit.ts` — in-process OEM throttle (`WIRING_DIAGRAM_RATE_MAX`, `WIRING_DIAGRAM_RATE_WINDOW_MS`).

## Environment (never commit secrets)

| Variable | Purpose |
|----------|---------|
| `WIRING_DIAGRAMS_STUB=true` | Force stub PDF (default when live off) |
| `WIRING_PLAYWRIGHT_ENABLED=true` | Enable live Honda portal automation |
| `WIRING_PLAYWRIGHT_HEADLESS=false` | Debug visible browser |
| `WIRING_HONDA_SHOP_<shopId>` or custom `credentialsEnvKey` | `username:password` for OEM portal |
| `WIRING_DIAGRAM_RATE_MAX` | Downloads per window (default 6) |
| `WIRING_DIAGRAM_RATE_WINDOW_MS` | Rate window ms (default 60000) |
| `RELEASE_KILL_WIRING_DIAGRAMS` | Global kill switch |

## Local test checklist

1. `npx prisma migrate dev` (migration `20260724010000_wiring_diagrams`).
2. Seed or insert `WiringDiagramSource` for a Honda vehicle's shop:
   ```sql
   INSERT INTO "WiringDiagramSource" (id, "shopId", brand, "credentialsEnvKey", "subscriptionStart", enabled, "createdAt", "updatedAt")
   VALUES ('test-honda-src', '<shopId>', 'honda', 'WIRING_HONDA_DEV', NOW(), true, NOW(), NOW());
   ```
3. Enable release flag: Platform → shop → Release flags → **Wiring diagrams**, or set `RELEASE_FLAGS_OPEN=true` locally.
4. Open Labor Book on an RO with a Honda vehicle (VIN recommended for live mode).
5. Pick a job → **Wiring** tab → select **Engine Management** → **Download now**.
6. Stub mode returns a minimal PDF; verify iframe + `/api/wiring-diagrams/[id]` serves it.

## Playwright status

| Mode | When |
|------|------|
| **Stub** | Default — `WIRING_PLAYWRIGHT_ENABLED` not `true`; returns dev PDF without browser |
| **Live skeleton** | `WIRING_PLAYWRIGHT_ENABLED=true` + credentials env + VIN — runs Playwright against documented Honda selectors (fragile until verified on live portal) |

Do not run OEM downloads on page load or background jobs without explicit user action.
