# Batch 2 — CRM role permissions & route guards

**Branch:** `feature/master-crm` (WIP uncommitted for RO tab extension)  
**Status:** ✅ **Owner approved 2026-07-03**

**Review archive:** http://localhost:3004/design-review/batch-02-rbac

**Next:** [Batch 3 — RO workspace UX](/design-review/batch-03-ro-workspace)

## Already on `main` (baseline — no re-review needed)

| ID | Behavior |
|----|----------|
| RBAC-01 | Layout calls `checkCrmRouteAccess` → redirect `/dashboard?access=denied` |
| RBAC-02 | Header sections + dashboard sidebar filtered via `allowedNavHrefs` / `allowedSectionIds` |
| RBAC-03 | Amber banner on dashboard when redirected for missing permission |
| RBAC-04 | Growth routes plan-gated; CRM routes permission-gated |

## WIP — approve one at a time

| ID | Behavior |
|----|----------|
| RBAC-05 | Hide RO tabs when user lacks `estimate.view`, `wip.view`, or `payments.view` |
| RBAC-06 | Deep link to forbidden RO tab → redirect to RO overview |
| RBAC-07 | Server route guard mirrors tab rules for `/repair-orders/[id]/estimate|work-in-progress|payment` |

## Test personas

| Group | Hidden tabs (planned) |
|-------|------------------------|
| **Technician** | Payment (no `payments.view`) |
| **Front Desk** | Work in Progress (no `wip.view`) |

Edit in **Employees → Permissions** or assign permission group, then open any RO.

## Approve

Reply `APPROVED RBAC-05`, …, or `APPROVE BATCH 2` when all three pass.
