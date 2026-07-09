# ShopRally intake design prompt (Tekmetric-safe)

Use this prompt when implementing or reviewing **Repair Order + Estimate intake** in ShopRally.  
Blend **shop-owner ergonomics** from leading SMS products without copying trade dress, copy, or competitor names.

---

## Agent / builder prompt (paste into chat)

```
You are designing ShopRally’s repair order intake — the flow from “customer arrives” to “estimate tab open.”

CONSTRAINTS (non-negotiable)
- ShopRally branding only in UI copy (no Tekmetric, Shopmonkey, AutoLeap names in Shop CRM).
- Keep industry-standard workflows (customer search → vehicle → concerns → create RO → estimate).
- Do NOT change global CRM chrome, sidebar, or estimate builder unless explicitly asked.
- Prefer ShopRally tokens: charcoal navy primary, cyan accent, red for destructive only.
- Functional similarity to other SMS tools is OK; distinctive ShopRally labels and layout rhythm are required.

USER GOAL (shop owner / service writer)
Open intake fast from job board or + button, find or add customer, attach vehicle, capture why they came in, set visit context (odometer, waiting, writer), create RO, land on estimate — under 60 seconds for a repeat customer.

BLENDED FLOW (synthesize best-of, not clone)

1) ENTRY
- Slide-over sheet (default) OR full page for deep links — same fields.
- Title: “New repair order” / subtitle: “Find customer, add vehicle, start estimate.”
- Progress: Customer → Vehicle → Visit → Review (4 steps, skippable review if valid).

2) FIND CUSTOMER (Tekmetric speed + AutoLeap search modes)
- One primary search field with mode pills: Name | Phone | Plate | VIN.
- Debounced results; Enter selects first match.
- Inline chips for selected customer (name, phone, email) with clear (×).
- “Add customer” opens compact dialog — return to intake with customer selected.
- Plate/VIN mode: if no customer, offer “Create customer + vehicle from plate/VIN” path.

3) VEHICLE
- After customer: list their vehicles as selectable cards (YMMT, plate, VIN last 8).
- Single-vehicle shops auto-select.
- Search/filter within fleet; “Add vehicle” with VIN decode stub.
- Required before continue unless shop setting allows RO without vehicle (rare).

4) VISIT (concern-first — AutoLeap emphasis)
- Customer concerns: multi-line input + Add → chips (required: at least one OR explicit “No concern noted”).
- Odometer in + “Odometer N/A” checkbox (respect shop RO settings).
- Visit context row: Appointment status (None / Scheduled / Walk-in / Waiting) — ShopRally labels, not competitor enums.
- Optional: assign service writer (defaults to current user).

5) RO DETAILS (collapsed “More options” — Tekmetric density without clutter)
- Labor rate (shop matrix default).
- Marketing / lead source (from shop settings list).
- Tags / notes (optional).

6) ACTIONS
- Primary: “Create repair order” → mock/live creates RO, navigates to `/repair-orders/{id}/estimate`.
- Secondary: Cancel (sheet dismiss).
- Keyboard: Alt+Enter submit.

7) POST-CREATE (estimate handoff)
- Toast: “RO #1234 created — building estimate.”
- Estimate tab opens with concerns pre-loaded in Smart Jobs / service concerns panel.
- Do NOT duplicate estimate toolbar in intake — intake ends at RO creation.

LEGAL / IP CHECKLIST
- [ ] No competitor trademarks in strings
- [ ] No copied marketing slogans or exact button labels from videos
- [ ] ShopRally-specific microcopy (“Start estimate”, “Visit details”, “Bay Care” elsewhere)
- [ ] No competitor logos, colors, or iconography

OUT OF SCOPE FOR INTAKE
- Line-item estimate editing, canned jobs picker, parts hub — those live on estimate tab only.
- Hiding CRM sidebar (user prefers sidebar visible).

ACCEPTANCE TEST (manual)
- Repeat customer with 1 vehicle: 4 clicks + concern + Create.
- New customer path: Add customer → Add vehicle → concern → Create.
- Plate search mode finds existing vehicle and customer.
- Validation messages plain English; no dead buttons.
```

---

## Mapping: competitor patterns → ShopRally (safe)

| Pattern | Source inspiration | ShopRally implementation |
|---------|-------------------|------------------------|
| Unified search | Both | Mode pills + one field |
| Search mode dropdown | AutoLeap | Name / Phone / Plate / VIN pills |
| Customer result list | Tekmetric | Card list with phone + last visit |
| Concern chips | AutoLeap | Multi concern before RO create |
| Odometer required | Tekmetric shop settings | Same, gated by `reqOdometer` |
| Marketing source | Tekmetric | Shop settings list |
| Slide-over intake | AutoLeap quick RO | `RoIntakeSheet` (production) |
| Create → Estimate | Both | `createRepairOrder` → `/estimate` |
| Service writer pick | AutoLeap | Default current user; optional select |

---

## Video review notes (fill after watching Snagit captures)

| Video file | Product (assumed) | Key moments | Keep for ShopRally? | Rename / avoid |
|------------|-------------------|-------------|------------------|----------------|
| `7ABF2D71…MP4` | _User to confirm_ | | | |
| `2BBF85F0…MP4` | _User to confirm_ | | | |

---

## Prototype vs production

| | Prototype | Production |
|---|-----------|------------|
| URL | http://localhost:3010 | http://localhost:3004 |
| Path | `prototypes/intake-lab/` | `src/components/repair-order/ro-intake-*` |
| Data | Mock JSON | Prisma + server actions |
| Purpose | UX test without touching dev CRM | Live shop |

After prototype approval, port UX deltas into `RoIntakeForm` / `RoIntakeSheet` only — no drive-by CRM changes.
