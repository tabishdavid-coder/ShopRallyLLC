# Website Code — build state

Last updated: 2026-07-05 (rethought: ShopSite + CRM conversion)

**Branch:** `main` (Master CRM + website pipeline merged)  
**Agent:** `agents/WebsiteCode/CONTINUE.md`  
**Master spec:** `docs/WEBSITE-CREATION-TASK.md`  
**Forms backend:** `docs/FORMS-HUB-TASK.md` (ShopRallyCRM agent)

---

## Strategic shift (Jul 2025)

ShopSite is no longer **brochure + booking link only**. Every published site should wire **visitor → CRM** via:

- **Book** → `/book/{slug}` → Appointment (exists)
- **Request service** → work request form → **Repair Order (ESTIMATE)** (Forms Hub — ShopRallyCRM)
- **Contact** → NAP + embedded form (rethink contact page)

See phased todos **WEB-A** through **WEB-E** in `docs/WEBSITE-CREATION-TASK.md`.

---

## Done

- [x] **Public ShopSite** — `/sites/[slug]` home, services, contact, sitemap.xml
- [x] **Renderer** — `src/components/website-seo/shop-site.tsx` (hero, services, reviews, booking CTAs, JSON-LD)
- [x] **Shop CRM editor** — `/marketing/website` quote + manage tabs (content, domain, analytics, publish)
- [x] **Master CRM pipeline** — `/platform/websites` list + detail (build status, launch, upkeep)
- [x] **Prisma** — `ShopWebsiteConfig`, `WebsiteBuildStatus` enum + migration
- [x] **Custom domain routing** — middleware + `/api/sites/resolve-host` + CNAME targets
- [x] **Plan gating** — `website_seo` feature, ShopSite launch SKUs in `plans.ts`
- [x] **Platform integration** — KPIs on platform home, shop detail links, batch 4 review archive
- [x] **Competitive gap audit** — website + forms strategy documented

---

## Active sprint — Conversion Hub (priority order)

### Phase A — Schema & data (start here)

- [ ] **WEB-A1** `WebsiteConversionSettings` type + zod — `src/lib/website-seo.ts`
- [ ] **WEB-A2** `conversionSettings Json` on `ShopWebsiteConfig` + migration
- [ ] **WEB-A3** Expose conversion flags + form URLs in `getPublishedShopWebsite()`
- [ ] **WEB-A4** Update `docs/website-seo-service.md` conversion section

*Blocked on ShopRallyCRM:* WEB-A5–A7 (ShopForm models + submit action) — coordinate before Phase B embed

### Phase B — Public ShopSite UI

- [ ] **WEB-B1** Hero dual CTAs (Book + Request service)
- [ ] **WEB-B2** Contact page — embed work request / dual conversion block
- [ ] **WEB-B3** Services page — CTA per service with prefill
- [ ] **WEB-B4** Header nav "Request service" when enabled
- [ ] **WEB-B5** Footer conversion links + form TCPA footnote
- [ ] **WEB-B6** Mobile 375px form UX pass
- [ ] **WEB-B7** JSON-LD `potentialAction` for book + contact

### Phase C — Editor & platform

- [ ] **WEB-C1** Editor **Conversion** tab — `website-seo-editor.tsx`
- [ ] **WEB-C2** Save → sync `ensureDefaultWorkRequestForm(shopId)`
- [ ] **WEB-C3** Overview conversion status chips
- [ ] **WEB-C4** Link to `/marketing/forms` submissions
- [ ] **WEB-C5** Platform launch warn if no conversion path
- [ ] **WEB-C6** Platform detail — conversion URLs in launch summary
- [ ] **WEB-C7** `scripts/smoke-shopsite.ts`

### Phase D — Analytics

- [ ] **WEB-D1** RO source attribution (`website_work_request`)
- [ ] **WEB-D3** GA4 `generate_lead` on form submit
- [ ] **WEB-D4** Auto-SMS acknowledgment (optional)

### Phase E — GTM copy

- [ ] **WEB-E1** `/marketing/website` service page copy refresh
- [ ] **WEB-E2** Platform operator SOP note in `docs/MASTER-CRM.md`

---

## Backlog (deferred — after conversion hub)

- [ ] Draft preview route — `getShopWebsitePreview()` → `/sites/[slug]/preview`
- [ ] Meta editor in ShopSite UI — `metaTitle`, `metaDescription`, `keywords`, `schemaEnabled`
- [ ] Publish demo seed — `/sites/in-and-out-autohaus` works out of the box
- [ ] Production custom domain SSL — document with platform ops
- [ ] Blog / landing builder
- [ ] GBP post sync

---

## Test checklist

| Check | How |
|-------|-----|
| Editor loads | `/marketing/website` with `website_seo` feature |
| Conversion tab | Toggle work request → saves `conversionSettings` |
| Contact form | Submit → RO on job board (needs Forms Hub) |
| Quote → ticket | Request build → `WEBSITE_BUILD` ticket |
| Platform list | `/platform/websites` as platform admin |
| Launch | Platform detail → Launch → `published: true` |
| Live site | `/sites/{slug}` dual CTAs when configured |
| Custom host | `{slug}.sites.localhost` rewrite |

---

## Coordination

| Agent | Owns |
|-------|------|
| **Website Code** | ShopSite UI, editor Conversion tab, platform launch UX, `conversionSettings` |
| **ShopRallyCRM** | `ShopForm`, submit → RO, `/marketing/forms`, `PublicWorkRequestForm` component |
| **SEO Autopilot** | GSC/GA4 metrics, web-sourced RO KPI — ping before editing shared SEO actions |

Do not implement work request **submit logic** in Website Code — consume ShopRallyCRM actions/components.

---

## Allowlist addition (when Forms Hub ships)

```
src/components/forms/public-work-request-form.tsx   # shared embed (ShopRallyCRM creates)
```

Import from ShopSite contact page once WEB-A6 lands.
