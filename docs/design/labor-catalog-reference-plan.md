# Labor Catalog Reference Plan — True Catalog Architecture

**Date:** 2026-07-07  
**Workspace:** ShopRally (`C:\Users\tabis\OneDrive\Documents\ClaudeCode\ShopRally`)  
**Status:** Design / migration plan — no schema changes in this doc  
**Audience:** ShopRallyCRM agents building Labor Book, Shop Library, Quick Labor

---

## Executive summary

ShopRally today ships a **custom browse overlay** (`LABOR_CATEGORY_TREE` + keyword classification + position/operation facets) on top of a **flat search cache** (`LaborOperation` rows keyed by vehicle + query text). MOTOR DaaS is wired as a **runtime adapter** that fetches Estimated Work Time (EWT) application summaries and **re-classifies** results into the custom tree — it does **not** persist or browse the licensed taxonomy.

**Recommendation:** Anchor the true catalog on **MOTOR DaaS EWT taxonomy + application rows** (System → Group → SubGroup → LiteralName/OperationType), with **position and qualifiers on the application row only**. Keep `LaborOperation` as a YMM-primary **hours cache** keyed by `motorApplicationId` + `baseVehicleId`, not as the taxonomy source of truth. Retain custom facets only as optional UI shortcuts until MOTOR DrillDown sync replaces them.

---

## Phase 1 — Audit: what ShopRally has today

### Verdict: custom overlay + flat cache, not a licensed catalog tree

| Layer | What it is | Licensed MOTOR? | Stored in DB? |
|-------|------------|-----------------|---------------|
| Browse taxonomy | `LABOR_CATEGORY_TREE` — 18 systems, ~70 subcategories | **No** — file header: "Generic industry category tree (not licensed MOTOR data)" | **Hardcoded** in `src/lib/labor-categories.ts` |
| Position / operation facets | `SUBCATEGORY_NAV` in `labor-nav-facets.ts` | **No** — "generic shop-SMS taxonomy" | **Hardcoded** |
| Browse step gating | `labor-browse-hierarchy.ts` — assembly-only skips, position-first vs operation-first | **No** | **Hardcoded** |
| Operation → category mapping | `classifyOperation()` keyword heuristics + priority rules (brakes vs suspension, HVAC, etc.) | **No** | **Runtime** — re-classifies on every read |
| Labor hours data | `LaborOperation` Prisma model | **Mixed** — rows can be `source: ai`, `catalog`, `cached`; MOTOR writes `dataSource: motor_ewt` | **DB** — global, not shop-scoped |
| MOTOR fetch | `motor-labor.ts` → EWT Summaries by `BaseVehicleID` | **Yes** (when keys set) | **In-memory only** (30 min browse cache); not persisted as taxonomy |
| Vehicle resolution | `motor-vehicle.ts` → VIN / YMM → `BaseVehicleID` | **Yes** | **In-memory** (1 hr cache) |
| Build / seed scripts | `build-labor-dataset.ts`, `build-ny-labor-library.ts` | **No** — AI via `lookupLaborSuggestion` | Writes `LaborOperation` cache rows |

### File map

| File | Role |
|------|------|
| `src/lib/labor-categories.ts` | Custom 2-level tree + `classifyOperation` / `matchOperationsToSubcategory` |
| `src/lib/labor-nav-facets.ts` | Custom position/operation Miller facets + regex filters on hit text |
| `src/lib/labor-browse-hierarchy.ts` | When position/operation columns must complete before JOBS load |
| `src/lib/labor-vehicle-key.ts` | `vin:` / `ymm:` cache keys, VIN→YMM promotion |
| `prisma/schema.prisma` → `LaborOperation` | Flat (vehicleKey, queryKey) → hours blob; no taxonomy FKs |
| `src/server/labor-guide-cache.ts` | Cache-first lookup; MOTOR/catalog on miss; YMM write-through |
| `src/server/services/labor-guide-catalog.ts` | Facade: MOTOR when enabled, else stub |
| `src/server/services/motor/motor-labor.ts` | EWT Summaries API; maps `Taxonomy.System/Group/SubGroup` + `Position` + `Qualifiers` |
| `src/server/services/motor/motor-vehicle.ts` | `BaseVehicleID` resolution |
| `scripts/test-motor-api.ts` | Smoke: YMME years, BaseVehicleID, `"brake pad"` lookup |
| `scripts/build-labor-dataset.ts` | Curated vehicle × job matrix → AI cache fill |
| `scripts/build-ny-labor-library.ts` | NY fleet matrix → AI cache fill (explicitly not MOTOR) |

