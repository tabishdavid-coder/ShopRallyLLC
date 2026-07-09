# RO subforms redesign — output summary

**Date:** 2026-07-05  
**Scope:** Repair order process subforms aligned to intake / add-customer CRM format

## Design system added

| Component | Path | Purpose |
|-----------|------|---------|
| **CrmDialogShell** | `src/components/crm/crm-dialog-shell.tsx` | Navy header, scroll body, muted footer — shared by all RO subforms |
| **CrmDialogFooterButtons** | same | Cancel + Save with brand-navy CTA |

Pattern matches `add-customer-dialog` + `ro-intake-sheet`:
- Eyebrow: `Repair order`
- **CrmFormSection** cards with navy/light accent bars
- **CrmFormField** labels
- `border-brand-light/40` inputs

## Subforms updated

| Subform | File | Changes |
|---------|------|---------|
| Select / text / datetime field editors | `ro-sidebar-field-dialogs.tsx` | All 5 dialogs → CrmDialogShell + CrmFormSection |
| Odometer in / out | `ro-sidebar-field-dialogs.tsx` | Grouped mileage section, navy accent |
| Customer concern | `customer-concern-dialog.tsx` | Split: Customer reported + Shop finding sections |
| Technician concern | `technician-concern-dialog.tsx` | Rating / task / finding sections |
| Add activity | `add-activity-dialog.tsx` | Single CRM section, navy header |
| Edit vehicle | `edit-vehicle-dialog.tsx` | Identity (VIN/plate) + Vehicle details sections |
| Order details sheet | `ro-context-deck.tsx` | Navy sheet header matching intake FAB sheet |

## Not yet migrated (future pass)

- Share / authorize / deposit dialogs
- Payment record modals
- Canned job picker / labor guide (fullscreen branded — different pattern)
- `edit-customer-dialog` (already CRM — no change needed)

## Video

**Watch:** https://files.catbox.moe/sa9rwt.webm  
**Local:** `output/ro-subforms-redesign-2026-07-05T19-12-34.webm`

Walkthrough covers:
1. Customer concern dialog (CRM sections)
2. Technician concern dialog (rating + task + finding)
3. Add activity dialog
4. Order details sheet (navy header)
5. Sidebar field picker + Odometer in dialogs

Run: `node agents/OrderProcessLab/scripts/record-ro-subforms-redesign.mjs --slow`
