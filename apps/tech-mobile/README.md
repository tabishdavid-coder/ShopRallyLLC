# ShopRally for Techs (Expo)

Technician mobile app — iOS + Android companion to ShopRally web CRM.

## Stack

- **Expo SDK 57** + **expo-router** (file-based tabs)
- **TypeScript**
- **EAS Build** for App Store / Play Store (see `eas.json`)
- Auth: `@clerk/expo` (Phase 2)
- API: `GET/POST /api/mobile/v1/*` on ShopRally Next.js backend

## Docs

- Requirements: `../../docs/MOBILE-TECH-APP-REQUIREMENTS.md`
- API contract: `../../docs/MOBILE-TECH-APP-API.md`
- Wireframes: `../../docs/MOBILE-TECH-APP-WIREFRAMES.md`
- Agent track: `../../agents/ShopRallyTechApp/BUILD-STATE.md`

## Local dev

```bash
cd apps/tech-mobile
cp .env.example .env   # optional until Clerk wired
npm start              # Expo dev server — scan QR with Expo Go
```

From repo root:

```bash
npm run mobile:dev
```

**Note:** Camera, push, and Clerk native sign-in require a **development build** (`eas build --profile development`), not Expo Go alone.

## Project layout

```
app/
  (tabs)/          Today · ROs · Scan · Profile
  repair-orders/   RO detail stack screen
src/theme/         ShopRally brand colors
```

## Store IDs (draft)

| Platform | Identifier |
|----------|------------|
| iOS | `com.getshoprally.tech` |
| Android | `com.getshoprally.tech` |

Replace app icons in `assets/` before store submission.

## Nested git

`create-expo-app` may have created a nested `.git` folder here. Remove it so this app is tracked only by the parent `ShopRally` repository:

```powershell
Remove-Item -Recurse -Force apps/tech-mobile/.git
```
