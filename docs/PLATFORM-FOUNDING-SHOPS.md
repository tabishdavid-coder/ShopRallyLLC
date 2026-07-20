# Platform — founding Core / Ignition shops

Launch motion: provision shops in Master CRM → invite owners → dogfood bay loop. Stripe Ignition Checkout is optional day-0 (see `docs/IGNITION-GO-LIVE.md`).

## Seed QA tenant

| Field | Value |
|-------|--------|
| Shop id | `shop_macuto` |
| Name | Macuto Auto Repair |
| Plan | `STARTER` (Ignition / Core) |
| Estimate RO | `ro_macuto_1001` (re-seed if missing: `npm run db:seed`) |

Enter CRM:

```
http://localhost:3031/platform/enter?shop=shop_macuto&next=/job-board
```

Estimate shortcut:

```
/platform/enter?shop=shop_macuto&next=%2Frepair-orders%2Fro_macuto_1001%2Festimate
```

## Provision a new founding shop

1. Open `/platform` as platform admin  
2. **Add shop** (or edit) → plan **Core / STARTER**, billing **Trial** or **Active**  
3. Complete legal acceptances (compliance gate)  
4. Invite owner (Clerk Org) or use enter-shop for smoke  
5. **Enter shop CRM** → run bay-loop checklist below  
6. Leave Release flags **OFF** in production for Growth / SMS / MOTOR / PartsTech / AI  

Do **not** assign Pro/Elite for public customers while `PHASE_ONE_LAUNCH=true`.

## Bay-loop smoke (must pass)

- [ ] Job board loads (Estimates / WIP / Completed)  
- [ ] No Growth / Messages / Payments hub / Labor Book in sidebar  
- [ ] Customer → vehicle (NHTSA VIN or free-type YMM) → RO  
- [ ] Canned / shop labor estimate (no MOTOR BOOK)  
- [ ] DVI create  
- [ ] **Email** estimate / approve link (SMS hidden)  
- [ ] Approve → WIP → complete  
- [ ] Email invoice → **manual** Record payment (no Stripe Collect)  
- [ ] Settings → Subscription shows Ignition / Core  
- [ ] Lead Sources (`/settings/marketing`) still reachable  

## Local gotchas

- Nested `/platform/*` 404 → delete `.next`, restart `npm run dev`  
- Neon pool exhaustion → keep **one** CRM browser tab  
