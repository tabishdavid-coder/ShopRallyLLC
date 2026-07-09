# Vendor Flexibility Audit — ShopRallyCRM

Last updated: 2026-07-09
Scope: read-only architecture audit. **No code changed; nothing implemented.**
Question answered: *Is the data structured so we can add/remove vendors freely? Concretely — if we drop **Auto.dev** and use **MOTOR** for VIN/plate decode instead, does anything break?*

---

## 1. Executive answer

**Swapping Auto.dev → MOTOR decode: NO, it does not break anything. It's a safe, additive change.** ✅ (partial only in the sense that MOTOR decode is not yet *wired* as a decode provider — the plumbing to swap it in doesn't exist yet, but nothing has to be undone to add it.)

Why it's safe:

- The `Vehicle` model stores **canonical, provider-agnostic fields** (`year, make, model, trim, engine, transmission, drivetrain, bodyClass, vin, plate, plateState`). None are named after a vendor.
- All decode flows already route through a **`VinProvider` interface** (`src/server/services/vin.ts`) and a **`PlateLookupProvider` interface** (`src/server/services/plate-lookup.ts`). The rest of the app only ever sees our own `DecodedVin` / `PlateLookupData` types — never an Auto.dev response.
- The one place raw provider JSON is persisted (`Vehicle.decodedData`) is **cache-only and best-effort**. The consumer (`extractEngineDetails` in `src/lib/engine-details.ts`) *sniffs* the payload shape (NHTSA vs Auto.dev) and **falls back to parsing the canonical `engine` string** if the shape is unknown. Removing Auto.dev leaves stale `decodedData` blobs that simply stop being recognized — no crash, no data loss, engine specs still render from the `engine` string.
- No foreign key, unique constraint, or required column anywhere references Auto.dev.

**The only thing "missing" is that MOTOR is currently a labor-catalog citizen, not a decode citizen** — see §6.

---

## 2. Architecture grade

**Grade: A– (strongly swappable, interface-first).**

The codebase consistently follows the project convention: *"wrap all external calls in a service class behind an interface so providers are swappable and the rest of the app only sees our own models."* Evidence:

| Pattern | Present? |
|---|---|
| Provider `interface` per capability | ✅ `VinProvider`, `PlateLookupProvider`, `PartsTechProvider`, `ServiceHistoryProvider` |
| Canonical DTO returned to app (never raw vendor JSON) | ✅ `DecodedVin`, `PlateLookupData`, `PartResult`, `ServiceHistoryRecord` |
| `Fallback*Provider` wrapper (primary → fallback) | ✅ VIN, Plate |
| Env-gated provider selection at module load | ✅ (`AUTODEV_API_KEY`, `CARFAX_*`, `PARTSTECH_*`, MOTOR license flags) |
| Per-shop credential model | ✅ `ShopIntegration(shopId, vendorKey, config)` unique on `[shopId, vendorKey]` |
| Vendor catalog decoupled from code (UI-driven) | ✅ `src/lib/integrations.ts` `VENDOR_DEFINITIONS` |
| Multi-source labor already normalized | ✅ `LaborOperation.source` / `dataSource` = `ai` \| `motor` \| `mitchell` \| … |

Points off (the −): a couple of soft couplings that are cosmetic, not structural — see §5 and §6.

---

## 3. Integration coupling table

