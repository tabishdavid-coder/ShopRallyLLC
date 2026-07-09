# Website Creation — Rethought Task (ShopSite + CRM Conversion)

**Status:** Planning — supersedes brochure-only website backlog  
**Created:** 2026-07-05  
**Last updated:** 2026-07-05  
**Strategy:** [`COMPETITIVE-GAP-STRATEGY.md`](./COMPETITIVE-GAP-STRATEGY.md) · [`FORMS-HUB-TASK.md`](./FORMS-HUB-TASK.md)  
**Agents:** Website Code (`agents/WebsiteCode/`) · ShopRallyCRM (Forms Hub backend)

---

## Problem with the old model

ShopSite v1 was built as **marketing brochure + SEO checklist + booking link**:

```
Visitor → /sites/{slug} → read content → "Book Now" → /book/{slug} → Appointment
```

**What's missing:**

| Gap | Shop pain | Competitor |
|-----|-----------|------------|
| No **Request a quote** on site | Shops use Jotform beside CRM | Shopmonkey Work Request → Estimate |
| Booking ≠ RO on job board | Advisor still creates estimate manually | Shopmonkey auto-creates Estimate |
| Website and forms are separate products | Double entry, broken audit trail | Kukui overlay + Tekmetric |
| Platform build pipeline doesn't wire conversion | Launched sites look good but don't feed CRM | — |
| SEO score ignores conversion | Checklist stops at "booking linked" | — |

**New thesis:** A shop website is not a brochure — it is the **top of the CRM funnel**. Every published ShopSite must offer at least one path that creates **actionable shop data** (Appointment or Repair Order), not just page views.

---

## Rethought product: ShopSite as Conversion Hub

### Three visitor intents (every site should support)

| Intent | Visitor says | CRM artifact | Priority |
|--------|--------------|--------------|----------|
| **Schedule** | "I know when I can come in" | `Appointment` (+ optional RO) | ✅ Exists — `/book/{slug}` |
| **Request quote** | "What's wrong / what will it cost?" | `RepairOrder` (ESTIMATE) | ❌ **Forms Hub Sprint 2** |
| **Contact** | "I'll call or email" | NAP + optional callback form | ⚠️ Static contact only today |

### Target funnel (after build)

```
                    ┌─────────────────────────────────────┐
                    │     ShopSite /sites/{slug}          │
                    │  Hero · Services · Reviews · NAP    │
                    └───────────┬─────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   [Book appointment]   [Request service]      [Call / Map]
          │                     │
          ▼                     ▼
   /book/{slug}         /forms/{slug}/work-request
          │                     │
          ▼                     ▼
   Appointment            Customer + Vehicle + RO (ESTIMATE)
          │                     │
          └──────────┬──────────┘
                     ▼
              Job board / Calendar
                     ▼
              Advisor builds estimate
```

**Differentiator vs Tekmetric/AutoLeap:** Website + work request + booking + CRM in **one tenant** — no Jotform, no Kukui overlay.

**Differentiator vs Shopmonkey:** Same work-request → RO, **plus** native ShopSite, SEO Autopilot, platform build pipeline, and maintenance programs.

---

## Architecture changes

### 1. `ShopWebsiteConfig` — conversion settings (new JSON field)

Add to schema (migration in Website Code + ShopRallyCRM coordination):

```prisma
// On ShopWebsiteConfig
conversionSettings Json? @default("{}")
```

**Shape (`WebsiteConversionSettings`):**

```typescript
{
  primaryCta: "book" | "work_request" | "both";  // hero button priority
  workRequestEnabled: boolean;
  workRequestFormSlug: string;                    // default "work-request"
  bookingEnabled: boolean;                      // mirrors Shop.onlineBookingEnabled
  showWorkRequestOnContact: boolean;
  showWorkRequestOnServices: boolean;
  servicePageCta: "book" | "work_request" | "both";
  postSubmitMessage?: string;
}
```

- [ ] Add `conversionSettings` to Prisma + migration
- [ ] Zod schema in `src/lib/website-seo.ts`
- [ ] Server read/write in `website-seo.ts` / `actions/website-seo.ts`

### 2. Public routes (new)

