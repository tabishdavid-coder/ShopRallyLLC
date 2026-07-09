# ShopRally intake — blended design (from your Snagit videos)

**Sources analyzed** (frames extracted via ffmpeg):
- `2BBF85F0…MP4` — **AutoLeap**: Work Board → + Estimate → inline RO shell → customer/vehicle modals → Services tab
- `7ABF2D71…MP4` — **Tekmetric**: Job Board → + Repair Order → single intake form → vehicle lookup/duplicate guards → Estimate tab

Screenshots: `screenshots/` and `screenshots/tekmetric/`

---

## What each product optimizes for

| | Tekmetric | AutoLeap |
|---|-----------|----------|
| **Entry** | Full-page “Create new repair order” form | + Estimate → **RO# assigned immediately** |
| **Customer** | Search + Add Customer modal (Person/Business) | Search on RO header + richer Create Customer |
| **Vehicle** | Add Vehicle modal: Plate/VIN lookup + state, duplicate transfer | Plate/VIN/YMM + state + **Transfer vehicle** modal |
| **Concerns** | On intake form, “+ Add Concern” chips | Concerns tab on RO (post-create) |
| **Guardrails** | Duplicate vehicle + **Active RO exists** warning | Transfer vehicle to preserve history |
| **Estimate handoff** | Estimate tab: Smart Jobs + canned job search | Services tab: canned services + line grid |

---

## ShopRally blended model (best shot)

### Core decision: **Fast RO shell + complete intake, then estimate**

Blend AutoLeap’s speed with Tekmetric’s completeness:

1. **+ New repair order** creates a **draft RO#** immediately (user sees progress).
2. **Intake sheet** opens (FAB / Job Board) — one scrollable form, not a rigid 4-step wizard.
3. **Create repair order** validates → promotes draft → **navigate to Estimate** with concerns pre-loaded.

This avoids AutoLeap’s empty Services grid before identity is set, and avoids Tekmetric’s extra full-page context switch when the FAB already uses a sheet.

### Intake form layout (single column, sectioned)

```
┌─ New repair order ──────────────────────────────── RO #1043 (draft) ─┐
│  ● Customer  ○ Vehicle  ○ Visit details     (progress chips)        │
├─────────────────────────────────────────────────────────────────────┤
│  FIND CUSTOMER                                                       │
│  [ Name | Phone | Plate | VIN ]   ← mode pills (AutoLeap)           │
│  [ search........................................... ]               │
│  Selected: Tabish David · (555) 201-8842                    [×]     │
│  + Add customer                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  VEHICLE                                                             │
│  (fleet cards if customer has vehicles — Tekmetric select)           │
│  — or —                                                              │
│  Plate/VIN  [...............]  State [NY ▼]  [Lookup]               │
│  + Add vehicle manually                                              │
├─────────────────────────────────────────────────────────────────────┤
│  VISIT DETAILS                                                       │
│  Concerns: [ textarea ] [Add]  → chips (Tekmetric, on intake)       │
│  Odometer in [____]  ☐ Odometer N/A                                 │
│  Visit type [Drop-off ▼]   Labor rate [Standard $150 ▼]             │
│  Lead source [Google ▼]                                              │
├─────────────────────────────────────────────────────────────────────┤
│                        Cancel    Create repair order  Alt+↵          │
└─────────────────────────────────────────────────────────────────────┘
```

### Modals (only when needed)

| Modal | When | Blend source |
|-------|------|--------------|
| **Add customer** | No match | Tekmetric Person/Business + AutoLeap comm prefs (collapsed “More”) |
| **Add / lookup vehicle** | Plate/VIN path | Tekmetric lookup + state; tabs: Lookup · Fleet · Manual |
| **Transfer vehicle** | VIN on another customer | Both products — recommend transfer, allow duplicate with warning |
| **Active RO warning** | Open RO for same customer+vehicle | Tekmetric table + “Open existing” / “Continue new RO” |

### Estimate handoff (post-intake — not part of intake)

After create, land on **Estimate** with:
- Customer concerns copied to **Smart Jobs / Service concerns** (Tekmetric)
- Top builder strip: canned jobs, discount, fee, labor guide, parts hub (already in ShopRally work area)
- **Do not** start line-item grid during intake (AutoLeap Services tab stays estimate-phase only)

### ShopRally differentiation (legal-safe)

| Use | Avoid |
|-----|--------|
| ShopRally charcoal + cyan tokens | Competitor green/blue chrome |
| “Customer concerns”, “Visit type”, “Create repair order” | “Customer states”, “+ Estimate”, competitor names |
| “Smart Jobs”, “Bay Care”, “Growth Engine” | “Growth Engine like Tekmetric…” in CRM copy |
| Transfer / duplicate **wording in our voice** | Copying exact warning paragraph text from videos |

---

## UX principles

1. **One primary action** — Create repair order (not Save + Create + separate estimate step).
2. **Search-first** — Plate/VIN resolves customer+vehicle when possible (shop owner habit from both videos).
3. **Guardrails, not blockers** — Transfer vehicle and active RO are choices with clear consequences.
4. **Keyboard** — Alt+Enter submit; Enter selects first search result.
5. **Progress without wizard fatigue** — Section chips update as fields complete; form stays one scroll.
6. **Sidebar stays** — No RO “focus mode”; intake is a sheet over Job Board (user preference).

---

## Production mapping (when approved)

| Prototype | Production file |
|-----------|-----------------|
| Sheet shell | `ro-intake-sheet.tsx` |
| Form sections | `ro-intake-form.tsx` |
| Add customer | `add-customer-dialog.tsx` (reuse) |
| Add vehicle | `add-vehicle-dialog.tsx` + plate lookup |
| Transfer / active RO | New server actions + dialogs |
| Draft RO# | `createRepairOrder` draft status or optimistic RO number |

---

## Test the v2 prototype

```powershell
cd prototypes\intake-lab
npx --yes serve -l 3010
```

Open **http://localhost:3010** — try plate `JBD3839`, customer `Tabish`, duplicate VIN flow, then Create.