### Prisma: `LaborOperation` (cache only)

```
vehicleKey   — "vin:…" or "ymm:year|make|model|engine"
queryKey     — normalized search text
jobName, laborHoursPerUnit, unitsOnVehicle, laborOperations[]
source       — "ai" | "catalog" | "cached" | …
dataSource   — "ai_first_principles" | "motor_ewt" | "y_mm_catalog"
```

**Not present:** `systemId`, `groupId`, `subGroupId`, `motorApplicationId`, `taxonomyId`, `positionId`, qualifier JSON.

### MOTOR integration today (adapter, not catalog)

Current code path (`motor-labor.ts`):

1. Resolve `BaseVehicleID` (VIN search → 10-char prefix → YMM term search).
2. `GET …/Content/Summaries/Of/EstimatedWorkTimes` with `SearchTerm` or paginated browse (3 pages × 30).
3. Map each `ApplicationSummary` → `LaborGuideHit` using `Taxonomy.LiteralName`, `Position.Name`, `Qualifiers`.
4. **`enrichHitClassification(hit)`** — forces hit into `LABOR_CATEGORY_TREE` via keyword rules.

**Not implemented:**

- `GET …/Content/Taxonomies/Of/EstimatedWorkTimes?ResultType=DrillDown`
- Taxonomy-filtered summaries (`SystemID`, `GroupID`, `SubGroupID`)
- `GET …/Content/Details/Of/EstimatedWorkTimes/{ApplicationID}` (full application detail)
- Persisted taxonomy nodes or application index per `BaseVehicleID`

### Prior design docs (no `labor-brakes-breadcrumb-audit.md`)

Related artifacts:

- `docs/design/shop-library-miller-flow-2026-07-05.md` — Miller column audit
- `docs/design/labor-book-prodemand-tekmetric.md` — Labor Book UI wiring (still uses custom tree)
- `docs/design/labor-breadcrumb-mockup-*.md` — competitor UX; notes "MOTOR licensed taxonomy import pending"
- `docs/SHOPRALLY-DEV.md` — MOTOR env + sandbox smoke test

### Sandbox MOTOR capability (prototype-ready)

Per MOTOR DaaS API reference + `docs/SHOPRALLY-DEV.md`:

| Endpoint | Purpose | In ShopRally code? |
|----------|---------|-------------------|
| `/Information/YMME/Years` | Year range | ✅ `test-motor-api.ts` |
| `/Information/Vehicles/Search/ByVIN` | VIN → vehicle + EWT relation | ✅ `motor-vehicle.ts` |
| `/Information/Vehicles/Search/ByTerm` | YMM search | ✅ `motor-vehicle.ts` |
| `/Information/Vehicles/Attributes/BaseVehicleID/{id}/Content/Summaries/Of/EstimatedWorkTimes` | Application list + hours | ✅ `motor-labor.ts` |
| `…/Content/Taxonomies/Of/EstimatedWorkTimes?ResultType=DrillDown` | System → Group → SubGroup drill | ❌ **Available in sandbox; not coded** |
| `…/Content/Details/Of/EstimatedWorkTimes/{ApplicationID}` | Full app detail, included ops | ❌ |
| Query filters: `SystemID`, `GroupID`, `SubGroupID`, `BR` (brake type), `EN`, `DT`, … | Vehicle-config-aware browse | ❌ (only `SearchTerm` used) |

