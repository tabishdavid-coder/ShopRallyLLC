# Video notes — 2026-07-05 (Run 3 — new customer)

**File:** `output/order-process-walkthrough-2026-07-05T18-40-51.webm`  
**Duration:** ~52s (automated walkthrough, `--slow`)  
**Flow:** AutoLeap-style FAB intake → new customer → new vehicle → estimate → first job  
**Customer:** Jordan Walkin1682 · 518-555-851682  
**Vehicle:** 2020 Honda Accord · 62,000 mi  
**Design mode:** Hidden (dock + dev bar suppressed for clean recording)

## Remote view

- **Primary:** https://files.catbox.moe/6uchp1.webm
- **Backup page:** https://tmpfiles.org/wewRau2yWAgT/order-process-walkthrough-2026-07-05t18-40-51.webm
- **Manifest:** `output/remote-view-link.json`

## Chapter markers

| Time | Scene | Narration |
|------|-------|-----------|
| 0:00 | Job board | Advisor starts from job board — board stays visible. |
| 0:03 | FAB intake | **New repair order** opens sheet over board (AutoLeap-style). |
| 0:06 | Add customer | Search miss → **Add customer** modal → Save customer. |
| 0:12 | Add vehicle | **Custom Vehicle** tab → YMM → Continue → Save. |
| 0:22 | Concern | Brake noise chip + odometer on intake. |
| 0:28 | Create RO | Lands on **Estimate** tab (not job board). |
| 0:35 | Add job | Launcher → blank job on Services tab. |
| 0:48 | Totals | Sticky GP / totals bar visible. |

## Reproduce

```powershell
npm run dev
npm run order-process:record
```
