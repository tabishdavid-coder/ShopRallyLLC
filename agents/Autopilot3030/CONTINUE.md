# Autopilot Project 3030 — continue prompt

## Context

Isolated CRM preview on **port 3030**. Brand **Autopilot** (not ShopRally UI). Same backend as Dev 3004.

## Start

```bash
npm run dev:3030
```

Open http://localhost:3030/dashboard

## Key files

| Area | Path |
|---|---|
| Shell | `src/components/autopilot3030/shell/autopilot-shell.tsx` |
| Nav IA | `src/lib/autopilot3030/nav.ts` |
| Terminology | `src/lib/autopilot3030/terminology.ts` |
| Theme | `src/app/globals.autopilot3030.css` |
| Brand | `src/lib/autopilot3030/brand.ts`, `/brand/autopilot` |
| Shell gate | `src/lib/autopilot3030/shell-variant.ts` |
| Layout swap | `src/app/(app)/layout.tsx` |

## Rules

1. **Do not deploy** or merge to production without explicit user approval.
2. **Do not change** Prisma schema or server business logic for UI-only work.
3. **Preserve** independent-shop scope (no dealership workflows).
4. **Differentiate** from Tekmetric — structure + copy, not feature parity cloning.
5. Dev 3004 (`npm run dev`) must remain unchanged when `NEXT_PUBLIC_AP_SHELL` is unset.

## Current task

_(paste your task below)_
