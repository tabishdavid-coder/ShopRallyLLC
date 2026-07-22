# Changelog

All notable changes to this project are documented in this file.

## Site audit 2026-07-21

### User-visible

- Restored Ignition pricing to **$99.99/mo** · **$94.99/mo** annual (branch had drifted to $89.99 / $84.99 in meta and plan cents).
- Clarified Ignition packaging: **two-way SMS** and **Carfax** called out in pricing, meta, JSON-LD, market positioning, and compare hub — not listed as Pro+-only “coming later.”
- Demo honesty: CTAs say **See** the walkthrough (not “Watch”); login secondary is **See the walkthrough** (not “Book a demo”); hero board badge is **Preview** with **See the walkthrough** (not “Live” / “Try the live board”).
- Softened migration copy to **priority cutover help** (no “free full history” overclaim).
- Softened anonymous testimonial metrics (removed unverifiable 3× / +28% style claims on the committed home spine).
- Corrected competitor benchmark helpers (Shopmonkey Basic **$239**, Tekmetric Start **$199**).
- Fixed legal page titles that doubled “— ShopRally.”
- Waitlist compact form now shows server/validation errors; waitlist and demo forms guard against double-submit.
- Open Graph image (`/opengraph-image`) returns a real PNG again for share previews.
- Compare hub meta includes **ARI** alongside other alternatives.

### Internal trail (not user-facing)

- Branch: `audit/site-20260721`
- Scaffold + Agents 1–5 findings in `audit/FINDINGS.md`, `audit/CLAIMS.md`, `audit/AUDIT-REPORT.md`
- Lighthouse on `/`: Perf **78** / A11y **96** / SEO **100** (`audit/_a4-lighthouse.json`)
- Closeout: Agent 6 finalize commit `[A6-CLOSE, P3]`
