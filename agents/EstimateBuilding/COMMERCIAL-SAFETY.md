# Estimate Building — Commercial Safety Review

**Date:** 2026-07-04  
**Scope:** Blended Tekmetric + AutoLeap estimate-building lab (`/design-review/estimate-building`)  
**Status:** Isolated preview — not merged to main `/repair-orders/[id]/estimate`  
**References:** [`MENU-LAYOUT-COMMERCIAL-RULES.md`](../Autopilot3030/MENU-LAYOUT-COMMERCIAL-RULES.md), [`COMPLIANCE-GLOSSARY.md`](../Autopilot3030/COMPLIANCE-GLOSSARY.md), [`BUILD-STATE.md`](./BUILD-STATE.md), [`docs/TRADE-DRESS-AUDIT.md`](../../docs/TRADE-DRESS-AUDIT.md)

> **Disclaimer:** This is an internal product/design review, not legal advice. Have qualified counsel review trade dress, trademarks, and go-to-market copy before public launch or paid marketing.

---

## Executive summary

**Verdict: Proceed with isolated lab testing; merge to main Dev 3004 only after the copy checklist below.**

The blended estimate builder combines **industry-standard, functional patterns** (job cards, labor/parts lines, GP metrics, authorization, canned search, breadcrumb labor browse, deposit request) with **ShopRally-owned visual identity** (charcoal + cyan + red tokens, navy CTAs, no competitor teal bar). That combination is generally **low risk** when treated as workflow parity, not pixel cloning.

**Medium risk** concentrates in **exact competitor UI strings** copied from AutoLeap reference videos (`+ Service`, `Search canned services`, `Browse canned services`, `Not yet authorized`, `Service net total`) and in **stacking two competitors’ UX patterns on one screen** without ShopRally glossary labels. These are fixable with copy/IA passes — no architectural rollback required.

**High risk** items are **not present** in the lab today: no competitor logos, no teal trade dress, no MOTOR/Mitchell source tabs in browse UI, no “Tekmetric parity” in shop CRM chrome.

---

## Risk table

| Risk level | Item | Notes | Action |
|---|---|---|---|
| **Low** | Job cards with labor/parts tables, matrix pills, fees/discounts | Universal shop-management data model; tables/lists are functional | Keep — industry standard |
| **Low** | GP$ / GP% / GP/Hr footer on job cards | Standard shop accounting UX | Keep |
| **Low** | Sticky estimate totals bar + Get approval | Common authorization workflow | Keep |
| **Low** | Job-add launcher (Labor Guide, Canned Job, New Job, RO Fee/Discount) | Menu of creation paths is functional; labels are generic industry terms | Keep |
| **Low** | Breadcrumb drill-down in labor/template browse | Category → subcategory → position → operation is functional IA for automotive labor taxonomy | Keep |
| **Low** | Deposit request + public `/deposit/[token]` | Independent feature; not competitor-specific | Keep |
| **Low** | ShopRally palette (charcoal `--brand-navy`, cyan `--brand-light`, red destructive) | Distinct from AutoLeap teal bar and Tekmetric blue-only sidebar story | Keep; never ship competitor teal/green as primary chrome |
| **Low** | Lab isolated on `/design-review/*` | Main estimate tab unchanged until explicit merge approval | Keep isolation until checklist complete |
| **Low** | Internal agent/docs referencing Tekmetric/AutoLeap | Allowed per [`MENU-LAYOUT-COMMERCIAL-RULES.md`](../Autopilot3030/MENU-LAYOUT-COMMERCIAL-RULES.md) for internal design-review | OK in `agents/`, `BUILD-STATE.md`; avoid in shop CRM |
| **Medium** | Toolbar placeholder **"Search canned services"** | Matches AutoLeap Services tab verbatim | Before merge: **"Search service templates"** or glossary **Service Templates** |
| **Medium** | Browse modal title **"Browse canned services"** | AutoLeap modal title match | Before merge: **"Browse service templates"** or **"Browse by system"** |
| **Medium** | Primary CTA **"+ Service"** | AutoLeap exact button label | Before merge: **"+ Add job"**, **"+ Work line"**, or launcher-only (no duplicate CTA) |
| **Medium** | Auth badge **"Not yet authorized"** | AutoLeap per-service authorization phrasing | Before merge: **"Pending approval"** or **"Not on estimate"** |
| **Medium** | Footer label **"Service net total"** | AutoLeap column/footer label | Before merge: **"Job total"** (already used on non-lab variant) or **"Net total"** |
| **Medium** | **Recommended** toggle on job footer | Generic word but AutoLeap-feature placement | Acceptable if paired with ShopRally copy elsewhere; optional rename **"Advisor pick"** |
| **Medium** | Composite UX: AutoLeap toolbar + Tekmetric launcher on same row | Functional blend; risk rises if layout + copy mirror both products simultaneously | Differentiate spacing, ShopRally glossary tab name (**Quote**), and avoid side-by-side competitor-fingerprint chrome |
| **Medium** | Design-review hub strings naming Tekmetric + AutoLeap | Internal `/design-review` only — not shop CRM | OK for lab hub; remove before any customer-visible changelog |
| **Medium** | Terminology drift: **Estimate** tab vs glossary **Quote** / **Work Lines** | 3030 glossary not applied to Dev 3004 estimate lab | On 3030 merge path, adopt [`COMPLIANCE-GLOSSARY.md`](../Autopilot3030/COMPLIANCE-GLOSSARY.md); Dev 3004 may keep **Estimate** if consistently ShopRally-branded |
| **Low** *(fixed)* | Tooltip referenced **"MOTOR-style"** labor categories | MOTOR is a third-party trademark | **Fixed 2026-07-04** → generic "vehicle system and labor category" |
| **High** | *(not present)* Competitor logos, product names in shop CRM UI | Would imply affiliation | Never ship |
| **High** | *(not present)* AutoLeap teal module bar / four-column kanban clone | Documented fingerprint in commercial rules | Do not implement on estimate builder |
| **High** | *(not present)* MOTOR / Mitchell source tabs in browse modal | AutoLeap browse modal fingerprint + trademark | Stub only; use **Shop templates** / **Internal** if added later |
| **High** | *(not present)* "Tekmetric parity" or competitor names in estimate tab hero/toolbar | Marketing/affiliation risk | Ban from production estimate UI |

