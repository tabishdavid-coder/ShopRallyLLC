# Order Process Lab — test script

**Spec:** `ULTIMATE-ORDER-PROCESS-SPEC.md`  
**Environment:** http://localhost:3004  
**Query param:** append `?design=open` if DEV bar needed

---

## Setup

1. `npm run dev` in `shoprally/`
2. Log in as demo shop user (seed data)
3. Navigate to `/job-board?design=open`
4. Start stopwatch at first interaction

---

## T1 — FAB intake happy path

| # | Step | Expected |
|---|------|----------|
| 1 | Click **+ New repair order** (FAB) | Intake sheet opens; Job Board visible behind |
| 2 | Search customer by **name** | Results list; progress pill Customer incomplete |
| 3 | Select first result (click) | Customer chip shown; pill Customer complete |
| 4 | Click vehicle card from fleet | Vehicle selected; pill Vehicle complete |
| 5 | Type concern → Add | Chip appears under Visit |
| 6 | Enter odometer (or check N/A) | Field accepted |
| 7 | Click **Create repair order** | Loading → redirect |
| 8 | Verify URL | `/repair-orders/{id}/estimate` |
| 9 | Verify concerns | Visible on Concerns tab or Smart Jobs |
| 10 | Stop stopwatch | Record seconds |

**Pass:** Steps 1–9 without error. Time ≤ 45s to step 8.

---

## T2 — Plate-first path

| # | Step | Expected |
|---|------|----------|
| 1 | Open intake FAB | Sheet open |
| 2 | Switch search mode to **Plate** | Pill active |
| 3 | Enter known demo plate | Customer + vehicle context resolves |
| 4 | Add concern + Create | Lands on estimate |

**Pass:** Vehicle step skipped or pre-selected when plate resolves both.

---

## T3 — New customer from intake

| # | Step | Expected |
|---|------|----------|
| 1 | Search nonsense string | No results |
| 2 | **+ Add customer** | Modal opens |
| 3 | Fill required fields → Save | Customer selected in intake |
| 4 | Add vehicle + concern → Create | RO created |

**Pass:** Sheet stays open through modal; no full-page navigation.

---

## T4 — Keyboard

| # | Step | Expected |
|---|------|----------|
| 1 | Search customer, focus results | First row highlighted |
| 2 | Press **Enter** | Customer selected |
| 3 | Tab to Create, **Alt+Enter** | RO created |

**Pass:** Both shortcuts work.

---

## T5 — Estimate handoff

| # | Step | Expected |
|---|------|----------|
| 1 | After create, note RO # | Displayed in header |
| 2 | Lifecycle strip | Quoted / Estimate phase |
| 3 | Services tab | Toolbar visible (+ Add job) |
| 4 | Concerns tab | Intake concern present |

**Pass:** No extra click to reach Services from landing.

---

## T6 — First job (90s budget)

Start timer on estimate landing.

| # | Step | Expected |
|---|------|----------|
| 1 | Click **+ Add job** or search templates | Job launcher / results |
| 2 | Select canned job OR labor guide job | Job card appears |
| 3 | Edit labor hours or job name | Inline edit, no pencil |
| 4 | Wait for save indicator | Saved within ~2s of stop typing |

**Pass:** Job on screen within 90s of landing.

---

## T7 — Inline edit

| # | Step | Expected |
|---|------|----------|
| 1 | Open **⋮** on job card | Menu: add labor, part, fee, etc. |
| 2 | Add labor line | Line appears in grid |
| 3 | Change qty/hours | Auto-save fires |

**Pass:** No "Edit job" / "Save job" footer required.

---

## T8 — Full happy path time

| Metric | Target |
|--------|--------|
| Intake open → estimate landing | ≤ 45 s |
| Estimate landing → first job saved | ≤ 90 s |
| **Total** | **≤ 3 min** |

**Pass:** Total ≤ 180 s.

---

## Regression spot-checks

- [ ] Sidebar visible during intake sheet
- [ ] No competitor trademarks in UI (Tekmetric, AutoLeap strings)
- [ ] Cancel on intake closes sheet without create
- [ ] Sticky totals bar visible when scrolling Services tab

---

## Log template

Copy to `TEST-RESULTS.md`:

```
| T1 | PASS/FAIL | {sec}s | |
| T2 | PASS/FAIL | | |
...
Ready for video: Yes/No
```
