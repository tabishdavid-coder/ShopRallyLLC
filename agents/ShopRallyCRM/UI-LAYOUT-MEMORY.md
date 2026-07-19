# ShopRally CRM — UI layout memory

> **Created:** 2026-07-18  
> **Purpose:** Durable agent memory for estimate/desktop layout preferences.

## Horizontal-first on desktop

ShopRally estimate and AI surfaces should **prefer horizontal layouts** over tall vertical stacks when viewport space allows.

### Rules

1. **Desktop (lg+):** Use wide dialogs (`max-w-4xl` / `max-w-5xl`), 2–3 column grids, and side-by-side panels (context left, actions/suggestions right).
2. **Mobile/narrow:** Stack vertically below `md` / `lg` breakpoints only.
3. **Avoid:** Narrow phone-column modals on desktop for multi-section content (description + checklists, concerns + jobs).
4. **Keep:** Confirmation/review gates for AI suggestions and core write paths — layout changes must not remove review steps.

### Reference implementation

- **Review AI suggestions dialog:** `src/components/estimate-building/create-job-ai-dialog.tsx` — left “Your description” rail, right Concerns | Jobs & Parts columns, footer Back | Add to estimate.

### Cursor rule

See `.cursor/rules/desktop-horizontal-ui.mdc` (always applied).
