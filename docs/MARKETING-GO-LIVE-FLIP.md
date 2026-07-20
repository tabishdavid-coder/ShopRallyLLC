# Marketing go-live flip (Phase B)

**Phase 1 website live (ops):** [`MARKETING-SITE-GO-LIVE.md`](./MARKETING-SITE-GO-LIVE.md) — deploy marketing + waitlist on getShopRally.com with CRM locked until Clerk. This flip doc is **Phase B only** (CTA / `preLaunch` change).

**Phase A (done):** Pre-launch CTAs reserve founding seats (not instant access). Ignition naming on public pricing/signup. Platform admin removed from marketing footer. Waitlist destinations stay while `preLaunch: true`.

**Launch window:** Public copy says **Q4 2026**, **50 founding spots**, and **not available yet** — flip `preLaunch` only when self-serve is real.

**Easy-start psychology (2026-07-19):** `/launch` uses `EasyStartPath` (friction picks → value mirror → one email) with goal-gradient progress, smart defaults, reciprocity before ask. Home shows product preview before the email capture.

**Phase B:** Flip when Ignition self-serve / trial intake is ready — then **stop marketing polish** and resume product go-live ([`docs/IGNITION-GO-LIVE.md`](./IGNITION-GO-LIVE.md)).

## Checklist

1. Set `MARKETING_LAUNCH.preLaunch = false` in [`src/lib/marketing-launch.ts`](../src/lib/marketing-launch.ts)
2. Confirm primary CTA resolves to **Start now** → `/signup` via `marketingPrimaryHref(false)`
3. Announcement bar auto-hides when `preLaunch` is false (or switch copy to “Founding pricing still available” if you keep a bar)
4. Risk-reversal under CTAs: `marketingPrimaryHint(false)` → **14-day trial · no card required** (only if product truth matches)
5. Pricing card + header + footer use the same helpers (no local “Subscribe” / “Start free trial” strings)
6. Smoke: home → pricing → **Start now** → form success; mobile header CTA; `/launch` can redirect or soft-land to `/signup`

## After flip

Resume product Ignition go-live: Macuto bay loop, Clerk / `APP_URL` / Resend, release flags dark — not more marketing redesign.
