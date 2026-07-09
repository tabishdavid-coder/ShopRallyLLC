# Intake Lab → production merge checklist

**Status:** ✅ Merged into Dev :3004 (2026-07-03)

## Run separately (reference mock)

```powershell
npm run intake-lab
```

Open **http://localhost:3010** — still useful for UX experiments; production uses `src/components/repair-order/ro-intake-form.tsx`.

Shop CRM dev: **http://localhost:3004** (`npm run dev`).

## Production targets (merged)

| Lab pattern | Production file |
|-------------|-----------------|
| Search mode pills (Name/Phone/Plate/VIN) | `ro-intake-form.tsx` |
| Add customer prefill + empty-result row | `add-customer-dialog.tsx`, `customer-search-results.tsx`, `ro-intake-form.tsx` |
| Vehicle fleet cards + plate/VIN lookup row | `ro-intake-form.tsx` |
| Add vehicle → Continue → confirm details | `add-vehicle-dialog.tsx` (existing two-step) |
| Visit details single section (sheet) | `ro-intake-form.tsx` |
| Navy/light brand chrome | `globals.css` tokens via Tailwind utilities |

## Still lab-only (not ported)

- Draft RO# before create (needs backend draft RO)
- Transfer vehicle / active RO guardrail modals (future)
- Mock data / static HTML prototype

## Tekmetric-safe

No competitor names in Shop CRM copy — see `.cursor/rules/tekmetric-legal-differentiation.mdc`.
