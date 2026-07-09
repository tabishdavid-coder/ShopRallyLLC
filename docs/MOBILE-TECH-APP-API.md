# ShopRally for Techs — Mobile API Contract (v1 draft)

**Base path:** `/api/mobile/v1`  
**Auth:** Clerk session token (`Authorization: Bearer <token>`)  
**Tenant:** Resolved from Clerk org → `shopId` (same as web CRM)  
**Role gate:** `technician` or shop roles that include bay access (RBAC — S3-06)  
**Last updated:** 2026-07-07  
**Status:** Draft — endpoints not implemented until web prerequisites land

---

## Conventions

| Rule | Value |
|------|-------|
| Content-Type | `application/json` |
| Errors | `{ "error": { "code": "...", "message": "..." } }` |
| Pagination | `?cursor=` + `{ "data": [], "nextCursor": null }` |
| IDs | CUID strings matching Prisma models |
| Money | Cents (`totalCents`) — display in app |
| Timestamps | ISO 8601 UTC |

---

## 1. Session & device

### `GET /api/mobile/v1/me`

Current user + shop context after Clerk auth.

```json
{
  "user": {
    "id": "usr_...",
    "name": "Tabish David",
    "email": "tech@shop.com",
    "role": "technician"
  },
  "shop": {
    "id": "shop_...",
    "name": "In & Out AutoHaus",
    "timezone": "America/New_York"
  },
  "entitlements": {
    "techApp": true
  }
}
```

**Errors:** `403` if shop subscription inactive or tech app not entitled.

---

### `POST /api/mobile/v1/devices`

Register FCM/APNs push token.

**Body:**
```json
{
  "token": "fcm-or-apns-token",
  "platform": "ios" | "android",
  "deviceName": "iPhone 15"
}
```

**Response:** `{ "deviceId": "dev_..." }`

---

### `DELETE /api/mobile/v1/devices/:deviceId`

Unregister on sign-out.

---

## 2. Today & repair orders

### `GET /api/mobile/v1/today`

Dashboard payload — active timer, counts, priority ROs.

```json
{
  "activeTimer": {
    "entryId": "tce_...",
    "repairOrderId": "ro_...",
    "jobId": "job_...",
    "startedAt": "2026-07-07T14:02:00Z"
  },
  "shiftClock": {
    "entryId": "tce_...",
    "clockedInAt": "2026-07-07T08:00:00Z"
  },
  "repairOrders": {
    "total": 12,
    "assignedToMe": 4,
    "dueToday": 3
  },
  "recentRepairOrders": [ /* RepairOrderSummary[] max 10 */ ]
}
```

---

### `GET /api/mobile/v1/repair-orders`

All shop ROs (owner decision Q2). Supports workflow filtering.

**Query:**

| Param | Description |
|-------|-------------|
| `status` | `ESTIMATE`, `WORK_IN_PROGRESS`, … |
| `columnId` | Job board column id |
| `assignedToMe` | `true` — highlight filter, not exclusive |
| `q` | Search customer, plate, RO # |
| `cursor` | Pagination |

**Response:** `{ "data": [RepairOrderSummary], "nextCursor": "..." }`

**RepairOrderSummary:**
```json
{
  "id": "ro_...",
  "number": 497,
  "status": "WORK_IN_PROGRESS",
  "columnId": "col_...",
  "columnLabel": "In Progress",
  "customerName": "test test",
  "vehicleLabel": "2014 Honda Accord EX-L",
  "plate": "ABC1234",
  "technicianId": "usr_...",
  "technicianName": "Mike",
  "promiseTime": "2026-07-07T17:00:00Z",
  "authorizedAt": "2026-07-07T10:00:00Z",
  "updatedAt": "2026-07-07T13:45:00Z"
}
```

---

### `GET /api/mobile/v1/repair-orders/:id`

Full RO detail for bay work.

```json
{
  "id": "ro_...",
  "number": 497,
  "status": "WORK_IN_PROGRESS",
  "customer": { "id": "...", "name": "...", "phone": "..." },
  "vehicle": { "id": "...", "year": 2014, "make": "Honda", "model": "Accord", "trim": "EX-L", "vin": "...", "plate": "..." },
  "mileageIn": 84200,
  "concerns": ["Brake noise"],
  "notes": "Internal advisor note",
  "jobs": [
    {
      "id": "job_...",
      "name": "Remove & Replace Brake Pads",
      "authorized": true,
      "technicianId": "usr_...",
      "laborLines": [
        { "id": "...", "description": "R&R Brake Pads", "hours": 1.3, "technicianId": "..." }
      ]
    }
  ],
  "inspections": [
    { "id": "insp_...", "templateName": "Basic Safety", "status": "IN_PROGRESS", "itemCount": 24, "completedCount": 8 }
  ],
  "activities": [ /* recent internal notes — optional v1 */ ]
}
```

