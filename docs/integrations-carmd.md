# CarMD integration (ShopRally)

## Status (verified 2026-07-22)

**Verdict: API host unreachable — portal down / infrastructure offline.**

CarMD.com Corporation is still active (consumer **CarMD Connect** product, 2025–2026 press releases), but the **Vehicle API v3 host and developer portal are not reachable** from the public internet as of this check. ShopRally keeps mock mode for DTC UI; live mode will fail until CarMD restores `api.carmd.com` or issues new endpoint guidance.

| URL | Result | Notes |
|-----|--------|-------|
| `https://api.carmd.com/` | **Timeout** (no TCP/TLS) | DNS → `54.86.119.234` (AWS); port 443 never responds |
| `https://api.carmd.com/member/` | **Timeout** | Developer signup portal — unreachable |
| `https://api.carmd.com/member/docs` | **Timeout** | API reference — unreachable |
| `https://api.carmd.com/v3.0/` | **Timeout** | Live API base used by our client — unreachable |
| `https://www.carmd.com/api/` | **404** | Legacy path; removed after Shopify migration |
| `https://carmd.com/` | **200** | Main site OK |
| `https://carmd.com/pages/contact` | **200** | Working contact form (best path for API inquiry) |
| `https://connect.carmd.com/` | **404** (nginx up) | Connect app backend — not a public Vehicle API v3 substitute |
| `https://proscan.carmd.com/member` | **404** | Footer link on carmd.com — also dead |

**No public discontinuation notice** was found. Third-party API directories (apis.io, apitracker.io) still list CarMD Vehicle API but appear **stale** — they do not reflect current reachability.

**carmd.com footer** still links to `api.carmd.com/member/` and `proscan.carmd.com/member` — both broken from our network.

### How to connect (if possible)

1. **Existing partner keys** — If you already have `authorization` + `partner-token`, add them to `.env` and use **Test connection** at `/vendors/integrations/carmd`. They will only work when `api.carmd.com` responds again (same timeout today).
2. **New signup** — Self-serve portal is down. Email CarMD via [carmd.com/pages/contact](https://carmd.com/pages/contact) and ask about **Vehicle API v3** / B2B developer access and current signup path.
3. **CarMD Pro Scan** — Separate shop product (hardware + subscription + portal app). Not the REST API ShopRally integrates; do not confuse with Vehicle API v3.
4. **Mock mode** — Works without keys for DTC lookup UI (sample P0420 / P0300). No network required.

### Alternatives (brief)

ShopRally already uses **NHTSA vPIC** (free VIN) and **Auto.dev** (optional paid VIN/plate). For DTC/repair-hint parity if CarMD stays offline: evaluate **Motor** (planned), **CarAPI.app**, or manual NHTSA/OBD references — out of scope unless CarMD confirms retirement.

---

## What CarMD offers (when API is reachable)

[CarMD Vehicle API v3](https://api.carmd.com/member/) — paid automotive data for shops and apps:

| Capability | Endpoint (v3.0) | ShopRally use |
|------------|-----------------|---------------|
| VIN decode | `GET /decode?vin=` | Optional supplement — **NHTSA stays primary** |
| DTC / code definition | `GET /code?code=` | Plain-English code title + definition |
| Repairs + cost | `GET /repairs?vin=&mileage=&dtc=` | Likely fix, urgency, labor/parts $ |
| Maintenance | `GET /maint?vin=&mileage=` | Schedule near current mileage |
| Diagnostics | `GET /diag?…` | Full diagnostic report (future) |
| Recalls, TSB, warranty, upcoming | `/recall`, `/tsb`, `/warranty`, `/upcoming` | Future hooks |

**Auth:** HTTP headers on every call:

- `authorization`: `Basic <token>` (full value from dashboard — include the `Basic ` prefix)
- `partner-token`: partner ID from dashboard
- `content-type`: `application/json`

**Base URL:** `https://api.carmd.com/v3.0`

**Pricing / limits:** Credit-based, metered per endpoint — tier set in the developer portal (when reachable). Treat every call as metered.

## What we wired

| Piece | Path |
|-------|------|
| Service + mock | `src/server/services/carmd.ts` |
| Server actions | `src/server/actions/carmd.ts` — `lookupCarMdDtc`, `getCarMdMaintenance` |
| DTC UI | Estimate → Concerns → **DTC lookup** (`src/components/repair-order/dtc-lookup-dialog.tsx`) |
| Settings card | Settings → Integrations |
| Vendor hub | `/vendors/integrations/carmd` — test connection |
| Env | `.env.example` — `CARMD_AUTHORIZATION`, `CARMD_PARTNER_TOKEN` |

## Cost rule (required)

**Do not call CarMD on RO/estimate idle load or SSR.** Only:

- User opens DTC lookup dialog and clicks **Look up**
- Explicit maintenance action (action wired; UI TBD)
- Settings / vendor **Test connection**

Mock mode works without keys (sample P0420 / P0300).

## Get API keys (when portal is back)

1. Register at [https://api.carmd.com/member/](https://api.carmd.com/member/) — **currently unreachable**; use [contact form](https://carmd.com/pages/contact) until restored
2. Copy **authorization** + **partner-token** from the member dashboard
3. Add to `.env`:

   ```env
   CARMD_AUTHORIZATION=Basic <your-token>
   CARMD_PARTNER_TOKEN=<partner-id>
   ```

4. Restart dev server (`npm run dev`)
5. **Test connection** at `/vendors/integrations/carmd`
6. Open any RO → estimate → Concerns → **DTC lookup** → e.g. `P0420`

Archived portal (Wayback): [web.archive.org — api.carmd.com/member](https://web.archive.org/web/2023/https://api.carmd.com/member/) — reference only; signup there will not work against a dead host.

## Next steps

- Maintenance schedule UI in vehicle Specs drawer (on open, with mileage)
- Pre-fill technician concern from DTC result
- Gate live mode behind release flag when productized (`aiSuite` or new `vehicleDiagnostics`)
- Per-shop credential overrides in `ShopIntegration` (schema already supports `vendorKey: carmd`)