| Route | Purpose |
|-------|---------|
| `/sites/[slug]/contact` | NAP + **embedded work request** OR book CTA (config-driven) |
| `/sites/[slug]/request-service` | Full-page work request (optional alias → forms route) |
| `/forms/[shopSlug]/[formSlug]` | Forms Hub public submit (ShopRallyCRM owns) |
| `/book/[slug]` | Existing booking (unchanged) |

**Embed option:** iframe or shared React component from Forms Hub — prefer **shared component** for brand match.

### 3. Shop editor — new **Conversion** tab

`/marketing/website` → tab **Conversion** (between Content and Domain):

- [ ] Toggle: Online booking (links existing booking settings)
- [ ] Toggle: Work request form (creates/enables default `ShopForm` on save)
- [ ] Primary hero CTA: Book | Request service | Both (dual buttons)
- [ ] Preview links: live booking URL, work request URL
- [ ] Copy embed snippet for external WordPress site
- [ ] Checklist item auto-complete when work request enabled

### 4. Platform build pipeline — conversion is a launch requirement

When platform operator **Launches** a site (`/platform/websites`):

- [ ] Launch checklist includes: booking OR work request enabled (at least one)
- [ ] Auto-provision default `ShopForm` type `WORK_REQUEST` if missing
- [ ] Operator notes template: "Conversion wired: book + work request"
- [ ] KPI on platform home: % published sites with conversion enabled

### 5. SEO checklist updates

Add to `SEO_CHECKLIST` in `src/lib/website-seo.ts`:

| ID | Label | Auto |
|----|-------|------|
| `work_request_enabled` | Work request form live on site | ✅ when form enabled |
| `conversion_primary_cta` | Hero CTA configured (not default-only) | ✅ when non-default |
| `web_sourced_ro` | At least one RO from web form (28d) | ✅ from analytics |

Update default hero subtext when work request enabled:
> "Book online or request a quote — we'll get back to you with an estimate."

---

## Phased todos

### Phase A — Spec & schema (Week 1, both agents)

**Website Code**

- [ ] **WEB-A1** Create `WebsiteConversionSettings` type + zod in `src/lib/website-seo.ts`
- [ ] **WEB-A2** Prisma `conversionSettings` on `ShopWebsiteConfig` + migration
- [ ] **WEB-A3** Extend `getPublishedShopWebsite()` to expose conversion flags + form URLs
- [ ] **WEB-A4** Document in `docs/website-seo-service.md` (conversion section)

**ShopRallyCRM (Forms Hub)**

- [ ] **WEB-A5** `ShopForm` + `ShopFormSubmission` models — see `FORMS-HUB-TASK.md`
- [ ] **WEB-A6** `submitWorkRequestForm` → Customer + Vehicle + RO (ESTIMATE)
- [ ] **WEB-A7** `ensureDefaultWorkRequestForm(shopId)` — idempotent seed for new/existing shops

### Phase B — Public ShopSite UI (Week 2, Website Code)

- [ ] **WEB-B1** Hero dual CTAs: "Book now" + "Request service" per `conversionSettings`
- [ ] **WEB-B2** Contact page: embed work request form OR prominent link (replace book-only block)
- [ ] **WEB-B3** Services page: per-service CTA → work request with `?service=` prefill
- [ ] **WEB-B4** `ShopSiteHeader` nav: add "Request service" when enabled
- [ ] **WEB-B5** Footer: conversion links + TCPA disclosure footnote on forms
- [ ] **WEB-B6** Mobile: stack CTAs; form usable at 375px without horizontal scroll
- [ ] **WEB-B7** JSON-LD: add `potentialAction` for booking + contact (schema.org)

### Phase C — Shop editor & platform (Week 2–3)

**Shop editor**

- [ ] **WEB-C1** Conversion tab in `website-seo-editor.tsx`
- [ ] **WEB-C2** Save toggles → update `ShopWebsiteConfig` + call `ensureDefaultWorkRequestForm`
- [ ] **WEB-C3** Overview tab: conversion status chips (Booking ✓ / Work request ✓)
- [ ] **WEB-C4** Link to `/marketing/forms` submissions list (when Forms Hub UI exists)

