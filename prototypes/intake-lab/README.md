# ShopRally Intake Lab v2

**Separate process** — iterate here until you approve merge into `:3004` CRM.

| | Intake Lab | Shop CRM dev |
|---|------------|--------------|
| **Port** | 3010 | 3004 |
| **Start** | `npm run intake-lab` | `npm run dev` |
| **URL** | http://localhost:3010 | http://localhost:3004 |
| **Data** | Mock JSON | Prisma / live shop |
| **Code** | `prototypes/intake-lab/*` only | `src/*` |

## Quick start

From repo root:

```powershell
npm run intake-lab
```

Or:

```powershell
cd prototypes\intake-lab
npx --yes serve -l 3010
```

## Demo script

| Step | Action |
|------|--------|
| 1 | **+ New repair order** → sheet + Draft RO # |
| 2 | Search **Tabish** → vehicle card |
| 3 | Plate **JBD3839** → Transfer vehicle modal |
| 4 | Add concern → **Create repair order** |
| 5 | Estimate handoff preview |

Try **Alt + ↵** to submit from the sheet.

## Docs

- **`SHOPRALLY-INTAKE-BLEND.md`** — blended AutoLeap + Tekmetric UX (Tekmetric-safe)
- **`MERGE.md`** — merge checklist when ready
- **`screenshots/`** — frames from your Snagit MP4s

## Workflow

1. Change intake UX **only in this folder**.
2. Test on **:3010**.
3. When happy, say **Approve intake merge** — we port to `src/` per `MERGE.md`.
4. Until then, **no production intake changes** from this workstream.
