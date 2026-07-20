---
name: website-code
description: >-
  Website Code agent — ShopSite public microsites, /marketing/website editor,
  /platform/websites pipeline, custom domain routing. Use when working on
  customer websites, ShopSite, /sites routes, or website-seo components.
---
# Website Code (ShopSite)

Read `agents/WebsiteCode/BUILD-STATE.md` for current progress.

## Owns

- **Public:** `src/app/sites/**`, `src/components/website-seo/shop-site.tsx`
- **Shop editor:** `/marketing/website`
- **Platform ops:** `/platform/websites/**`
- **Server:** `src/server/website-seo.ts`, `website-seo.ts` actions, `website-build-pipeline.ts`

## Dev

- Port **3004** — `npm run dev`
- Demo slug: `in-and-out-autohaus` (unpublished in seed until Launch/Publish)

## Coordination

- **SEO Autopilot** — GSC, crawl, `seo-automation/**` (shared domain actions)
- **ShopRallyCRM** — shop shell; don't refactor CRM chrome here
- **Not ShopSite:** `src/app/(marketing)/` = getShopRally.com product marketing

## Docs

- `docs/website-seo-service.md`
- Agent prompt: `agents/WebsiteCode/CONTINUE.md`
