# Order Process Lab — start here (updated v2)

**Latest design:** [SHOPRALLY-ESTIMATE-FIRST-INTAKE.md](./SHOPRALLY-ESTIMATE-FIRST-INTAKE.md)  
**Test mockup (isolated — does not touch dev :3004):**

```
agents/OrderProcessLab/prototype/estimate-first-intake.html
```

Double-click to open, or:

```powershell
npm run order-process:mockup
# → http://localhost:5199/estimate-first-intake.html
```

## v2 flow (estimate-first)

1. Job board → **+ New repair order**
2. **Draft RO #** — land on **estimate immediately** (no intake sheet)
3. **Identity bar** on estimate — search, chips, concern, odometer
4. Checklist complete → **Add to estimate** unlocks
5. First job + totals

## v1 (archived for reference)

- Slide-over intake sheet: `prototype/new-ro-process-mockup.html`
- Spec: `ULTIMATE-ORDER-PROCESS-SPEC.md`

## SnagIt reference

AutoLeap estimate-first capture: `8EEE20F8-A5C0-48C7-8B86-96315F1469F9.MP4`

## Production merge

**Not started** — lab only until you approve v2 spec.
