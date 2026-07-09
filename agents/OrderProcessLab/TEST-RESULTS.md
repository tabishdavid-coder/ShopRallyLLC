# Test results — Run 3 (2026-07-05)

**Tester:** Agent 2 (automated Playwright)  
**Date:** 2026-07-05  
**Spec:** ULTIMATE-ORDER-PROCESS-SPEC.md v1.0  
**Environment:** http://localhost:3004  
**RO created:** #1379 (Jordan Walkin1682 · 2020 Honda Accord)

## Summary

| Case | Result | Time | Notes |
|------|--------|------|-------|
| T1 FAB happy path | ✅ Pass | ~3s | Job board → FAB sheet, board visible behind |
| T2 Plate-first | — | — | Not in this run |
| T3 New customer | ✅ Pass | ~18s | Add customer modal + custom vehicle YMM |
| T4 Keyboard | — | — | Not in this run |
| T5 Estimate handoff | ✅ Pass | ~6s | Create RO → `/estimate` directly |
| T6 First job | ✅ Pass | ~8s | + Add job → blank job on Services |
| T7 Inline edit | — | — | Not in this run |
| T8 Time budget (≤3 min) | ✅ Pass | ~52s | Well under 3 min target |

## Friction log (for Agent 1)

- Custom Vehicle tab uses plain text inputs (not `<select>` for year) — two-step Continue → Save.
- Add customer from intake search miss works well; flow feels AutoLeap-like with FAB sheet.
- Design dock auto-opens in dev — recorder now hides dock + dev bar via CSS for clean video.

## Blockers

- None for lab recording.

## Ready for video? (Agent 3)

**Yes** — `output/order-process-walkthrough-2026-07-05T18-40-51.webm` uploaded.
