# ShopRally for Techs — Wireframes (v1 low-fi)

**Platform:** Expo · phone-first (iOS + Android)  
**Brand:** Navy `#1E3A56` chrome · Azure `#00A9FF` active · Racing orange `#F4581C` CTAs  
**Last updated:** 2026-07-07

---

## Navigation (bottom tabs)

| Tab | Icon | Purpose |
|-----|------|---------|
| **Today** | Home | Dashboard + active timer |
| **ROs** | List / columns | All shop repair orders + workflow |
| **Scan** | Camera | VIN scan placeholder (v1.1 — disabled stub in v1) |
| **Profile** | User | Shift clock, settings, sign out |

*Inspections and timers live inside RO detail — not a top-level tab (matches Garage360 “ticket-first” flow).*

---

## Screen 1 — Today

```
┌─────────────────────────────┐
│ ■ ShopRally    In & Out ▾  │  ← navy header, shop name
├─────────────────────────────┤
│  SHIFT   ● Clocked in 8:02a │  ← tap to clock out
│  JOB     ▶ RO #497 · 0:42   │  ← active timer chip (orange)
├─────────────────────────────┤
│  Today                      │
│  ┌─────────────────────────┐│
│  │ 12 open ROs · 4 mine    ││
│  │ 3 due by 5pm            ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  Priority                   │
│  ┌─────────────────────────┐│
│  │ RO #497 · Honda Accord  ││
│  │ In Progress · Due 5pm   ││
│  │ Mike · ABC1234          >││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ RO #502 · BMW 640i      ││
│  │ Waiting Parts      >    ││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  Today · ROs · Scan · Me    │
└─────────────────────────────┘
```

**Interactions:**
- Tap shift chip → confirm clock out
- Tap job timer → RO detail, timer controls
- Tap RO row → RO detail
- Pull to refresh

---

## Screen 2 — ROs (all shop)

```
┌─────────────────────────────┐
│  Repair Orders    🔍        │
├─────────────────────────────┤
│ [All] [Mine] [WIP] [More ▾] │  ← filters; "All" default (Q2)
├─────────────────────────────┤
│  Workflow                   │
│  Est(5) │ WIP(4) │ Done(3)  │  ← horizontal scroll columns
├─────────────────────────────┤
│  RO #497                    │
│  test test · 2014 Honda     │
│  In Progress · Promise 5pm  │
│  ─────────────────────────  │
│  RO #501                    │
│  ...                        │
├─────────────────────────────┤
│  Today · ROs · Scan · Me    │
└─────────────────────────────┘
```

**Interactions:**
- Column chips filter list
- Search by RO #, customer, plate
- Tap row → RO detail

---

## Screen 3 — RO detail

```
┌─────────────────────────────┐
│  ← RO #497                    │
├─────────────────────────────┤
│  2014 Honda Accord EX-L       │
│  test test · (555) 123-4567   │
│  Plate ABC1234 · 84,200 mi    │
├─────────────────────────────┤
│  [ Start timer ]  [ Move ▾ ]  │  ← orange primary / status menu
├─────────────────────────────┤
│  Concerns                     │
│  • Brake noise at stop        │
├─────────────────────────────┤
│  Jobs                         │
│  □ Remove & Replace Brake Pads│
│     1.3 hr · Authorized       │
│  □ Brake Fluid Flush          │
├─────────────────────────────┤
│  Inspections                  │
│  Basic Safety · 8/24 done  >  │
├─────────────────────────────┤
│  Notes                        │
│  Advisor: Customer wants OEM  │
│  [ Add note...            ]   │
└─────────────────────────────┘
```

**Interactions:**
- Start/stop job timer (links to labor line when assigned)
- Move → workflow status / column picker
- Inspection row → DVI screen
- Add note → POST notes API

---

## Screen 4 — DVI capture

```
┌─────────────────────────────┐
│  ← Basic Safety · RO #497     │
│  Item 9 of 24                 │
├─────────────────────────────┤
│  Front brake pads             │
│                               │
│  [ OK ] [ Attention ] [ Crit ]│  ← large tap targets (gloves)
│                               │
│  Note                         │
│  ┌─────────────────────────┐  │
│  │ Pad at 3mm              │  │
│  └─────────────────────────┘  │
├─────────────────────────────┤
│  Photos                       │
│  [📷 Take photo]  [thumb][+]  │
├─────────────────────────────┤
│  ← Prev          Next →       │
└─────────────────────────────┘
```

**Interactions:**
- Status buttons save on tap (online-only v1)
- Camera opens native picker (`expo-image-picker`)
- Upload progress bar per photo
- Prev/Next walks checklist

---

## Screen 5 — Profile / shift

```
┌─────────────────────────────┐
│  Tabish David                 │
│  tech@shop.com · In & Out     │
├─────────────────────────────┤
│  Shift                        │
│  Clocked in since 8:00 AM     │
│  [ Clock out ]                │
├─────────────────────────────┤
│  Notifications        On   >  │
│  App version          1.0.0   │
│  Sign out                     │
└─────────────────────────────┘
```

---

## v1 stubs

| Element | v1 behavior |
|---------|-------------|
| Scan tab | “Coming soon — VIN scan” placeholder |
| Offline | Banner: “No connection — connect to save work” |
| iPad | Phone layout scaled (v2 dedicated layout) |

---

## Related

- [`MOBILE-TECH-APP-API.md`](./MOBILE-TECH-APP-API.md)
- [`MOBILE-TECH-APP-REQUIREMENTS.md`](./MOBILE-TECH-APP-REQUIREMENTS.md)
