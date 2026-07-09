# ShopRally for Techs — Mobile App Requirements

**Track:** Separate from ShopRallyCRM web sprints  
**Agent:** `agents/ShopRallyTechApp/`  
**Phase:** Requirements (v0.1)  
**Last updated:** 2026-07-07  
**Platforms:** iOS (App Store) + Android (Google Play)  
**Audience:** Shop technicians and mobile mechanics — not service advisors or owners in v1

---

## 1. Why this app exists

Technicians lose billable time walking to the front desk, reconstructing hours at end of shift, and missing assignments under a lift. Every major SMS competitor ships a **dedicated tech app** that syncs with the web CRM. ShopRally’s web CRM (Dev 3031) is advisor/operator-first; a tech companion closes the **shop floor parity gap** called out in Sprint 3 and unlocks App Store / Play Store presence.

**Product name (working):** ShopRally for Techs  
**Positioning:** “Everything in your bay — jobs, time, inspections — synced with ShopRally.”

---

## 2. Competitor research (2026-07-07)

### 2.1 Shopmonkey — *Shopmonkey for Techs*

| Area | What they ship |
|------|----------------|
| **Distribution** | Dedicated iOS + Android app; separate from web. Requires active Shopmonkey subscription + same user login. Shopmonkey for Techs 2.0 uses 2.0-only accounts. |
| **Home / dashboard** | Time clock, today’s appointments, personal to-do list, assigned orders. |
| **Work queue** | **My To-Do List** with rich filters (assignee, auth status, RO type, label color) and sort (due date, authorized date, job age, customer name). **My Orders** + **Workflow** columns mirroring web board. |
| **Time** | Clock into general shift, specific service, or labor line. Optional **location tracking** for accountability. Daily/weekly invoiced-work summary. |
| **Capture** | **VIN + license plate scanner** (camera). DVI with photos, video, markup. |
| **Technical data** | **Built-in diagrams, specs, wiring, procedures, fluid info** opened from the RO — light/medium/heavy duty. No third-party plugins marketed. |
| **Collaboration** | Real-time **internal notes** with service writers; create/update customer, vehicle, RO from mobile. |
| **Differentiator** | Deepest **in-app repair information** (diagrams/procedures) + scanner-first bottom nav. |

**Takeaway for ShopRally:** Shopmonkey treats the tech app as a full bay workstation, not just a time clock. Scanner + technical reference + workflow parity are table stakes at the high end.

---

### 2.2 Garage360 — *Technician mobile app*

| Area | What they ship |
|------|----------------|
| **Distribution** | App Store + Google Play; **included with all paid plans** (not tier-gated). |
| **Home** | **Today dashboard** — assigned jobs, active timers, priority tasks in one screen. |
| **Work** | Full **service ticket** access: notes, parts logging, workflow stage moves from the floor. |
| **Time** | One-tap **shift clock-in/out** + **per-job timers** → payroll and job costing automatically. |
| **DVI** | Structured templates; photo + video in-context; instant sync to web dashboard. |
| **Alerts** | **Push notifications** on new assignment, approaching deadline, manager notes. |
| **Capture** | **VIN barcode scan** to pull vehicle records. |
| **Sync** | Real-time bidirectional sync; FAQ calls out tech-only job visibility. |
| **Pain solved (their copy)** | Eliminate desk trips, lost group-chat notes, undocumented inspections, missed assignments. |

**Takeaway for ShopRally:** Garage360 leads with **Today + timers + push** and markets measurable outcomes (payroll disputes down, DVI approval up). Offline capture is a FAQ topic — shops expect it.

---

### 2.3 Torque360 — *Technician mobile app*

| Area | What they ship |
|------|----------------|
| **Distribution** | App Store + Google Play; included in **Turbo + Supercharged plans only** (tier-gated). |
| **Primary wedge** | **Labor profitability** — every clock-in and labor minute tied to the active RO in real time. |
| **Time** | Shift clock-in/out from the bay; **switch between ROs** without front-office trips; digital time replaces end-of-shift reconstruction. |
| **Work** | Assigned ROs after login; job board visibility for owners (in progress / queued / complete). |
| **DVI** | Photos, videos, **voice notes**, measurements on digital inspections. |
| **Portal** | Tech sees job details, customer notes, parts, **personal earnings/productivity**. |
| **Notifications** | New assignment before walking into shop; status changes notify advisors (and customers). |
| **Segments** | Fixed bay + **mobile mechanics / field teams** (remote clock-in). |

**Takeaway for ShopRally:** Torque360’s app is **time-tracking-first** with strong owner visibility narrative. Earnings/productivity view is a tech motivator worth planning for v2.

---

### 2.4 Feature parity matrix

