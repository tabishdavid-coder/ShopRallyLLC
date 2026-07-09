---
name: data-compliance-audit
description: >-
  Implement ShopRally CRM data compliance, consent tracking, retention policy, and
  immutable shop audit trail. Use when working on DATA-COMPLIANCE-AGENT tasks,
  ShopAuditEvent, ConsentRecord, TCPA consent, or compliance gates — not for
  general Dev 3004 UI work.
disable-model-invocation: true
---

# ShopRally Data Compliance & Audit Agent

## Scope

Build the **data governance layer** for multi-tenant repair-shop CRM: classification, consent, retention defaults, expanded audit events, and enforcement gates — **without adding shop Settings pages** for platform-only concerns.

## Hard constraints (never break)

1. **Do NOT touch Dev 3004 runtime**
   - Do not run `npm run dev`, `npm run dev:3004`, or `npm run dev:3001`
   - Do not edit `.env`, `.env.local`, or port config
   - Do not kill processes on port 3004
   - Do not run `prisma migrate deploy` against production Neon unless user explicitly asks

2. **Do NOT merge or push** — work stays on `feature/data-compliance-audit` until user approves

3. **Do NOT commit** unless user explicitly asks

4. **PCI boundary** — never store or log PAN, CVV, or full track data; Stripe tokens/IDs only

5. **Minimize scope** — only compliance/audit/consent files + wiring; no unrelated CRM chrome

## Branch & tracking

- **Branch:** `feature/data-compliance-audit`
- **Playbook:** `agents/ShopRallyCRM/DATA-COMPLIANCE-AGENT.md`
- **Progress:** `agents/ShopRallyCRM/DATA-COMPLIANCE-BUILD-STATE.md` — update as phases complete

## Foundation files (create first if missing)

These are imported across the codebase but may be absent on disk:

| File | Purpose |
|------|---------|
| `src/server/permissions.ts` | `requirePermission`, `requireAnyPermission`, `requireJobBoardMove`, `getEffectivePermissions` |
| `src/server/permission-gates.ts` | `gates.*` helpers used in server actions |
| `src/server/shop-audit.ts` | `recordShopAuditEventSafe`, `getRepairOrderAuditTrail`, `listShopAuditEvents` |
| `src/lib/shop-audit-display.ts` | Event labels for UI |
| `src/components/repair-order/ro-audit-trail-panel.tsx` | RO audit panel |

Run `npx tsc --noEmit` after foundation — do not start dev server to verify.

## Implementation phases

Read `agents/ShopRallyCRM/DATA-COMPLIANCE-AGENT.md` for full phase list (0–8).

**Priority order:**
1. Foundation modules (permissions + shop-audit + audit panel)
2. `src/lib/data-compliance.ts` policy constants
3. Schema: `ConsentRecord`, `ShopDataPolicy`, extended `ShopAuditEventType`
4. Wire customer/consent/approval audits
5. Compliance gates (SMS addendum, marketing consent)
6. In-flow UI only — consent on customer/intake forms, RO activity log; **no** `/settings/data-compliance` or `/settings/audit-log`
7. Docs update to `docs/SHOP_ONBOARDING.md` (compliance section only)

## Shop vs platform

| Shop operator | ShopRally parent |
|---------------|---------------|
| Consent at capture, RO activity log, Settings → Legal | Platform onboarding checklist, `PlatformAuditEvent`, retention cron |
| Customer export/delete on customer record (when wired) | Policy overrides via support, not shop UI |

## Existing patterns to follow

- Legal: `src/server/legal.ts`, `LegalAcceptance`, `docs/SHOP_ONBOARDING.md`
- Platform audit: `src/server/platform/audit.ts`
- RBAC keys: `src/lib/permissions.ts` (`PERMISSION_CATEGORIES`)
- Shop onboarding compliance: `src/server/platform/onboarding-compliance.ts`
- Audit call sites: `estimate.ts`, `payments.ts`, `share.ts`, `job-board.ts`, `adjustments.ts`

## Verification (no dev server)

```bash
npx tsc --noEmit
npx prisma validate
# optional if schema changed locally:
npx prisma migrate dev --name data_compliance --create-only
```

## Out of scope

- SOC 2 certification, 10DLC automation, full DSAR portal
- Production deploy, Vercel, Neon migrate deploy
- Modifying `_archive-repairpilot/` or SEO autopilot work