| Integration | Coupling | What breaks if removed | What we store / should store |
|---|---|---|---|
| **Auto.dev (VIN decode)** | **Loose** | Nothing. Falls back to NHTSA automatically (`FallbackVinProvider`). Stale `decodedData` blobs stop being shape-recognized but degrade to `engine`-string parsing. | Canonical fields on `Vehicle` (already). `decodedData` is optional cache only. |
| **Auto.dev (plate lookup)** | **Loose** | Live plate lookup goes back to `MockPlateLookupProvider` (dev demo plates). Real plate→VIN would need another provider. Not persisted in a vendor-specific way. | Nothing vendor-specific. Plate/state already canonical. |
| **NHTSA vPIC** | **Loose** | Fallback decoder disappears; if Auto.dev also absent, no free decode. Free/no-key, so effectively always available. | Canonical fields (already). |
| **MOTOR (labor catalog)** | **Medium** | Licensed labor "BOOK" tier + taxonomy overlay disappear; system falls back to shop-history + AI labor (already the default with MOTOR disabled). | `LaborOperation.baseVehicleId` + `motor*Id`, `MotorCatalogNode`, `MotorCatalogApplication`. These are **labor** tables, not `Vehicle`. |
| **PartsTech** | **Loose–Medium** | Live parts search/punchout → `MockPartsTechProvider`. `RoPart.partstechId` / `vendor` columns become dormant (nullable, no FK). No RO breaks. | Canonical `RoPart` fields; `partstechId` is an optional external ref. |
| **Carfax (service history)** | **Loose** | Service-history panel → `MockServiceHistoryProvider` sample data. Nothing persisted. | Nothing vendor-locked; lookups are live/ephemeral. |
| **Stripe (Connect / payments)** | **Medium–Tight** | Real integration — Connect account IDs, payment intents, webhooks are Stripe-shaped by nature. Swapping processors is a real project, not a flip. | Stripe account/intent IDs (inherently vendor-specific; acceptable). |
| **Anthropic (AI labor / SMS / SEO)** | **Loose** | AI labor drafts + AI agents stop; `dataSource` just reflects a different source. Model captured in `LaborOperation.model`. Client is centralized in `src/server/services/ai/client.ts`. | `source`/`dataSource`/`model` strings — provider-neutral. |
| **Google (reviews / GSC / GA4)** | **Medium** | Reviews/SEO features degrade; per-shop OAuth in `ShopIntegration`. | OAuth tokens in `ShopIntegration.config` (per shop). |
| **Weldon (tires)** | **Loose** | Tire ordering stub; per-shop `ShopIntegration`. | Per-shop config only. |

**Takeaway:** every vehicle-data vendor (Auto.dev / NHTSA / MOTOR / Carfax) is **Loose–Medium**. The only genuinely sticky vendor is **Stripe**, which is expected and fine.

---

## 4. Recommended multi-vendor decode pattern

The bones already exist. The clean end state:

1. **Keep the canonical DTOs** (`DecodedVin`, `PlateLookupData`) as the only thing the app sees. Never let a vendor payload leak past a provider class. (Already true.)

2. **Introduce a tiny registry** instead of the hard-coded `FallbackVinProvider` chain, e.g.:

```ts
// conceptual — not implemented
type DecodeProviderId = "autodev" | "nhtsa" | "motor";
const registry: Record<DecodeProviderId, () => VinProvider | null> = {
  autodev: () => (autodevKey ? new AutoDevVinProvider(autodevKey) : null),
  nhtsa:   () => new NhtsaVinProvider(),
  motor:   () => (motorLicensed() ? new MotorVinProvider() : null),
};
// order comes from env / shop plan, not hard-coded
export const vinService = buildFallbackChain(resolveDecodeOrder());
```

3. **Order by shop plan / env, not by code edits.** Decode order (e.g. `motor → autodev → nhtsa`) becomes config so a plan tier or `ShopIntegration` flag chooses the source — mirrors how labor already uses `dataSource` tiers.

4. **Add a `MotorVinProvider implements VinProvider`** that internally calls `resolveMotorBaseVehicleId` + a MOTOR attributes lookup and maps into `DecodedVin`. MOTOR's `BaseVehicleID` stays **inside** the provider / labor layer — it is *not* promoted to a required `Vehicle` column.

5. **Feature-by-plan:** gate premium decoders (MOTOR/Auto.dev) behind plan features the same way MOTOR labor is gated; free NHTSA remains the floor so decode never fully fails.