---

## What is safe (industry standard / functional)

These patterns appear across Tekmetric, AutoLeap, Shopmonkey, Mitchell, Protractor, and legacy desktop shop systems. U.S. courts generally do not protect functional layout, standard CRM tables, or common business metrics alone.

- **Job / service cards** with expandable labor and parts line items
- **Markup matrix** indicators (cost → retail tiers)
- **RO-level fees and discounts** tables
- **Authorization checkboxes** and customer approval links
- **Gross profit** dollar, percent, and per-hour display
- **Canned job / service template** search and add
- **Labor guide** search with category navigation
- **Deposit or prepayment** request before work
- **Assign technician** on a job line
- **Sticky footer totals** with tax breakdown

---

## ShopRally differentiation (current)

| Dimension | ShopRally (lab + Dev 3004) | Competitor fingerprints avoided |
|---|---|---|
| **Palette** | Charcoal primary, cyan accent, red destructive | No AutoLeap teal bar; no Tekmetric-only navy sidebar as sole story |
| **Shell** | Existing ShopRally sidebar + RO workspace (trade dress audit approved 2026-07-03) | Not 3030 command rail yet; not AutoLeap top tab strip |
| **Terminology (production)** | Estimate tab, Repair Order, Smart Jobs, Get approval | 3030 glossary (Quote, Service Ticket, Work Lines) reserved for Autopilot merge |
| **Branding** | ShopRally / RepairPilot wordmark, RP monogram | No competitor marks |
| **Browse modal** | Navy header, ShopRally tokens, "All systems" breadcrumb root | No MOTOR/Mitchell/AutoLeap source tabs (not built) |
| **Data** | Shop-owned canned templates + NHTSA VIN + internal labor tree | No scraped competitor UI assets |

---

## Pre-merge checklist (required before `/repair-orders/[id]/estimate`)

Complete before retiring the lab route or merging toolbar/launcher into main estimate tab.

### Copy (shop CRM — customer-visible)

