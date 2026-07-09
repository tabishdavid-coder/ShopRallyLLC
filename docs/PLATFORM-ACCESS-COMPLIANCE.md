# Platform operator access — compliance

How ShopRally treats **platform admin** access to **Shop CRM** tenant data. Not legal advice — align with counsel-reviewed MSA/DPA.

---

## Two surfaces

| Surface | Data scope | Cross-tenant |
|---------|------------|--------------|
| **Master CRM** (`/platform/**`) | Shops, billing, onboarding, websites, support tickets — **not** a global customer DB | Lists all shops; no unified customer export |
| **Shop CRM** (after **Enter shop**) | **Full tenant** — same effective access as shop Owner | One shop at a time (`shopId` cookie) |

---

## What operators see in Shop CRM

When you enter a live shop, queries scope to `getShopId()` for that tenant. Platform admins receive **`getEffectivePermissions()` → `"all"`** (no role masking).

| Category | Examples | Data tier |
|----------|----------|-----------|
| Customers | Name, phone, email, address, notes | PII (T1) |
| Vehicles | VIN, plate, history | T2 |
| Repair orders & invoices | Lines, totals, advisor notes | T1 + T3 |
| Payments | Amounts, methods, Stripe refs | T3 — **no PAN/CVV** in DB |
| SMS / messages | Full threads | T5 |
| Marketing | Campaigns, opt-in status | T6 |
| Employees, settings, reports | Staff, config, KPIs | Internal / aggregated |

**Not visible in Master CRM without entering:** per-customer lists, RO detail, message bodies at scale across shops.

---

## Controls implemented

1. **Route separation** — `/platform/**` requires `isPlatformAdmin()`; shop staff never see Master CRM.
2. **Tenant isolation** — all shop models filtered by `shopId`; no cross-shop queries in Shop CRM.
3. **Audit on entry** — `switchShop()` records `PlatformAuditEvent` type **`SHOP_CRM_ENTERED`** (operator email, shop, timestamp, source metadata).
4. **Operator UI** — navy **Operator mode** banner on every Shop CRM page; **Master CRM** link in header; entry logged message in banner copy.
5. **PCI** — card data stays in Stripe; forbidden fields documented in `src/lib/data-compliance.ts`.
6. **Shop write audit** — `ShopAuditEvent` for customer/payment/SMS changes (operator actions logged as current user).

---

## Operator obligations

- Enter Shop CRM only for **support, onboarding, website build, billing, or security** — not casual browsing.
- Prefer **Master CRM** when tenant customer records are not required.
- MSA/DPA should disclose that ShopRally platform operators may access tenant data for these purposes.

---

## Audit trail

| Event | Where |
|-------|--------|
| `SHOP_CRM_ENTERED` | `PlatformAuditEvent` — each Enter shop / `switchShop` by platform admin |
| Shop provisioning | `SHOP_CREATED`, `SHOP_INTAKE_SUBMITTED`, `SHOP_ACTIVATED` |
| Tenant data changes | `ShopAuditEvent` on writes while in Shop CRM |

View recent operator entries per shop: **Master CRM → Shops → shop detail → Operator access log** (when wired) or query `PlatformAuditEvent` where `eventType = SHOP_CRM_ENTERED`.

---

## Known gaps (future)

- Read-only operator mode (view without write)
- Purpose / ticket number required before enter
- Shorter-lived shop context cookie for operators
- Shop-visible notification when operator enters (enterprise customers)

---

## Code references

| Piece | Path |
|-------|------|
| Shop switch + audit | `src/server/actions/platform.ts` → `switchShop()` |
| Audit writer | `src/server/platform/shop-crm-access.ts` |
| Permissions bypass | `src/server/permissions.ts` |
| Operator banner | `src/components/shop-context-banner.tsx` → `PlatformShopContextBar` |
| Layout wiring | `src/app/(app)/layout.tsx` |
| Data tiers | `src/lib/data-compliance.ts` |