---

## 5. Concrete migration steps if dropping Auto.dev

Low-risk, ~half-day, no data migration required:

1. **Stop selecting Auto.dev:** in `src/server/services/vin.ts` and `plate-lookup.ts`, make the primary provider null (or remove `AutoDevVinProvider` / `AutoDevPlateLookupProvider`). NHTSA remains the VIN fallback; plate lookup reverts to mock unless another plate provider is added.
2. **Env/docs:** drop `AUTODEV_API_KEY` from `.env.example` and from the `vin-decoder` entry in `src/lib/integrations.ts` `VENDOR_DEFINITIONS` (update `partnershipNote`).
3. **Engine-detail sniffer:** leave `extractEngineDetails` as-is (it already no-ops on unknown shapes) — optionally delete the `engineDetailsFromAutoDev` branch later. **No DB change.**
4. **Existing `decodedData` blobs:** leave them. They're optional cache; unrecognized shapes fall back to `engine`-string parsing. Optionally add a one-off "re-decode on next open" but **not required**.
5. **No schema migration, no backfill, no UI rewrite.** The vendors UI is data-driven, so removing/renaming the card is a `VENDOR_DEFINITIONS` edit.

**Net: Auto.dev is removable by editing ~2 service files + 1 catalog entry.** That is the definition of loose coupling.

---

## 6. Gaps to fix before "MOTOR-as-decode" is safe/complete

MOTOR decode isn't broken — it's **not wired as a decode provider yet**. To make MOTOR a first-class VIN/plate decoder:

1. **No `MotorVinProvider` exists.** `motor-vehicle.ts` only resolves a `BaseVehicleID` (for labor) and returns YMM search items — it does **not** implement `VinProvider` or return a full `DecodedVin` (no engine/trans/drivetrain/bodyClass mapping). Build that adapter.
2. **MOTOR gives no plate→VIN.** Auto.dev is currently the only real plate lookup. Dropping Auto.dev without a replacement means plate lookup is mock-only. Keep a plate provider (Auto.dev, DataOne, or VinAudit) even if MOTOR handles VIN decode, **or** accept VIN-only intake.
3. **License gating:** MOTOR is currently disabled by default (`MOTOR_SANDBOX_CACHE` opt-in / `LABOR_CATALOG_MODE`). Decode-via-MOTOR would inherit those gates — needs a clear "decode allowed?" check separate from labor licensing, and an NHTSA floor when unlicensed.
4. **`BaseVehicleID` is a labor identifier, not a vehicle identity.** Do **not** add a required `motorBaseVehicleId` column to `Vehicle`. If you want to cache it, make it **nullable/optional** and treat it as a hint (it's already cached in-memory in `motor-vehicle.ts` and stored per labor row). Keeping it off `Vehicle` preserves vendor-neutrality.
5. **Confirm licensing terms:** MOTOR data redistribution/caching rules may constrain what you can persist. Verify before writing MOTOR-derived attributes into `Vehicle.decodedData`.

None of these are blockers to *removing Auto.dev*; they're the checklist to *promote MOTOR into the decode slot*.

---

## TL;DR for the user

- **Drop Auto.dev → use MOTOR for decode: safe, won't break anything.** NHTSA already backstops VIN decode; canonical vehicle fields are vendor-agnostic; raw vendor payloads are optional cache with graceful fallback.
- **You can add/remove PartsTech, Carfax, NHTSA, AI labor, future MOTOR labor without a schema/UI meltdown** — they're all behind provider interfaces + a data-driven vendor catalog + per-shop `ShopIntegration` credentials.
- **Two caveats:** (a) MOTOR isn't wired as a *decode* provider yet — you'd build a `MotorVinProvider` adapter; (b) MOTOR has no plate→VIN, so keep a plate provider or go VIN-only. Stripe is the only genuinely sticky vendor (expected).