| Capability | Shopmonkey | Garage360 | Torque360 | ShopRally web today | ShopRally app target |
|------------|:----------:|:---------:|:---------:|:-------------------:|:--------------------:|
| Dedicated native app | ✅ | ✅ | ✅ | ❌ | **v1** |
| Today / assigned jobs dashboard | ✅ | ✅ | ✅ | 🟡 Job board (web) | **v1** |
| Workflow status update | ✅ | ✅ | ✅ | ✅ | **v1** |
| Shift time clock | ✅ | ✅ | ✅ | ❌ placeholder | **v1** (after web S3-04) |
| Job / labor timer | ✅ | ✅ | ✅ | ❌ | **v1** |
| DVI photo/video | ✅ | ✅ | ✅ | 🟡 partial | **v1** (after web S3-03) |
| Push — new assignment | ⚠️ | ✅ | ✅ | ❌ | **v1** |
| Internal RO notes | ✅ | ✅ | ✅ | ✅ | **v1** |
| VIN scan | ✅ | ✅ | ⚠️ | 🟡 web | **v1.1** |
| License plate scan | ✅ | ❌ | ❌ | ❌ | **v2** |
| Diagrams / procedures | ✅ | 🟡 tier | 🟡 portal | ❌ MOTOR | **v2+** |
| Location geofence clock-in | ✅ opt | ❌ | ❌ | ❌ | **v2** |
| Tech earnings / productivity | ❌ | ❌ | ✅ | ❌ | **v2** |
| Offline DVI queue | ⚠️ | FAQ | ❌ | ❌ | **v1.1** |
| Included all paid plans | ✅ | ✅ | ❌ mid-tier+ | — | **✅ (goal)** |

---

## 3. ShopRally dependencies (web CRM first)

The mobile app is a **client** to the same API/tenant model as Dev 3031. These web items block a credible v1:

| Web prerequisite | Sprint ref | Mobile dependency |
|------------------|------------|-------------------|
| Time clock MVP (shift + RO/labor link) | S3-04 | Timers, payroll accuracy story |
| Inspection photo upload + persistence | S3-03 | DVI capture |
| Clerk auth + RBAC on mutations | S3-06 | Secure login, tech role scoping |
| Real-time or near-real-time job assignment events | New API | Push notifications |
| Device push token storage | New | FCM + APNs |

**Do not ship App Store listings claiming time clock or DVI until web backends exist.**

---

## 4. Product scope

### 4.1 v1 — MVP (App Store + Play Store launch)

**Goal:** Technician can complete a full bay day without visiting the front desk.

| ID | Requirement | Priority | Notes |
|----|-------------|:--------:|-------|
| M1 | **Auth** — ShopRally login (Clerk); shop tenant selection; tech role only | P0 | Same identity as web |
| M2 | **Today screen** — assigned ROs/jobs, due/priority sort, active timer chip | P0 | Garage360/Torque360 pattern |
| M3 | **RO detail** — customer, vehicle, concern, authorized lines, advisor notes | P0 | Read-heavy |
| M4 | **Workflow actions** — move RO/job stage; mark line complete | P0 | Mirrors web job board |
| M5 | **Time clock** — shift in/out; start/stop timer on RO or labor line | P0 | Requires web S3-04 API |
| M6 | **DVI** — run shop template; capture photos; OK / Needs attention / Critical | P0 | Requires web S3-03 |
| M7 | **Internal notes** — add/view team notes on RO | P0 | Real-time sync nice-to-have |
| M8 | **Push notifications** — new assignment, note from advisor | P0 | FCM + APNs |
| M9 | **Profile / settings** — notification prefs, sign out, app version | P1 | |
| M10 | **Deep link** — notification → RO detail | P1 | |

**Out of v1:** Parts ordering, estimates, customer SMS, payments, owner dashboards, diagrams/MOTOR, plate scan.

### 4.2 v1.1 — Fast follow (30–60 days post-launch)

| ID | Requirement |
|----|-------------|
| M11 | VIN barcode scan → open/create vehicle on RO |
| M12 | Offline DVI queue — capture when Wi‑Fi poor; sync when online |
| M13 | Appointments — today’s schedule with jump to RO |

### 4.3 v2 — Differentiation

| ID | Requirement |
|----|-------------|
| M14 | Tech productivity view — hours billed, jobs completed (Torque360-style) |
| M15 | License plate scan (Shopmonkey parity) |
| M16 | Location-aware shift clock-in (opt-in geofence) |
| M17 | Labor guide / diagrams when MOTOR or equivalent licensed |
| M18 | iPad-optimized layout (Shopmonkey supports iPad) |

---

## 5. Non-functional requirements