**Platform pipeline**

- [ ] **WEB-C5** Launch gate: warn if no conversion path enabled
- [ ] **WEB-C6** Platform detail: show conversion URLs in launch summary
- [ ] **WEB-C7** `scripts/smoke-shopsite.ts` — assert work request route 200 when enabled

### Phase D — Analytics & SEO Autopilot tie-in (Week 3–4)

- [ ] **WEB-D1** Attribute RO source: `marketingSource: "website_work_request"` | `"website_booking"`
- [ ] **WEB-D2** SEO Autopilot **Business impact** card: web-sourced ROs count (already partially in docs)
- [ ] **WEB-D3** GA4 event: `generate_lead` on work request submit (when GA ID set)
- [ ] **WEB-D4** Campaign automation: optional auto-SMS "We received your request" on submit

### Phase E — Managed build service reposition (GTM)

- [ ] **WEB-E1** Update `/marketing/website` quote page copy — "Sites that create repair orders, not just traffic"
- [ ] **WEB-E2** Platform operator SOP: every build includes work request + booking setup
- [ ] **WEB-E3** `GROWTH-POSITIONING.md` pillar: website + forms unified
- [ ] **WEB-E4** Sales one-pager: vs Kukui overlay + vs Shopmonkey (website gap)

---

## Coordination matrix

| Work | Owner agent | Depends on |
|------|-------------|------------|
| `ShopForm` models + submit action | ShopRallyCRM | — |
| `conversionSettings` schema | Website Code | — |
| Public form component on ShopSite | Website Code | WEB-A6 submit action |
| Conversion editor tab | Website Code | WEB-A2, WEB-A7 |
| `/marketing/forms` admin | ShopRallyCRM | WEB-A5 |
| RO source attribution | ShopRallyCRM | WEB-A6 |
| Platform launch checklist | Website Code | WEB-C1 |

**Rule:** Website Code may import `PublicWorkRequestForm` from `src/components/forms/` once ShopRallyCRM creates it — add to Website Code allowlist when ready.

---

## Default templates (platform build)

When platform launches a new shop site, auto-seed:

1. **Hero** — city + trust headline (existing defaults)
2. **Services** — 4 default blocks (existing)
3. **Booking** — enable if shop has hours configured
4. **Work request form** — enable with shop name in confirmation message
5. **Primary CTA** — `both` (Book + Request service)
6. **SEO** — meta + schema on

Operator can override in platform detail before Launch.

---

## Test plan

1. Enable work request in editor → contact page shows form, not just "Book now"
2. Submit work request from `/sites/{slug}/contact` → RO in Estimates column within 30s
3. Submit with existing customer phone → match customer, new RO
4. Hero shows dual CTAs when `primaryCta: "both"`
5. Service page link `?service=Brake+Service` → concern pre-filled
6. Site without work request → legacy behavior (book only) unchanged
7. Platform launch blocked/warned when neither booking nor work request enabled
8. SEO checklist shows `work_request_enabled` ✓

---

## Success metrics

- **Product:** 80% of published ShopSites have ≥1 conversion path beyond phone
- **Sales:** Demo work request → RO in under 2 minutes on live site
- **Ops:** Platform build SOP includes conversion wiring — no post-launch Jotform
- **SEO:** "Web-sourced ROs" visible in Growth Engine dashboard

---

## Out of scope (this task)

- Full drag-and-drop page builder
- Blog / landing page factory
- WordPress plugin (embed snippet only)
- Custom form field builder UI (v2 — use 5 templates in Forms Hub)
- Replacing managed quote request for **ShopRally** to build the site (still supported)

---

## Related docs

| Doc | Role |
|-----|------|
| [`FORMS-HUB-TASK.md`](./FORMS-HUB-TASK.md) | Work request backend + admin |
| [`GROWTH-POSITIONING.md`](./GROWTH-POSITIONING.md) | Sales copy |
| [`website-seo-service.md`](./website-seo-service.md) | Original ShopSite architecture |
| [`agents/WebsiteCode/BUILD-STATE.md`](../agents/WebsiteCode/BUILD-STATE.md) | Website agent sprint queue |