- [x] Replace **"+ Service"** with ShopRally-owned CTA (e.g. **"+ Add job"** or single launcher entry) — done 2026-07-04
- [x] Replace **"Search canned services"** → **"Search jobs & templates"** — done 2026-07-04
- [x] Replace **"Browse canned services"** modal title → **"Browse job templates"** — done 2026-07-04
- [x] Replace **"Not yet authorized"** → **"Pending approval"** (lab job card variant) — done 2026-07-04
- [x] Use **"Job total"** instead of **"Service net total"** on lab variant (align with non-lab card) — done 2026-07-04
- [x] No **Tekmetric**, **AutoLeap**, **MOTOR**, **Mitchell**, or **"parity"** strings in estimate tab UI, tooltips, or toasts — verified 2026-07-04 (trademarks remain only in JSDoc comments and `/design-review` hub copy)
- [x] Browse tooltip stays generic (no third-party trademark references) — done 2026-07-04

### Visual / IA

- [ ] Confirm estimate toolbar uses **brand-navy** CTAs, not competitor teal/green
- [x] Do not add AutoLeap-style **Estimate \| Invoice** toggle or **four authorization bucket sidebar** without ShopRally layout review — **v5 right rail uses 3 ShopRally buckets + accordion; toggle removed**
- [ ] If adding labor source tabs later, label **Shop library** / **Internal** only — not competitor product names
- [ ] Run [`MENU-LAYOUT-COMMERCIAL-RULES.md`](../Autopilot3030/MENU-LAYOUT-COMMERCIAL-RULES.md) checklist if estimate merge coincides with 3030 shell merge

### Process

- [ ] User sign-off recorded in [`BUILD-STATE.md`](./BUILD-STATE.md)
- [ ] Optional: counsel review if marketing compares ShopRally to named competitors on pricing pages (already uses comparative pricing — separate from estimate UI)

---

## Patents & unique flows

No patents or registered design claims were identified in internal docs for:

- Estimate launcher modal item list
- Canned service breadcrumb browse
- Deposit request token flow

Standard caution: if a competitor publishes **specific wizard copy**, **exact modal paragraph text**, or **unique illustration assets**, do not transcribe verbatim. ShopRally intake blend doc already flags this for vehicle-transfer warnings ([`SHOPRALLY-INTAKE-BLEND.md`](../../prototypes/intake-lab/SHOPRALLY-INTAKE-BLEND.md)).

---

## Code fix applied (2026-07-04)

| File | Change |
|---|---|
| `src/components/estimate-building/estimate-lab-toolbar.tsx` | Removed **MOTOR** trademark from Browse button `title` tooltip |
| `src/components/estimate-building/estimate-lab-canned-search.tsx` | **"Search canned services"** → **"Search jobs & templates"** (placeholder + aria-label) |
| `src/components/estimate-building/estimate-lab-canned-browse-sheet.tsx` | Modal title **"Browse canned services"** → **"Browse job templates"** |
| `src/components/estimate-building/estimate-lab-toolbar.tsx` | CTA **"+ Service"** → **"+ Add job"** |
| `src/components/repair-order/estimate-job-card.tsx` | Lab variant: **"Not yet authorized"** → **"Pending approval"**; **"Service net total"** → **"Job total"** |

---

## Related approvals

| Audit | Status |
|---|---|
| Trade dress Batch 1 (HR-01 … HR-10) | Owner approved 2026-07-03 — [`docs/TRADE-DRESS-AUDIT.md`](../../docs/TRADE-DRESS-AUDIT.md) |
| Estimate Building lab | Isolated — merge pending checklist above |

---

## Overall verdict

**Yes — continue isolated lab testing and merge when the pre-merge copy checklist is complete.**

The approach is **legally defensible as industry workflow convergence** with **ShopRally-specific execution**, provided you:

1. **Do not ship competitor trademarks** in shop CRM UI (fix medium-risk copy before merge).
2. **Keep ShopRally visual identity** — no teal bar, no competitor logos, no "X parity" product copy.
3. **Treat reference videos as functional specs**, not copy-paste sources for labels, warnings, or layout hierarchy.
4. **Get attorney review** before launch marketing that names competitors or before enterprise deals where trade dress claims are more likely.

**Doc path:** `agents/EstimateBuilding/COMMERCIAL-SAFETY.md`
