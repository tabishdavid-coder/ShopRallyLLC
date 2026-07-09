# ShopRallyTechApp — Build State

**Last updated:** 2026-07-07  
**Phase:** 1 — API & design (Expo scaffold started)  
**Requirements doc:** [`docs/MOBILE-TECH-APP-REQUIREMENTS.md`](../../docs/MOBILE-TECH-APP-REQUIREMENTS.md)

---

## Progress summary

| Phase | Status | Notes |
|-------|:------:|-------|
| 0 — Requirements | ✅ Complete | All Q1–Q7 locked; Expo chosen |
| 1 — API & design | 🟡 In progress | API + wireframes drafted; Expo shell in `apps/tech-mobile/` |
| 2 — MVP build | ☐ Not started | Clerk + live API integration |
| 3 — Beta | ☐ Not started | TestFlight / Play internal |
| 4 — Store launch | ☐ Not started | |

---

## Owner decisions (locked)

| # | Question | Decision | Date |
|---|----------|----------|------|
| Q1 | App included in all paid plans? | **Yes** | 2026-07-07 |
| Q2 | Assigned ROs only vs all shop ROs? | **All shop ROs** | 2026-07-07 |
| Q3 | Offline DVI in v1? | **No** — online MVP; queue v1.1 | 2026-07-07 |
| Q4 | Expo vs native? | **Expo SDK 57 + expo-router + EAS** | 2026-07-07 |
| Q5 | Separate app vs unified? | **Tech-only — ShopRally for Techs** | 2026-07-07 |
| Q6 | iPad day one? | **Phone-first v1** | 2026-07-07 |
| Q7 | Web sprint gate before store ship? | **Parallel UI now; ship after S3-03/04/06** | 2026-07-07 |

---

## Phase 0 checklist

| ID | Task | Done |
|----|------|:----:|
| R0-01 | Competitor research — Shopmonkey for Techs | ✅ |
| R0-02 | Competitor research — Garage360 mobile | ✅ |
| R0-03 | Competitor research — Torque360 technician app | ✅ |
| R0-04 | Feature parity matrix vs ShopRally web | ✅ |
| R0-05 | v1 / v1.1 / v2 scope drafted | ✅ |
| R0-06 | Web dependency map (Sprint 3) | ✅ |
| R0-07 | Agent track created | ✅ |
| R0-08 | Owner decisions Q1–Q7 | ✅ |
| R0-09 | Stack — **Expo** | ✅ |
| R0-10 | Mobile API contract sketch | ✅ → [`MOBILE-TECH-APP-API.md`](../../docs/MOBILE-TECH-APP-API.md) |
| R0-11 | Wireframes (4 core screens) | ✅ → [`MOBILE-TECH-APP-WIREFRAMES.md`](../../docs/MOBILE-TECH-APP-WIREFRAMES.md) |
| R0-12 | App Store / Play listing draft copy | ☐ |

---

## Phase 1 checklist

| ID | Task | Done |
|----|------|:----:|
| P1-01 | Expo app scaffold `apps/tech-mobile/` | ✅ |
| P1-02 | Tab shell (Today, ROs, Scan, Profile) | ✅ |
| P1-03 | ShopRally brand colors in app | ✅ |
| P1-04 | `eas.json` build profiles | ✅ |
| P1-05 | Remove nested `apps/tech-mobile/.git` | ☐ |
| P1-06 | Replace placeholder icons with ShopRally mark | ☐ |
| P1-07 | ShopRallyCRM: implement `/api/mobile/v1/me` stub | ☐ |
| P1-08 | `@clerk/expo` auth flow | ☐ |
| P1-09 | EAS project link + dev build smoke | ☐ |

---

## Expo project

| Item | Value |
|------|-------|
| Path | `apps/tech-mobile/` |
| Run | `npm run mobile:dev` from ShopRally root |
| Slug | `shoprally-for-techs` |
| iOS bundle | `com.getshoprally.tech` |
| Android package | `com.getshoprally.tech` |

---

## Web CRM dependencies (ShopRallyCRM)

| Sprint item | Needed for mobile | Web status |
|-------------|-------------------|:----------:|
| S3-03 Inspection photo upload | DVI | ☐ |
| S3-04 Time clock MVP | Timers | ☐ |
| S3-06 Clerk + RBAC | Auth | ☐ |
| New: `/api/mobile/v1/*` | All live data | ☐ |
| New: push token API | Notifications | ☐ |

---

## Next actions

1. Remove nested `.git` in `apps/tech-mobile/` (see app README)
2. **ShopRallyCRM:** Implement mobile API P0 routes (see API doc §7)
3. Wire `@clerk/expo` + `EXPO_PUBLIC_API_BASE_URL`
4. EAS dev build when camera/push needed

---

## Session log

| Date | Notes |
|------|-------|
| 2026-07-07 | Track created; competitor research; Q1/Q2/Q5 locked |
| 2026-07-07 | Expo locked; API + wireframes; Expo scaffold with tab shell |
