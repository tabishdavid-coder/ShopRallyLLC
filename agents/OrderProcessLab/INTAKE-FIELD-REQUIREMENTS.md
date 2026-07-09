# ShopRally estimate-first intake — field requirements (v2.1)

**Update:** Sub-intake forms at AutoLeap detail level. **Concern + odometer are mandatory** before first job.

---

## Hard requirements (initial RO build)

| Field | Required | Notes |
|-------|----------|-------|
| Customer | **Yes** | Full sub-intake form or search select |
| Vehicle | **Yes** | Plate/VIN lookup or YMM + details |
| Customer concern | **Yes** | ≥1 chip; blocks Services until set |
| Odometer in | **Yes** | Numeric **or** “Odometer not working” |
| Lead source | Shop config | Default Walk-in in mockup |

**Gate:** `canQuote = customer && vehicle && concern && (odometer || odometerNA)`

No first job save until gate passes. Server should enforce same on `createDraftRepairOrder` PATCH.

---

## Customer sub-intake (parity target)

Maps to production `AddCustomerDialog` + `customer-form-shared`:

| Section | Fields |
|---------|--------|
| Type | Person / Business toggle |
| Contact | First*, Last* (or Business name*), Phone, Phone type, Email |
| Address | Line 1, City, State, ZIP |
| Communication | Transactional SMS, Marketing email (TCPA) |
| Tags | Optional tag picker |
| Notes | Internal notes (collapsible) |

**Minimum save validation:** Person → first + last + phone. Business → company + phone.

---

## Vehicle sub-intake (parity target)

Maps to production `AddVehicleDialog` + `create-vehicle-form`:

| Tab | Purpose |
|-----|---------|
| Lookup | Plate or VIN + state → decode |
| Select | Year → Make → Model → Trim (catalog) |
| Custom | Manual YMM + VIN/plate |
| Details step | Engine, transmission, color, unit #, notes |

**Minimum save validation:** Year + make + model (or successful decode).

Vehicle form **mileage field optional** — RO odometer lives on intake strip (single source for visit).

---

## Estimate identity strip (after subforms)

```
CHECKLIST  Customer*  Vehicle*  Concern*  Odometer*
⌕ Search…                                    [+ Add customer]
[Customer chip ✎]  [Vehicle chip ✎]
Concern*  [________________]  [chip ×]
Odometer* [________] mi  ☐ Odometer not working   Lead [Walk-in ▾]
```

---

## Production mapping

| Mockup | Production component |
|--------|---------------------|
| Customer modal | `add-customer-dialog.tsx` |
| Vehicle modal | `add-vehicle-dialog.tsx` |
| Concern chip | `ro-intake-form` concern logic → estimate identity bar |
| Odometer | `MileageInDialog` fields inline + `updateRepairOrderMileage` |
| Gate | New `EstimateIntakeBar` component |

---

## Test mockup

`prototype/estimate-first-intake.html` — updated with full subforms + required concern/odo.
