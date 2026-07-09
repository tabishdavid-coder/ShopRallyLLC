# Tire supplier workflow (Weldon Tire)

Approval-before-buy for website tire deposits. Separate from the normal booking intake (`/book/[slug]`).

## Can we auto-order through Weldon today?

**No.** RepairPilot has no Weldon API integration, credentials, or automated purchase path.

| What exists | What is missing |
|-------------|-----------------|
| `TireOrder` model with deposit + website source | Weldon commercial account API keys |
| `POST /api/tires/intake` — website posts after Stripe deposit | Direct Weldon public REST API (none published) |
| CRM `/tires` list + detail with deposit tracking | Live order submission to Weldon |
| `PENDING_SUPPLIER_APPROVAL` status + approval UI | EDI / Tireweb / Tirewire connection provisioning |
| `WeldonTireService` stub (`src/server/services/weldon.ts`) | Partner onboarding with Mavis/Weldon or aggregator |

### How Weldon ordering works in the industry

- **Weldon Tire** (Mavis wholesale division) sells to commercial accounts via a **B2B portal** ([weldontire.net](https://www.weldontire.net/)) — account number + password, not a self-serve developer API.
- **Tireweb Connections** lists Weldon as a connectable supplier; integration is typically via their team (REST, SFTP, or custom) after the shop has a Weldon account.
- **Tirewire Connections Center** offers a unified API for inventory/pricing/orders across suppliers, but requires a Tirewire access key and per-supplier connection credentials.

To go live, the shop needs to:

1. Confirm an active **Weldon commercial account** (territory rep / Mavis wholesale).
2. Ask Weldon or Tireweb/Tirewire whether **programmatic ordering** is available for that account.
3. Obtain API keys or EDI specs and set env vars (see below).

## Recommended workflow (Tekmetric-class)

```
Website tire form + Stripe deposit
        │
        ▼
POST /api/tires/intake  (source=WEBSITE, depositPaid=true)
        │
        ▼
TireOrder status = PENDING_SUPPLIER_APPROVAL
        │
        ▼
/tires?status=PENDING_SUPPLIER_APPROVAL  (manager queue)
        │
        ├── Approve → approveTireSupplierOrder()
        │              → getWeldonTire().submitOrder(payload)
        │              → status ORDERED (or SCHEDULED if install appt exists)
        │
        └── Reject  → rejectTireSupplierOrder()
                       → status DEPOSIT_RECEIVED + rejection note
```

Nothing is purchased until a manager clicks **Approve & submit order**.

### Approval summary shown to manager

- Customer name, phone, email
- Vehicle YMM/VIN
- Tire size, brand, quantity, type
- Estimated retail total vs deposit received
- Optional supplier wholesale cost (entered at approval time)

## Website → CRM trigger

The marketing site (separate project) should:

1. Collect the long tire intake form.
2. Charge the deposit via Stripe Checkout.
3. `POST` to RepairPilot:

```
POST https://<crm-domain>/api/tires/intake
Headers: x-api-key: <TIRE_INTAKE_API_KEY>   (when env is set)
Body: {
  shopSlug, submissionId, firstName, lastName, phone, email,
  vehicleYear, vehicleMake, vehicleModel, vehicleVin,
  tireSizeFront, tireSizeRear, tireBrand, tireQuantity, tireType,
  dropOffType, estimatedTotalCents, depositCents,
  depositPaid: true, depositMethod: "CARD", depositReference: "<stripe_pi>",
  appointmentDate, appointmentTime, notes
}
```

When `depositPaid: true`, CRM sets status **`PENDING_SUPPLIER_APPROVAL`** (not auto-buy).

Optional future enhancement: Stripe webhook on `checkout.session.completed` could call the same create path or enqueue an Inngest job — today the website POST after payment is the intended hook.

## Environment variables

```env
# Website → CRM intake (optional until website is wired)
TIRE_INTAKE_API_KEY=

# Weldon / aggregator — not available until partner provides credentials
WELDON_API_KEY=
WELDON_API_BASE_URL=   # e.g. Tirewire Connections Center base URL
```

Until `WELDON_API_KEY` is set, `getWeldonTire()` uses **manual mode**: logs the order payload to server console and shows the manager a message to place the order in the Weldon portal.

## Code map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | `TireOrder` + supplier fields, `PENDING_SUPPLIER_APPROVAL` / `ORDERED` statuses |
| `src/app/api/tires/intake/route.ts` | Public website intake API |
| `src/server/actions/tires.ts` | `createTireOrderForShop`, `approveTireSupplierOrder`, `rejectTireSupplierOrder` |
| `src/server/services/weldon.ts` | `WeldonTireProvider` interface + manual/live providers |
| `src/components/tires/tire-order-detail.tsx` | Approval panel on pending orders |
| `/tires?status=PENDING_SUPPLIER_APPROVAL` | Manager approval queue (filter tab) |

## Migration

Apply with:

```bash
npm run db:migrate
# or: npx prisma migrate deploy
npx prisma generate
```

Migration: `20260629120000_tire_supplier_approval`