| Category | Requirement |
|----------|-------------|
| **Platforms** | iOS 15+; Android 10+ (API 29+) |
| **Performance** | Today screen < 2s on LTE; photo upload progress visible |
| **Security** | Tenant isolation; tech sees assigned ROs only (configurable shop policy) |
| **Privacy** | App Store / Play Data safety forms; camera/mic/location usage strings |
| **Branding** | ShopRally navy / light-blue / red — not competitor teal/orange |
| **Accessibility** | Large tap targets for gloved hands; high contrast outdoors |
| **Reliability** | Graceful degradation when API unavailable; retry on photo upload |
| **Analytics** | Crash reporting (Sentry); anonymized feature usage |

---

## 6. Technical approach — **locked: Expo**

| Decision | Choice |
|----------|--------|
| Framework | **Expo SDK 57** + React Native |
| Routing | **expo-router** (file-based tabs) |
| Store pipeline | **EAS Build** + **EAS Submit** (Shopmonkey-style) |
| OTA hotfixes | **EAS Update** for JS-only patches |
| Auth | **`@clerk/expo`** — same tenant as web CRM |
| Push | **expo-notifications** + FCM/APNs |
| Camera / DVI | **expo-image-picker** v1; **expo-camera** v1.1 VIN |

**Repo layout:**

```
ShopRally/
  apps/
    tech-mobile/          # Expo app (scaffolded)
  docs/
    MOBILE-TECH-APP-API.md
    MOBILE-TECH-APP-WIREFRAMES.md
```

**Backend:** `/api/mobile/v1/*` on Next.js with Clerk bearer tokens.

**Competitor precedent:** Shopmonkey uses React Native + Expo EAS ([Shockoe case study](https://shockoe.com/our-work/shopmonkey/), mobile eng job posting).

**Run locally:** `npm run mobile:dev` from ShopRally root.

---

## 7. App Store & Play Store checklist (launch gate)

| Step | Owner | Status |
|------|-------|:------:|
| Apple Developer Program enrollment | Owner | ☐ |
| Google Play Console enrollment | Owner | ☐ |
| App icons + screenshots (6.7" iPhone, Pixel) | Design | ☐ |
| Privacy policy URL (getshoprally.com) | Legal | ☐ |
| App description + keywords | GTM | ☐ |
| TestFlight + Play internal testing | Eng | ☐ |
| Production API + push certs | Eng | ☐ |

**Listing copy angle:** “ShopRally for Techs — clock time, run inspections, and update jobs from the bay. Syncs with your ShopRally shop.”

---

## 8. Open questions (requirements phase)

| # | Question | Options | Decision |
|---|----------|---------|:--------:|
| Q1 | Include app in **all** paid plans vs tier-gate? | Garage360 (all) vs Torque360 (mid+) | **All paid plans** |
| Q2 | Tech can see **all shop ROs** or assigned-only default? | Assigned-only vs full shop board | **All shop ROs** |
| Q3 | **Offline** scope for v1? | Online-only MVP vs queue DVI | **Online-only v1** |
| Q4 | **Expo** vs native | See §6 | **Expo SDK 57 + EAS** |
| Q5 | Separate app vs unified | Tech-only v1 | **ShopRally for Techs** |
| Q6 | **iPad** support day one? | Phone-first vs iPad | **Phone-first v1** |
| Q7 | Web sprint gate | S3-03 + S3-04 + S3-06 | **Parallel UI; store after S3** |

---

## 9. Success metrics (post-launch)

| Metric | Target (90 days) |
|--------|------------------|
| Tech adoption | ≥ 60% of shops with ≥1 tech install |
| Daily active techs / licensed techs | ≥ 40% |
| Desk trips (self-reported beta) | −25% vs baseline |
| DVI with ≥1 photo | ≥ 70% of inspections via app |
| App Store rating | ≥ 4.5 |

---

## 10. Related docs

- [`SPRINT-ROADMAP-Q3-2026.md`](./SPRINT-ROADMAP-Q3-2026.md) — web S3 shop floor parity
- [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md) — do not over-claim until shipped
- [`agents/ShopRallyTechApp/BUILD-STATE.md`](../agents/ShopRallyTechApp/BUILD-STATE.md) — progress tracker
- [`agents/ShopRallyTechApp/CONTINUE.md`](../agents/ShopRallyTechApp/CONTINUE.md) — agent handoff prompt

---

## 11. Requirement phase exit criteria

- [x] Competitor feature matrix documented
- [x] v1 / v1.1 / v2 scope drafted
- [x] Web dependencies identified
- [x] Open questions Q1–Q7 decided with owner
- [x] Stack decision — **Expo (EAS)**
- [x] API contract sketch for M1–M10
- [x] Design wireframes — Today, RO detail, DVI, timer
- [x] Expo scaffold — `apps/tech-mobile/`
- [ ] Move track to **Phase 2 — MVP build** when Clerk + API P0 land