**Sandbox keys:** public pair documented at [motor.com/daas-sandbox](https://www.motor.com/daas-sandbox/) — same host as production. `npm run test:motor` validates credentials.

**Conclusion:** Sandbox supports enough to prototype **DrillDown taxonomy sync + filtered application fetch** without a production MOTOR contract, but redistribution/storage of MOTOR content still requires a **license** for production use.

---

## Phase 2 — Reference matrix (document only; do not scrape copyrighted content)

### Licensed / industry standards

| Reference | What it provides | Licensing | Fit for ShopRally multi-tenant CRM |
|-----------|------------------|-----------|-----------------------------------|
| **MOTOR DaaS — Estimated Work Times** | System/Group/SubGroup taxonomy; application rows with LiteralName, OperationType, Position, Qualifiers, Base/All/Additional labor times; YMME + BaseVehicleID; VCdb attribute filters (BR, EN, DT, …); DrillDown + SearchTerm | **MOTOR commercial license** (DaaS subscription); sandbox for dev only | **Primary anchor.** Global catalog (not per-shop); hours identical across tenants; shop applies own labor rate/matrix. Matches Tekmetric/AutoLeap pattern. |
| **MOTOR Gen 5 Mechanical Labor Content Dev Kit** | XML schema for OperationTaxonomy, Qualifiers, EWT applications, VCdb cross-refs, included/optional operations | Licensed bulk feed (alternative to DaaS) | Useful for **offline bulk import** if API rate limits bite; same taxonomy IDs as DaaS. |
| **Mitchell ProDemand** | Proprietary labor times (Mitchell creates own); Estimate Guide module; keyword/1Search cards | **Separate Mitchell subscription**; CRM integrations (Tekmetric tab, AutoLeap) are partner deals | Secondary provider option; **different taxonomy** than MOTOR — do not merge trees. Shop-level integration toggle only. |
| **ALLDATA** | OEM repair + estimating; third-party tab in Tekmetric | **ALLDATA subscription** | Same as Mitchell — optional integration, not catalog SoT. |
| **VCdb / ACES (Auto Care)** | Vehicle configuration (Y/M/M/E/T/D), PCdb part types, Qdb qualifiers | **Auto Care VIP subscription** (VCdb annual) | **Vehicle identity layer** — MOTOR already maps to VCdb attributes on applications. ShopRally should use MOTOR/BaseVehicleID first; VCdb direct only if building custom vehicle picker beyond MOTOR YMME. |
| **ASA / MOTOR published taxonomy** | Industry naming alignment via MOTOR Standard Operation Taxonomy (MSOT) | Part of MOTOR license | Reference for display labels; IDs come from MOTOR API. |

### Open / structural (not labor catalogs)

| Reference | What it provides | Licensing | Fit |
|-----------|------------------|-----------|-----|
| **NHTSA vPIC** | VIN decode → Y/M/M/E (vehicle only) | **Free / public** | Already used for vehicle decode; **no labor operations**. Feeds `BaseVehicleID` resolution upstream only. |
| **Open flat-rate datasets** | None authoritative for OEM-aligned mechanical labor | N/A | **Do not use** scraped Chilton/Haynes/forum times — legal risk + inconsistent with industry CRMs. AI estimates remain fallback only, clearly labeled. |

### Competitor CRM sourcing

| CRM | Labor source | Catalog shape | Implication for ShopRally |
|-----|--------------|---------------|---------------------------|
| **Tekmetric** | Built-in guide = **MOTOR** (1984+); optional ProDemand/ALLDATA tabs | MOTOR taxonomy browse + search; labor matrix markup on MOTOR hours | Same anchor: MOTOR tree + flat operations table |
| **AutoLeap** | **MOTOR** primary + Mitchell1 optional | Category rail + flat table; MOTOR Primary/Secondary tabs in browse modal | Position in row label; qualifier band above grid |
| **Shopmonkey** | MOTOR OEM in Service Guides | Category + flat list | MOTOR-backed; integration not DIY |
| **Identifix** | MOTOR + Mitchell dual | Keyword-first | Provider toggle, not unified tree |

**Industry norm:** CRMs **license** MOTOR (or Mitchell/ALLDATA) and **do not** maintain independent flat-rate trees. Shop-specific data = **canned jobs**, **labor matrix**, **shop fees** — not replacement taxonomy.

---

## Phase 3 — Target architecture

### 1. Target model (normalized catalog + application rows)

Separate **taxonomy** (global, versioned) from **applications** (per BaseVehicleID) from **hours cache** (YMM-primary denormalized).

```
CatalogSystem          — motorSystemId, systemName, sortOrder, contentSilo
CatalogGroup           — motorGroupId, groupName, systemId (FK)
CatalogSubGroup        — motorSubGroupId, subGroupName, groupId (FK)
CatalogOperation       — motorTaxonomyId, literalName, operationTypeDescription
                         — unique path: system + group + subGroup + literal + opType

CatalogApplication     — motorApplicationId (PK external)
                         — baseVehicleId (MOTOR)
                         — catalogOperationId (FK)
                         — positionName, positionId (ACES PCdb ref when present)
                         — qualifiersJson (MOTOR QualifierInfo[])
                         — vehicleConfigJson (BR, EN, DT, … snapshot for qualifier band)
                         — displayName, notes, skillCode
                         — syncedAt, motorContentVersion

LaborTime              — applicationId (FK)
                         — baseLaborTime, allLaborTime, additionalLaborTime
                         — laborTimeInterval (hours/tenths)
                         — includedOperationsJson, optionalOperationsJson

LaborOperation (evolved cache)
                         — KEEP as denormalized fast path
                         — ADD motorApplicationId, baseVehicleId, motorTaxonomyId
                         — vehicleKey (ymm primary), queryKey (search normalization)
                         — hours fields mirrored from LaborTime
                         — source / dataSource / refreshedAt / hitCount
```

**Position rule (user requirement):** Position lives on **`CatalogApplication` only**, not as taxonomy tree levels. Browse UI filters applications by position — same as AutoLeap row labels + center pills.

**YMM-primary cache rule:** Write-through keys prefer `ymm:year|make|model|engine`; promote from `vin:` hits via existing `promoteVinCacheToYmm`. Catalog sync populates `CatalogApplication` per `baseVehicleId`; cache rows reference `motorApplicationId` for dedup.

### 2. Source of truth

| Concern | Source of truth | Fallback |
|---------|-----------------|----------|
| Taxonomy tree | MOTOR `…/Taxonomies/Of/EstimatedWorkTimes` (DrillDown) | None in production — show "MOTOR unavailable" |
| Operations + hours per vehicle | MOTOR EWT Summaries filtered by taxonomy IDs | `LaborOperation` cache → AI estimator (labeled, lower confidence) |
| Browse UI labels | MOTOR `SystemName` / `GroupName` / `SubGroupName` / `LiteralName` | Custom tree only during migration window |
| Shop canned jobs | `CannedJob` (shop-scoped) | Classify into MOTOR subGroup via mapping table |
| Labor rate / matrix | `Shop`, `LaborMatrixTier` | Unchanged |

**Cache table shape:** Keep `LaborOperation` global. Add nullable MOTOR FKs. Index `(baseVehicleId, motorApplicationId)` and `(vehicleKey, motorApplicationId)` for dedup. TTL refresh re-fetches from MOTOR, not AI, when `dataSource = motor_ewt`.

### 3. Migration path

| Step | From | To |
|------|------|-----|
| **M0** (now) | Custom tree + keyword classify | Document + MOTOR DrillDown prototype script |
| **M1** | Hardcoded `LABOR_CATEGORY_TREE` | `CatalogSystem/Group/SubGroup` tables synced from MOTOR (global, not per vehicle) |
| **M2** | `fetchMotorLaborGuide` flat pagination | Taxonomy-scoped fetch: DrillDown UI → `SystemID` → `GroupID` → `SubGroupID` → Summaries |
| **M3** | `enrichHitClassification` keyword overlay | Direct mapping: MOTOR taxonomy IDs on hits; deprecate `classifyOperation` for MOTOR-sourced rows |
| **M4** | `SUBCATEGORY_NAV` position/op facets | Derive position facets from application row distinct `positionName` values per subGroup |
| **M5** | AI `LaborOperation` bulk seeds | MOTOR sync job for top BaseVehicleIDs; AI only on explicit miss + banner |
| **M6** | UI "MOTOR tree" label on custom tree | Rename to licensed tree; remove `LABOR_CATEGORY_TREE` |

**Mapping table (transition):** `CatalogSubGroupMapping` — `customSubcategoryId` → `motorSubGroupId` (nullable). Lets Labor Book work during hybrid phase. Delete after cutover.

### 4. Reference matrix — external field → ShopRally model

| MOTOR DaaS field | ShopRally model field | Notes |
|------------------|----------------------|-------|
| `Taxonomy.SystemID` / `SystemName` | `CatalogSystem.motorSystemId` / `systemName` | Top browse level |
| `Taxonomy.GroupID` / `GroupName` | `CatalogGroup.motorGroupId` / `groupName` | Second level |
| `Taxonomy.SubGroupID` / `SubGroupName` | `CatalogSubGroup.motorSubGroupId` / `subGroupName` | Third level |
| `Taxonomy.TaxonomyID` | `CatalogOperation.motorTaxonomyId` | Stable operation identity |
| `Taxonomy.LiteralName` | `CatalogOperation.literalName` | Display name |
| `Taxonomy.OperationTypeDescription` | `CatalogOperation.operationTypeDescription` | R&R, R&I, Overhaul |
| `ApplicationID` | `CatalogApplication.motorApplicationId` | Per-vehicle application row |
| `BaseVehicleID` (route attr) | `CatalogApplication.baseVehicleId` | MOTOR vehicle key |
| `Position.Name` / `PositionInfo` | `CatalogApplication.positionName` | **Not a taxonomy level** |
| `Qualifiers.QualifierInfo[]` | `CatalogApplication.qualifiersJson` | Config band (Disc/ABS, w/ AC, etc.) |
| `Items.EstimatedWorkTimeSummary.BaseLaborTime` | `LaborTime.baseLaborTime` | Primary billable hours |
| `AllLaborTime`, `AdditionalLaborTime` | `LaborTime.allLaborTime`, `additionalLaborTime` | Green + icons (Tekmetric pattern) |
| `BR`, `EN`, `DT`, … query filters | `CatalogApplication.vehicleConfigJson` | Qualifier band chips |
| ACES Position (PCdb) | `CatalogApplication.positionId` | When MOTOR returns PCdb ref |
| VCdb attributes | Vehicle resolution via MOTOR search | ShopRally `Vehicle` → `BaseVehicleID` |

| Custom overlay (deprecated) | MOTOR equivalent |
|----------------------------|------------------|
| `LABOR_CATEGORY_TREE[].id` (e.g. `brakes`) | `SystemName = "Brakes"` (SystemID TBD per sync) |
| `brakes-pads` subcategory | `GroupName` / `SubGroupName` under Brakes (e.g. Disc Brakes → Brake Pads) |
| `SUBCATEGORY_NAV` position `front` | `Position.Name = "Front"` on application |
| `SUBCATEGORY_NAV` operation `pads-rr` | `OperationTypeDescription` + `LiteralName` filter |
| `classifyOperation()` | **Delete for MOTOR rows** — use taxonomy FK |

### 5. Brakes example — full branch mapping

**MOTOR taxonomy path (illustrative structure — IDs from DrillDown sync, not hardcoded):**

```
System: Brakes (SystemID = S)
├── Group: Hydraulic System (GroupID = G1)
│   └── SubGroup: Brake Fluid (SubGroupID = SG1)
│       └── Operations: Flush, Bleed, …
├── Group: Disc Brakes (GroupID = G2)
│   ├── SubGroup: Brake Pads (SubGroupID = SG2)
│   ├── SubGroup: Brake Rotors (SubGroupID = SG3)
│   └── SubGroup: Calipers (SubGroupID = SG4)
├── Group: Parking Brake (GroupID = G3)
│   └── SubGroup: …
└── Group: ABS / Traction Control (GroupID = G4)
    └── SubGroup: …
```

**Application row (2010 Honda Civic, BaseVehicleID = 12345) — position on row only:**

| motorApplicationId | SubGroup | LiteralName | OperationType | Position | Qualifiers | BaseLaborTime |
|---------------------|----------|-------------|---------------|----------|------------|---------------|
| 1001 | Brake Pads | Brake Pads | R&R | Front | Disc Brakes; 4-Wheel ABS | 0.8 |
| 1002 | Brake Pads | Brake Pads | R&R | Rear | Disc Brakes; 4-Wheel ABS | 0.9 |
| 1003 | Brake Rotors | Brake Rotors | R&R | Front | Disc Brakes | 0.3 |
| 1004 | Brake Fluid | Brake Hydraulic System | Flush | — | — | 0.5 |

**ShopRally browse flow (target):**

1. User selects **Brakes → Disc Brakes → Brake Pads** (MOTOR SubGroup).
2. Center grid loads `CatalogApplication` where `baseVehicleId = 12345` and `subGroupId = SG2`.
3. Position pills `[Front] [Rear] [All]` filter `positionName` — not separate taxonomy levels.
4. Qualifier band: `Disc Brakes · 4-Wheel ABS` from vehicle config + row qualifiers.
5. Add to estimate → `LaborLine` + cache write-through to `LaborOperation` with `motorApplicationId=1001`.

**Custom overlay mapping (transition):**

| Custom `subcategoryId` | MOTOR SubGroup target |
|------------------------|----------------------|
| `brakes-pads` | Brake Pads under Disc Brakes |
| `brakes-rotors` | Brake Rotors |
| `brakes-calipers` | Calipers |
| `brakes-lines` | Brake Fluid / Hydraulic lines |
| `brakes-abs` | ABS / Traction Control subgroups |
| `brakes-parking` | Parking Brake group |

### 6. Build steps — ordered milestones

| # | Milestone | Deliverable | Depends on |
|---|-----------|-------------|------------|
| 1 | **Schema** | `CatalogSystem`, `CatalogGroup`, `CatalogSubGroup`, `CatalogOperation`, `CatalogApplication`, `LaborTime`; extend `LaborOperation` with MOTOR FKs | MOTOR license or sandbox for dev |
| 2 | **Taxonomy sync job** | Inngest/cron: global DrillDown pull → upsert taxonomy tables; version stamp | M1 |
| 3 | **Application sync job** | Per `baseVehicleId` (on demand + batch): Summaries by SubGroupID → upsert applications + labor times | M1, M2 |
| 4 | **Replace tree in UI** | Labor Book left accordion reads `CatalogSystem/Group/SubGroup`; remove `LABOR_CATEGORY_TREE` import | M2 |
| 5 | **Browse server actions** | `browseLaborBySubGroup(baseVehicleId, subGroupId, positionFilter?)` — no keyword classify | M3 |
| 6 | **Dedup rules** | One cache row per `(vehicleKey, motorApplicationId)`; merge AI rows only when no MOTOR app | M3 |
| 7 | **Position facets from data** | Replace `SUBCATEGORY_NAV.positions` with `DISTINCT positionName` per subGroup + vehicle | M3 |
| 8 | **Qualifier band** | Surface `vehicleConfigJson` + qualifiers on grid header | M3 |
| 9 | **DrillDown prototype script** | `scripts/sync-motor-taxonomy.ts` + `scripts/sync-motor-applications.ts` | Sandbox keys |
| 10 | **Deprecate AI bulk build** | `build-ny-labor-library.ts` → MOTOR batch sync for same vehicle matrix | M3, license |
| 11 | **Hybrid mapping cleanup** | Remove `classifyOperation`, `SUBCATEGORY_NAV`, `CatalogSubGroupMapping` | M4–M6 complete |

**Dedup rules (explicit):**

1. **Catalog applications:** unique `(baseVehicleId, motorApplicationId)`.
2. **LaborOperation cache:** unique `(vehicleKey, motorApplicationId)` when MOTOR-sourced; legacy `(vehicleKey, queryKey)` for AI-only rows.
3. On MOTOR sync, **overwrite** hours on matching `motorApplicationId`; never blend AI + MOTOR hours silently.
4. **Canned jobs:** match by `motorTaxonomyId` or mapped subGroup; shop edits do not mutate global catalog.

---

## Phase 4 — Recommendations for parent agent

### Best reference to anchor on

**MOTOR DaaS Estimated Work Times** — taxonomy DrillDown + application summaries + detail endpoint. This is what Tekmetric and AutoLeap ship. Use **application-row model** (position + qualifiers on row, not in tree).

### Keep vs throw away from `labor-categories.ts`

| Keep (short term) | Throw away (after MOTOR sync) |
|-------------------|-------------------------------|
| `classifyOperation` for **AI-only** and **canned job** rows during hybrid | `LABOR_CATEGORY_TREE` as browse SoT |
| Priority rules as fallback when `source !== motor` | `matchOperationsToSubcategory` for catalog browse |
| `enrichHitClassification` for cache rows without MOTOR IDs | Keyword `keywords[]` on subcategories |
| Category labels for shop canned job chips (until canned jobs store `motorTaxonomyId`) | `SUBCATEGORY_NAV` hardcoded position/op facets |

### Doc path

**`ShopRally/docs/design/labor-catalog-reference-plan.md`** (this file)

### Sandbox MOTOR — enough to prototype?

**Yes.** Sandbox supports:

- Vehicle resolution (VIN / YMM)
- EWT Summaries with `SearchTerm` and taxonomy filters
- **Taxonomy DrillDown** (not yet wired in code)
- Application detail by `ApplicationID`

**Prototype next:** `scripts/sync-motor-taxonomy.ts` calling DrillDown with `SystemID` → `GroupID` → `SubGroupID` chain; then filtered Summaries for one `BaseVehicleID` (2010 Honda Civic already in `test-motor-api.ts`). Production catalog storage and customer-facing hours require **MOTOR commercial license**.

**Phase 1 implementation (2026-07-07):** Normalized `MotorCatalogNode` table (not JSON snapshot SoT) — one row per system/group/subgroup per `baseVehicleId`, keyed by `nodeKey`. Sync script also writes `prisma/data/motor-taxonomy-{baseVehicleId}.json` for inspection.

### Key architectural principle

> **Taxonomy is global and licensed. Applications are per BaseVehicleID. Position is on the application row. Hours cache is YMM-primary denormalized copy for speed.**

ShopRally's multi-tenant model stays correct: catalog is **global** (like today’s `LaborOperation`); shops differ only in **labor rate**, **matrix**, and **canned job overlays**.

---

## Appendix — MOTOR API quick reference (ShopRally-relevant)

```
# Taxonomy drill (global per vehicle config)
GET /v1/Information/Vehicles/Attributes/BaseVehicleID/{id}/Content/Taxonomies/Of/EstimatedWorkTimes
    ?ResultType=DrillDown
    [&SystemID=][&GroupID=][&SubGroupID=]
    [&BR=][&EN=][&DT=]…   # VCdb-aligned vehicle config filters

# Applications under taxonomy node
GET /v1/Information/Vehicles/Attributes/BaseVehicleID/{id}/Content/Summaries/Of/EstimatedWorkTimes
    ?SystemID=&GroupID=&SubGroupID=
    &SearchTerm=
    &PageIndex=0&ItemsPerPage=30

# Single application detail
GET /v1/Information/Vehicles/Attributes/BaseVehicleID/{id}/Content/Details/Of/EstimatedWorkTimes/{ApplicationID}
```

**Auth:** Shared HMAC (`MOTOR_PUBLIC_KEY` + `MOTOR_PRIVATE_KEY`) — implemented in `motor-client.ts`.

**Test:** `npm run test:motor -- "brake pad"` from ShopRally root.

---

## Related docs

- `docs/SHOPRALLY-DEV.md` — MOTOR env + sandbox
- `docs/design/labor-book-prodemand-tekmetric.md` — UI target (update data wiring column when M4 ships)
- `docs/design/shop-library-miller-flow-2026-07-05.md` — Miller column audit (taxonomy section superseded by this plan)
- MOTOR DaaS Estimated Work Times API Reference v1.5 (public PDF)
- MOTOR DaaS Development Handbook 2025 (public PDF)