---

### `PATCH /api/mobile/v1/repair-orders/:id`

Update workflow from the bay.

**Body (partial):**
```json
{
  "status": "WORK_IN_PROGRESS",
  "jobBoardColumnId": "col_...",
  "notes": "Waiting on rear caliper"
}
```

---

## 3. Time clock (requires S3-04)

### `POST /api/mobile/v1/time/shift/clock-in`

**Body:** `{ "note": "optional" }`  
**Response:** `{ "entryId": "...", "clockedInAt": "..." }`

### `POST /api/mobile/v1/time/shift/clock-out`

**Response:** `{ "entryId": "...", "clockedOutAt": "...", "durationMinutes": 480 }`

### `GET /api/mobile/v1/time/shift/current`

**Response:** `{ "clockedIn": true, "entry": { ... } }` or `{ "clockedIn": false }`

---

### `POST /api/mobile/v1/time/job/start`

Start timer on RO / job / labor line.

**Body:**
```json
{
  "repairOrderId": "ro_...",
  "jobId": "job_...",
  "laborLineId": "ll_..."
}
```

**Response:** `{ "entryId": "...", "startedAt": "..." }`

### `POST /api/mobile/v1/time/job/stop`

**Body:** `{ "entryId": "..." }`  
**Response:** `{ "durationMinutes": 45 }`

---

## 4. Inspections / DVI (requires S3-03)

### `GET /api/mobile/v1/repair-orders/:roId/inspections`

List inspections on RO.

### `GET /api/mobile/v1/inspections/:id`

Full template + items with statuses.

### `PATCH /api/mobile/v1/inspections/:id/items/:itemId`

Update finding.

**Body:**
```json
{
  "status": "OK" | "NEEDS_ATTENTION" | "CRITICAL" | "NA",
  "note": "Pad thickness 3mm"
}
```

---

### `POST /api/mobile/v1/inspections/:id/items/:itemId/photos`

Multipart upload or presigned URL flow.

**Option A — presigned (recommended):**

1. `POST .../photos/presign` → `{ "uploadUrl": "...", "photoUrl": "..." }`
2. App PUTs binary to blob storage
3. `POST .../photos/complete` → `{ "photoUrls": ["..."] }`

**Option B — direct multipart** to API (simpler MVP, heavier server).

---

## 5. Internal notes

### `GET /api/mobile/v1/repair-orders/:id/notes`

Team-visible notes / activity feed.

### `POST /api/mobile/v1/repair-orders/:id/notes`

**Body:** `{ "body": "Rear pads metal-to-metal" }`  
**Response:** `{ "id": "...", "createdAt": "...", "authorName": "..." }`

---

## 6. Workflow columns

### `GET /api/mobile/v1/workflow/columns`

Job board columns mirroring web `/workflow`.

```json
{
  "columns": [
    { "id": "core:ESTIMATE", "label": "Estimate", "count": 5 },
    { "id": "col_custom_1", "label": "Waiting Parts", "count": 2 }
  ]
}
```

---

## 7. Implementation order (web team)

| Priority | Endpoint group | Blocked by |
|:--:|----------------|------------|
| P0 | `/me`, auth middleware | S3-06 Clerk |
| P0 | `/repair-orders`, `/repair-orders/:id`, PATCH | Existing Prisma + RBAC |
| P0 | `/workflow/columns` | Job board data |
| P1 | `/time/*` | S3-04 + new `TimeClockEntry` model |
| P1 | `/inspections/*`, photo presign | S3-03 blob storage |
| P1 | `/devices` push tokens | New model + FCM |
| P2 | `/notes` | RoActivity or notes table |

---

## 8. Prisma additions (planned)

```prisma
model MobileDevice {
  id        String   @id @default(cuid())
  shopId    String
  userId    String
  token     String   @unique
  platform  String   // ios | android
  deviceName String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Time clock — align with S3-04 web design
model TimeClockEntry {
  id             String    @id @default(cuid())
  shopId         String
  userId         String
  type           String    // SHIFT | JOB
  repairOrderId  String?
  jobId          String?
  laborLineId    String?
  startedAt      DateTime
  endedAt        DateTime?
  // ...
}
```

---

## Related

- [`MOBILE-TECH-APP-REQUIREMENTS.md`](./MOBILE-TECH-APP-REQUIREMENTS.md)
- [`MOBILE-TECH-APP-WIREFRAMES.md`](./MOBILE-TECH-APP-WIREFRAMES.md)
- [`agents/ShopRallyTechApp/BUILD-STATE.md`](../agents/ShopRallyTechApp/BUILD-STATE.md)
