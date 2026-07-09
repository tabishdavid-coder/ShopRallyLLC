# Video production brief — order process walkthrough

**Audience:** Shop owner (Tabish) — review without running Dev 3004  
**Runtime target:** 2–4 minutes  
**Resolution:** 1280×720  
**Tone:** Calm product demo; show speed, not hype

---

## Shot list

| Scene | Duration | Route / action | Narration (draft) |
|-------|----------|----------------|-------------------|
| **1. Open** | 5s | `/job-board?design=open` | "This is the fastest path from the job board to a quotable repair order." |
| **2. Start intake** | 5s | Click FAB **+ New repair order** | "One click opens intake — the board stays visible." |
| **3. Find customer** | 15s | Plate or phone search → select | "Search by plate or phone — Enter picks the first match." |
| **4. Vehicle** | 10s | Fleet card click OR auto-selected | "Vehicle confirms in one tap." |
| **5. Concern** | 10s | Type concern → Add chip | "Concerns are captured on intake, not after." |
| **6. Create** | 5s | **Create repair order** | "Create lands us directly on the estimate — no extra tabs." |
| **7. Estimate context** | 10s | Pan header + lifecycle + concerns | "RO number, customer, and concerns carry over." |
| **8. Add job** | 20s | **+ Add job** → pick template OR labor guide | "Add a job from templates or the labor guide." |
| **9. Inline edit** | 15s | Edit hours/name; show Saved | "Lines edit in place — auto-save, no pencil mode." |
| **10. Totals** | 10s | Scroll to sticky GP bar | "Totals and gross profit stay pinned while you build." |
| **11. Close** | 5s | Hold on estimate with one job | "Intake to first quoted job — under three minutes." |

---

## Visual rules

- Sidebar **expanded** (cookie `sidebar_state=true`)
- Use **demo seed customers** — no real customer PII
- Mouse moves: slow enough to read; use `--slow` flag in recorder
- Do not show browser devtools or Cursor IDE
- DEV navy bar OK (`?design=open`) — signals dev review

---

## Recording commands

```powershell
# Standard walkthrough
node agents/OrderProcessLab/scripts/record-order-process.mjs --slow

# Visible browser (manual polish)
node agents/OrderProcessLab/scripts/record-order-process.mjs --headed --slow

# Storyboard PNGs only
node agents/OrderProcessLab/scripts/record-order-process.mjs --screenshots-only
```

---

## Post record checklist

- [ ] Video saved to `output/`
- [ ] `VIDEO-NOTES.md` timestamps filled
- [ ] RO # used noted for reproducibility
- [ ] Any awkward UI moment logged for Agent 1
- [ ] Optional MP4 convert via ffmpeg (see Agent 3 CONTINUE)

---

## Chapter markers (fill after record)

| Time | Label |
|------|-------|
| 0:00 | Job board |
| 0:10 | Intake |
| 0:45 | Create RO |
| 1:00 | Estimate |
| 1:30 | Add job |
| 2:00 | Inline edit + totals |
