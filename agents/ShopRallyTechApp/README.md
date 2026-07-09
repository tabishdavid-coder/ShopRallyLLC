# ShopRallyTechApp agent

**ShopRally for Techs** — native iOS + Android companion for shop technicians.

## Quick start

1. Workspace root must be **`ShopRally/`**
2. Read requirements: `docs/MOBILE-TECH-APP-REQUIREMENTS.md`
3. New Cursor chat → name it **ShopRallyTechApp**
4. Paste `CONTINUE.md` as the first message, then add your task

## What this agent owns

| In scope | Out of scope (other agents) |
|----------|----------------------------|
| Mobile app requirements, API contract, Expo/RN app | Web CRM features (ShopRallyCRM) |
| App Store + Play Store submission prep | Marketing site (WebsiteCode) |
| Push notifications, mobile auth | Estimate Lab merge (EstimateBuilding) |
| Tech UX — Today, timers, DVI capture | Platform MSO console |

## Files in this folder

| File | Purpose |
|------|---------|
| `CONTINUE.md` | Master agent prompt — paste into new ShopRallyTechApp chats |
| `BUILD-STATE.md` | Living progress tracker |
| `README.md` | This file |

## Phase model

| Phase | Focus | Status |
|-------|-------|:------:|
| **0 — Requirements** | Competitor research, scope, open questions | **Active** |
| **1 — API & design** | Mobile API routes, wireframes, stack decision | ☐ |
| **2 — MVP build** | Expo app M1–M10 | ☐ |
| **3 — Beta** | TestFlight + Play internal | ☐ |
| **4 — Store launch** | Public listing | ☐ |

## Web blockers (ShopRallyCRM Sprint 3)

Mobile v1 cannot ship credibly until:

- S3-03 Inspection photo upload
- S3-04 Time clock MVP
- S3-06 Clerk + RBAC

Coordinate with ShopRallyCRM agent — do not duplicate web work here.
