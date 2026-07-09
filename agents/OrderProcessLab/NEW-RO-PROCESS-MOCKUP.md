# New RO process — interactive test mockup

> **v2 (current):** [estimate-first-intake.html](./prototype/estimate-first-intake.html) — lands on estimate immediately.  
> See [SHOPRALLY-ESTIMATE-FIRST-INTAKE.md](./SHOPRALLY-ESTIMATE-FIRST-INTAKE.md)

---

# v1 — slide-over sheet mockup (archived)

**Purpose:** Click-through prototype for the slide-over intake rail (superseded by v2 estimate-first).

## Dev isolation (safe to use anytime)

| | Mockup | ShopRally dev (`npm run dev`) |
|---|--------|---------------------------|
| **Location** | `agents/OrderProcessLab/prototype/` only | `src/`, `app/` |
| **Port** | Optional `5199` if using serve | `3004` |
| **Database / API** | None — fake data in HTML | Real demo shop |
| **Imports** | Zero links into `src/` | Production app |

Running this mockup **does not** restart, reload, or change your dev CRM on port 3004.

## Open it

### Option A — double-click (fastest)
```
agents/OrderProcessLab/prototype/new-ro-process-mockup.html
```
Open in Chrome or Edge. No server required.

### Option B — local server (if file:// blocks something)
```powershell
cd agents/OrderProcessLab/prototype
npx --yes serve . -p 5199
```
Then open: **http://localhost:5199/new-ro-process-mockup.html**

---

## What to test

| # | Action | Expected |
|---|--------|----------|
| 1 | Click **+ New repair order** (FAB) | Intake sheet slides in over blurred job board |
| 2 | Search **Jordan** → pick customer | Summary card appears; **Next** enables |
| 3 | Select **2020 Honda Accord** | Vehicle card highlights; **Next** enables |
| 4 | Type concern → chip appears | Visit step complete; **Next** to step 4 |
| 5 | **Create repair order →** | Lands on **Estimate** (not summary) |
| 6 | **+ Add job** / **Add to estimate** | First job line + sticky total |

**Toolbar shortcuts (top bar):**
- **Reset** — start over from job board
- **Auto demo** — runs full happy path (~12s)
- **Skip to estimate** — jump to estimate phase

---

## Flow being tested

```
Job Board → FAB intake (4-step rail)
  1 Identity   — unified search / add customer
  2 Vehicle    — fleet card or add vehicle
  3 Visit      — concern chip + odometer + lead source
  4 Create     — opens /estimate directly
Estimate → Services tab → first job → totals bar
```

Matches `ULTIMATE-ORDER-PROCESS-SPEC.md` v1.0 north star: **≤3 min to first quoted job**.

---

## Related artifacts

| File | Description |
|------|-------------|
| `prototype/intake-redesign.html` | Animation-only intake demo (autoplay video source) |
| `ULTIMATE-ORDER-PROCESS-SPEC.md` | Full process spec |
| `RO-SUBFORMS-REDESIGN.md` | CRM subform updates on estimate/WIP |

---

## Feedback checklist

When testing, note:
- [ ] Is the 4-step rail clearer than the old scroll form?
- [ ] Does FAB-over-board feel right (AutoLeap) vs full-page intake?
- [ ] Is concern-on-intake enough before estimate?
- [ ] Should **Add new customer** expand inline vs modal?
- [ ] Any step feel redundant or missing?

Drop notes in `agents/OrderProcessLab/TEST-RESULTS.md` or reply with friction points.
