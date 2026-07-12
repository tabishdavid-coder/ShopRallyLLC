# Core Plan Fidelity — change log

Track every change on branch `cursor/core-plan-fidelity-5e7c` so we can merge safely and prove Core tier behavior.

| Date | Area | Change | Files | Core verify |
|------|------|--------|-------|-------------|
| 2026-07-12 | Session | Opened Core fidelity branch + tracking docs (no product code yet) | `agents/ShopRallyCRM/CORE-PLAN-FIDELITY*.md`, `docs/CORE-PLAN-FIDELITY.md` | — |
| 2026-07-12 | Seed | Added **Macuto Auto Repair** (`shop_macuto`, plan `STARTER`) for Core QA — owner + platform admin memberships, legal acceptances | `prisma/seed.ts` | ⬜ pending DB |
| 2026-07-12 | Labor | Gate `getLaborBookMotorInit` + `getLaborBookMotorApplications` with `motorEnabledForShop` — Core gets reference/shop guide only | `src/server/actions/labor-book-motor.ts` | ⬜ pending |
| 2026-07-12 | Nav + routes | Plan-filter nav hrefs (`/messages`, `/payments`, `/orders`, vendors, markups) + route guard; platform admin on Core shop now gets filtered sections | `src/server/crm-access.ts`, `src/lib/subscription.ts` | ⬜ pending |

### Template (copy for new rows)

```markdown
| YYYY-MM-DD | Nav / Labor / Payments / … | What changed and why | `path/to/file` | ✅ Core shop tested / ⬜ pending |
```
