# Marketing UI bar — how to judge output

**Last updated:** 2026-07-21 (compare hub redesign shipped)  
**Agent rule:** `.cursor/rules/marketing-ui-wow-bar.mdc`  
**Base design rule:** `.cursor/rules/design-quality-bar.mdc`  
**Claims / pricing truth:** `docs/GROWTH-POSITIONING.md`

## What “good” looks like

Public marketing pages (home, pricing, compare, features, launch, demo, mega-menu) should feel as intentional and engaging as a top shop-CRM competitor’s marketing — especially AutoLeap-style **compare hubs** — while staying unmistakably ShopRally (navy / light-blue / red). Never copy AutoLeap teal.

A strong page usually has:

1. **A product visual as the hub** — real UI, dominant, not a postage-stamp inset  
2. **Competitive context** when the page is about switching — logos and/or VS cards, not only a link list  
3. **Honest, helpful copy first** — then a clear demo / founding-seat CTA  
4. **Scannable structure** — you can “get it” in a few seconds without reading every paragraph  

## Quick PR / agent checklist

| Check | Pass | Fail |
|-------|------|------|
| Looks like a deliberate redesign | New composition / hierarchy | Same layout, new colors |
| Product proof | Large UI screenshot or faithful mock as focal point | Icons-only or tiny inset |
| Compare / alternatives | VS-style cards or visual framing | Flat link list + table only |
| Brand | Navy / light-blue / red | Teal, purple SaaS defaults |
| Trust | Reciprocity + accurate claims | Hype that contradicts positioning |
| CTA | Obvious primary action | Buried or missing |

**Litmus test:** *Could this sit next to AutoLeap’s Comparisons page and feel equally intentional?* If no, send it back — and say what’s missing.

## Scope

**In:** `src/app/(marketing)/`, `src/components/marketing-site/`, `src/components/pricing/`  
**Out:** Shop CRM UI, tenant ShopSite microsites, platform admin

## Known gap (as of 2026-07-21)

**Hub (`/compare`):** Redesigned 2026-07-21 — split SEO hero + product credibility hub, competitor name-mark chips, VS comparison cards (navy/light-blue/red). Passes structural wow-bar litmus for compare.

**Competitor articles (2026-07-21):** Split hero + navy/slate VS visual, at-a-glance chips, choose-if cards, styled capability table, pricing callout, bottom CTA band. Copy is matchup-specific (see `docs/COMPARE-ACCURACY.md`). Real competitor logo assets not in repo (text marks used).
