#!/usr/bin/env node
/**
 * Ignition (Core) financial outlook — 1 → 200 shops
 *
 * Locked packaging (2026-07):
 *   Ignition CRM  $49.99/mo · $44.99/mo annual
 *   AI Plus        $20/mo (Smart intake · labor assist · advisor mobile app)
 *   MOTOR / SMS / Stripe Connect / PartsTech  OFF on Ignition
 *
 *   node scripts/ignition-200-outlook.mjs
 *   node scripts/ignition-200-outlook.mjs --json
 *   node scripts/ignition-200-outlook.mjs --md
 */

const SHOPS = [1, 5, 10, 25, 50, 100, 150, 200];

/** Pricing */
const IGNITION_MONTHLY = 49.99;
const IGNITION_ANNUAL = 44.99;
const ANNUAL_BILLING_SHARE = 0.55; // share of logos on annual
const AI_PLUS_PRICE = 20;
/** AI Plus attach rises as mobile app becomes the wedge */
const AI_ATTACH = {
  1: 0.0,
  5: 0.2,
  10: 0.28,
  25: 0.35,
  50: 0.4,
  100: 0.45,
  150: 0.48,
  200: 0.5,
};
/** Optional ShopSite/SEO — soft attach on Core launch path */
const WEB_ATTACH = {
  1: 0,
  5: 0.05,
  10: 0.06,
  25: 0.08,
  50: 0.1,
  100: 0.1,
  150: 0.11,
  200: 0.12,
};
const WEB_ARPU = 120; // blended ShopSite / SEO / bundle

/** Headcount (founder-led → lean ops) */
const HC = {
  1: 1,
  5: 1,
  10: 1,
  25: 1.5,
  50: 2,
  100: 3,
  150: 3.5,
  200: 4,
};

function aiAttach(shops) {
  return AI_ATTACH[shops] ?? 0.4;
}
function webAttach(shops) {
  return WEB_ATTACH[shops] ?? 0.1;
}

function ignitionArpu() {
  return ANNUAL_BILLING_SHARE * IGNITION_ANNUAL + (1 - ANNUAL_BILLING_SHARE) * IGNITION_MONTHLY;
}

function blendedArpu(shops) {
  return ignitionArpu() + aiAttach(shops) * AI_PLUS_PRICE + webAttach(shops) * WEB_ARPU;
}

function mrr(shops) {
  return shops * blendedArpu(shops);
}

function arr(shops) {
  return mrr(shops) * 12;
}

/**
 * Monthly vendor stack — what you pay to keep Ignition live.
 * Step functions tuned to Neon / Vercel / Clerk / Expo public list pricing (ballpark).
 */
function vendorStackMo(shops) {
  // ── Hosting & data ──────────────────────────────────────────────
  let vercel = 20; // Pro seat
  if (shops >= 25) vercel = 45;
  if (shops >= 100) vercel = 120;
  if (shops >= 200) vercel = 220; // + Fluid / serverless usage

  let neon = 0; // free tier OK for 1 quiet shop
  if (shops >= 5) neon = 19; // Launch
  if (shops >= 25) neon = 69; // Scale
  if (shops >= 100) neon = 129;
  if (shops >= 200) neon = 199;

  let clerk = 0; // free to ~10k MAU
  if (shops >= 25) clerk = 25; // Pro
  if (shops >= 100) clerk = 99;
  if (shops >= 200) clerk = 149;

  let inngest = 0;
  if (shops >= 10) inngest = 20;
  if (shops >= 100) inngest = 75;
  if (shops >= 200) inngest = 120;

  let blob = 0;
  if (shops >= 10) blob = 10; // inspections photos
  if (shops >= 100) blob = 40;
  if (shops >= 200) blob = 80;

  let upstash = 0;
  if (shops >= 50) upstash = 10;
  if (shops >= 200) upstash = 30;

  const domainDns = 2; // ~$20–25/yr amortized + Cloudflare free

  // ── Security / observability ────────────────────────────────────
  let sentry = 0;
  if (shops >= 10) sentry = 26;
  if (shops >= 100) sentry = 80;

  let betterstack = 0; // uptime + logs
  if (shops >= 25) betterstack = 20;
  if (shops >= 150) betterstack = 40;

  // Secret mgr / WAF: Cloudflare free + Vercel SSL included
  const sslWaf = 0;

  // ── Comms ───────────────────────────────────────────────────────
  let resend = 0;
  if (shops >= 5) resend = 20;
  if (shops >= 50) resend = 35;
  if (shops >= 200) resend = 80; // estimate/invoice/approve volume

  // SMS OFF on Ignition
  const twilio = 0;

  // ── AI Plus COGS (Gemini) — only paid attach users ──────────────
  // Blended ~$2.50–4.50 / AI Plus seat / mo at moderate intake usage
  const aiSeats = shops * aiAttach(shops);
  const aiCogsPerSeat = shops < 50 ? 2.5 : shops < 150 ? 3.2 : 3.8;
  const gemini = aiSeats * aiCogsPerSeat;

  // ── Mobile (AI Plus advisor app) ────────────────────────────────
  // Apple $99/yr + Google $25 once amortized + EAS builds + push
  let mobile = 99 / 12 + 25 / 36; // ~$9/mo baseline
  if (shops >= 25) mobile = 18; // more EAS builds / TestFlight / force updates
  if (shops >= 100) mobile = 35;
  if (shops >= 200) mobile = 55;

  // ── Stripe Billing (subscription collection only — no Connect) ──
  const stripe = mrr(shops) * 0.029 + shops * 0.3; // ~2.9% + $0.30/shop invoice

  const hosting = vercel + neon + clerk + inngest + blob + upstash + domainDns;
  const security = sentry + betterstack + sslWaf;
  const comms = resend + twilio;
  const ai = gemini;
  const total =
    hosting + security + comms + ai + mobile + stripe;

  return {
    vercel,
    neon,
    clerk,
    inngest,
    blob,
    upstash,
    domainDns,
    sentry,
    betterstack,
    resend,
    twilio,
    gemini: round2(gemini),
    mobile: round2(mobile),
    stripe: round2(stripe),
    hosting: round2(hosting),
    security: round2(security),
    comms: round2(comms),
    ai: round2(ai),
    total: round2(total),
  };
}

/** Annual OpEx (people + demand gen + G&A) — separate from vendor run-rate */
function opexAnnual(shops) {
  const hc = HC[shops];
  let payroll;
  if (hc <= 1) payroll = 160_000; // founder draw / early
  else if (hc <= 2) payroll = hc * 130_000;
  else if (hc <= 4) payroll = hc * 115_000;
  else payroll = hc * 112_000;

  const arr$ = arr(shops);
  const mktPct = shops <= 25 ? 0.12 : shops <= 100 ? 0.08 : 0.06;
  const marketing = Math.max(shops <= 10 ? 6_000 : 10_000, arr$ * mktPct);

  let ga = 12_000; // legal, insurance, bookkeeping, tools
  if (shops >= 25) ga = 18_000;
  if (shops >= 100) ga = 28_000;
  if (shops >= 200) ga = 36_000;

  // Security / compliance projects (annualized) — pen test, SOC2 path later
  let securityProjects = 0;
  if (shops >= 50) securityProjects = 6_000; // light pen test / audit prep
  if (shops >= 150) securityProjects = 18_000; // stronger compliance path

  return {
    hc,
    payroll: Math.round(payroll),
    marketing: Math.round(marketing),
    ga: Math.round(ga),
    securityProjects: Math.round(securityProjects),
    total: Math.round(payroll + marketing + ga + securityProjects),
  };
}

/** One-time go-live cash needs (before or at shop #1) */
const GO_LIVE_ONETIME = [
  { item: "Domain + DNS setup", low: 20, high: 40 },
  { item: "Apple Developer Program (year 1)", low: 99, high: 99 },
  { item: "Google Play Console", low: 25, high: 25 },
  { item: "Clerk / Neon / Vercel card on file (pro rates)", low: 0, high: 50 },
  { item: "Legal: ToS + Privacy + MSA template", low: 500, high: 2500 },
  { item: "Logo / brand polish (optional)", low: 0, high: 1500 },
  { item: "Founding launch ads / waitlist boost", low: 500, high: 3000 },
  { item: "First Expo production builds + TestFlight cycle", low: 0, high: 200 },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function money(n, digits = 0) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (digits === 0) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }
  return `${sign}$${abs.toFixed(digits)}`;
}

function buildRow(shops) {
  const v = vendorStackMo(shops);
  const o = opexAnnual(shops);
  const revenueArr = arr(shops);
  const vendorYr = v.total * 12;
  const totalCost = vendorYr + o.total;
  const op = revenueArr - totalCost;
  return {
    shops,
    aiAttach: aiAttach(shops),
    webAttach: webAttach(shops),
    arpu: round2(blendedArpu(shops)),
    mrr: round2(mrr(shops)),
    arr: Math.round(revenueArr),
    vendor: v,
    vendorAnnual: Math.round(vendorYr),
    opex: o,
    totalCostAnnual: Math.round(totalCost),
    opProfitAnnual: Math.round(op),
    margin: revenueArr ? op / revenueArr : 0,
    contributionAfterVendorMo: round2(mrr(shops) - v.total),
  };
}

function printHuman(rows) {
  console.log("\n══ ShopRally Ignition — financial outlook (1 → 200 shops) ══\n");
  console.log(
    `Packaging: Ignition $${IGNITION_MONTHLY}/$${IGNITION_ANNUAL} annual · AI Plus $${AI_PLUS_PRICE}/mo (mobile + intake)`,
  );
  console.log(`Base Ignition ARPU ≈ $${ignitionArpu().toFixed(2)}/mo before attach\n`);

  console.log("── Revenue & contribution (monthly vendor only) ──");
  console.log(
    [
      "Shops",
      "AI%",
      "ARPU",
      "MRR",
      "ARR",
      "Vendor $/mo",
      "Contrib $/mo",
      "Vendor/ARR",
    ].join("\t"),
  );
  for (const r of rows) {
    console.log(
      [
        r.shops,
        `${Math.round(r.aiAttach * 100)}%`,
        money(r.arpu, 2),
        money(r.mrr, 0),
        money(r.arr),
        money(r.vendor.total, 0),
        money(r.contributionAfterVendorMo, 0),
        `${((r.vendorAnnual / r.arr) * 100).toFixed(1)}%`,
      ].join("\t"),
    );
  }

  console.log("\n── Monthly vendor breakdown @ selected scales ──");
  for (const shops of [1, 25, 100, 200]) {
    const r = rows.find((x) => x.shops === shops);
    const v = r.vendor;
    console.log(`\n@ ${shops} shop(s) · MRR ${money(r.mrr)} · vendor ${money(v.total)}/mo`);
    console.log(
      `  Infra:     Vercel ${money(v.vercel)} · Neon ${money(v.neon)} · Clerk ${money(v.clerk)} · Inngest ${money(v.inngest)} · Blob ${money(v.blob)} · Redis ${money(v.upstash)} · DNS ${money(v.domainDns)}  → ${money(v.hosting)}`,
    );
    console.log(
      `  Security:  Sentry ${money(v.sentry)} · Uptime/logs ${money(v.betterstack)} · SSL/WAF $0 (Vercel/CF)  → ${money(v.security)}`,
    );
    console.log(`  Comms:     Resend ${money(v.resend)} · Twilio $0 (SMS off)  → ${money(v.comms)}`);
    console.log(`  AI COGS:   Gemini ${money(v.gemini)} (${Math.round(r.aiAttach * 100)}% AI Plus attach)`);
    console.log(`  Mobile:    Apple/Play/EAS/push ${money(v.mobile)}`);
    console.log(`  Stripe:    Billing fees ${money(v.stripe)}`);
  }

  console.log("\n── Annual P&L (vendor + payroll + marketing + G&A + security projects) ──");
  console.log(
    ["Shops", "HC", "ARR", "Vendor", "Payroll", "Mkt", "G&A", "Sec proj", "Total cost", "Op profit", "Margin"].join(
      "\t",
    ),
  );
  for (const r of rows) {
    console.log(
      [
        r.shops,
        r.opex.hc,
        money(r.arr),
        money(r.vendorAnnual),
        money(r.opex.payroll),
        money(r.opex.marketing),
        money(r.opex.ga),
        money(r.opex.securityProjects),
        money(r.totalCostAnnual),
        money(r.opProfitAnnual),
        `${(r.margin * 100).toFixed(0)}%`,
      ].join("\t"),
    );
  }

  console.log("\n── Go-live one-time cash (shop #1) ──");
  let lo = 0;
  let hi = 0;
  for (const g of GO_LIVE_ONETIME) {
    console.log(`  ${g.item}: $${g.low}–$${g.high}`);
    lo += g.low;
    hi += g.high;
  }
  console.log(`  TOTAL one-time: $${lo}–$${hi}`);

  console.log("\n── Takeaways ──");
  const r1 = rows.find((x) => x.shops === 1);
  const r200 = rows.find((x) => x.shops === 200);
  console.log(
    `  1 shop: ~${money(r1.vendor.total)}/mo vendor to stay live (infra+security+email+mobile baseline).`,
  );
  console.log(
    `  200 shops: ~${money(r200.mrr)} MRR / ${money(r200.arr)} ARR · vendor ~${money(r200.vendor.total)}/mo (${((r200.vendorAnnual / r200.arr) * 100).toFixed(1)}% of ARR).`,
  );
  console.log(
    `  Gross after vendors @ 200: ~${money(r200.contributionAfterVendorMo)}/mo before payroll.`,
  );
  console.log(
    `  People cost dominates OpEx — infra stays cheap relative to Ignition revenue at scale.`,
  );
  console.log("");
}

function printMarkdown(rows) {
  const lines = [];
  const push = (s = "") => lines.push(s);

  push("# Ignition financial outlook — 1 → 200 shops");
  push("");
  push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
  push("**Status:** Locked Ignition packaging · planning model");
  push("**Runner:** `node scripts/ignition-200-outlook.mjs`");
  push("");
  push("## Packaging (locked)");
  push("");
  push("| Item | Price | Notes |");
  push("|------|------:|-------|");
  push(`| **Ignition** (Core CRM) | **$${IGNITION_MONTHLY}/mo** ($${IGNITION_ANNUAL}/mo annual) | Job board, ROs, DVIs, email share/approve, shop labor library, appointments, payment tracking, Live Ops Snapshot, NHTSA VIN |`);
  push(`| **AI Plus** | **$${AI_PLUS_PRICE}/mo** | Smart / freeform RO intake · labor assist · **advisor mobile app** |`);
  push("| MOTOR / PartsTech / SMS / Stripe Connect | — | **Off** until Pro |");
  push("| ShopSite / Local SEO | $99–$199/mo | Optional attach (soft) |");
  push("");
  push(`Base Ignition ARPU ≈ **$${ignitionArpu().toFixed(2)}/mo** before AI/web attach.`);
  push("");
  push("## Headline @ 200");
  push("");
  {
    const r = rows.find((x) => x.shops === 200);
    push("| | |");
    push("|--|--|");
    push(`| **Shops** | **200** |`);
    push(`| **Blended ARPU** | **$${r.arpu.toFixed(2)}/mo** (${Math.round(r.aiAttach * 100)}% AI Plus) |`);
    push(`| **MRR** | **${money(r.mrr)}** |`);
    push(`| **ARR** | **${money(r.arr)}** |`);
    push(`| **Vendor run-rate** | **${money(r.vendor.total)}/mo** (${((r.vendorAnnual / r.arr) * 100).toFixed(1)}% of ARR) |`);
    push(`| **Contribution after vendors** | **${money(r.contributionAfterVendorMo)}/mo** |`);
    push(`| **Op. profit (after payroll)** | **${money(r.opProfitAnnual)}/yr** (${(r.margin * 100).toFixed(0)}% margin) |`);
    push("");
  }

  push("## Revenue ramp");
  push("");
  push("| Shops | AI Plus attach | ARPU | MRR | ARR | Vendor $/mo | Contrib $/mo |");
  push("|------:|---------------:|-----:|----:|----:|------------:|-------------:|");
  for (const r of rows) {
    push(
      `| ${r.shops} | ${Math.round(r.aiAttach * 100)}% | $${r.arpu.toFixed(2)} | ${money(r.mrr)} | ${money(r.arr)} | ${money(r.vendor.total)} | ${money(r.contributionAfterVendorMo)} |`,
    );
  }
  push("");

  push("## What it costs to stay live (monthly vendors)");
  push("");
  push("### Stack map");
  push("");
  push("| Category | Services | Notes |");
  push("|----------|----------|-------|");
  push("| **Infrastructure** | Vercel, Neon Postgres, Clerk, Inngest, Vercel Blob, Upstash (optional), domain/DNS | Scales with traffic & DB size |");
  push("| **Security / reliability** | Vercel TLS, Cloudflare (free), Sentry, uptime/logs | No separate WAF bill early; Clerk = auth security |");
  push("| **Email** | Resend | Estimate / invoice / approval mail |");
  push("| **SMS** | — | **$0 on Ignition** |");
  push("| **AI COGS** | Gemini (or current provider) | Only for AI Plus seats |");
  push("| **Mobile** | Apple Developer, Google Play, EAS builds, push | Required for AI Plus advisor app |");
  push("| **Payments** | Stripe Billing | Collects Ignition + AI Plus subs (~2.9%+$0.30) |");
  push("| **Data licenses** | — | **$0** (no MOTOR · NHTSA VIN) |");
  push("");

  push("### Vendor detail at key scales");
  push("");
  for (const shops of [1, 25, 100, 200]) {
    const r = rows.find((x) => x.shops === shops);
    const v = r.vendor;
    push(`#### ${shops} shop${shops === 1 ? "" : "s"} — **${money(v.total)}/mo** vendors (MRR ${money(r.mrr)})`);
    push("");
    push("| Line | $/mo |");
    push("|------|-----:|");
    push(`| Vercel | ${money(v.vercel)} |`);
    push(`| Neon | ${money(v.neon)} |`);
    push(`| Clerk | ${money(v.clerk)} |`);
    push(`| Inngest | ${money(v.inngest)} |`);
    push(`| Blob storage | ${money(v.blob)} |`);
    push(`| Redis (rate limit) | ${money(v.upstash)} |`);
    push(`| Domain / DNS | ${money(v.domainDns)} |`);
    push(`| **Infra subtotal** | **${money(v.hosting)}** |`);
    push(`| Sentry | ${money(v.sentry)} |`);
    push(`| Uptime / logs | ${money(v.betterstack)} |`);
    push(`| **Security subtotal** | **${money(v.security)}** |`);
    push(`| Resend email | ${money(v.resend)} |`);
    push(`| Twilio SMS | $0 |`);
    push(`| Gemini AI COGS | ${money(v.gemini)} |`);
    push(`| Mobile (Apple/Play/EAS) | ${money(v.mobile)} |`);
    push(`| Stripe Billing fees | ${money(v.stripe)} |`);
    push(`| **Total vendors** | **${money(v.total)}** |`);
    push("");
  }

  push("## Annual P&L (vendors + people)");
  push("");
  push("| Shops | HC | ARR | Vendor | Payroll | Marketing | G&A | Sec. projects | Total cost | Op. profit | Margin |");
  push("|------:|---:|----:|-------:|--------:|----------:|----:|--------------:|-----------:|-----------:|-------:|");
  for (const r of rows) {
    push(
      `| ${r.shops} | ${r.opex.hc} | ${money(r.arr)} | ${money(r.vendorAnnual)} | ${money(r.opex.payroll)} | ${money(r.opex.marketing)} | ${money(r.opex.ga)} | ${money(r.opex.securityProjects)} | ${money(r.totalCostAnnual)} | ${money(r.opProfitAnnual)} | ${(r.margin * 100).toFixed(0)}% |`,
    );
  }
  push("");
  push("Payroll dominates. Infra stays a small % of ARR even at 200.");
  push("");

  push("## Go-live one-time costs (before / at shop #1)");
  push("");
  push("| Item | Low | High |");
  push("|------|----:|-----:|");
  let lo = 0;
  let hi = 0;
  for (const g of GO_LIVE_ONETIME) {
    push(`| ${g.item} | $${g.low} | $${g.high} |`);
    lo += g.low;
    hi += g.high;
  }
  push(`| **Total** | **$${lo}** | **$${hi}** |`);
  push("");

  push("## Mobile app (AI Plus) — cost notes");
  push("");
  push("- **Included in AI Plus $20/mo** for the customer — Advisor mobile companion.");
  push("- **Your COGS:** Apple $99/yr, Google Play $25 once, EAS build minutes, push infra.");
  push("- Model treats mobile as **~$9 → $55/mo** platform cost from 1 → 200 shops (builds + store ops), not per-seat.");
  push("- Gemini usage for intake/labor assist scales with AI Plus attach (~$2.50–$3.80 per AI seat / mo).");
  push("");

  push("## Security costs — what you actually pay");
  push("");
  push("| Layer | Cost treatment |");
  push("|-------|----------------|");
  push("| TLS / HTTPS | $0 (Vercel) |");
  push("| Auth / MFA / org isolation | Clerk (in infra) |");
  push("| Multi-tenant `shopId` isolation | Engineering (payroll) |");
  push("| Error monitoring | Sentry (~$0 → $80/mo) |");
  push("| Uptime | Better Stack / similar (~$0 → $40/mo) |");
  push("| WAF / DDoS | Cloudflare free for early; upgrade later |");
  push("| Backups | Neon PITR on paid plans |");
  push("| Pen test / SOC2 path | Annual projects from ~50–150 shops ($6k → $18k/yr) |");
  push("");

  push("## Decisions to watch");
  push("");
  push("1. **AI Plus attach** drives both ARPU and Gemini COGS — mobile is the conversion lever.");
  push("2. **Stay on Vercel+Neon+Clerk** — vendor % of ARR stays mid–single digits at 200.");
  push("3. **People, not infra, gate profit** — hire carefully until ~100+ logos.");
  push("4. **No MOTOR / SMS on Ignition** keeps variable COGS near zero until Pro.");
  push("");

  console.log(lines.join("\n"));
}

const rows = SHOPS.map(buildRow);
const json = process.argv.includes("--json");
const md = process.argv.includes("--md");

if (json) {
  console.log(
    JSON.stringify(
      {
        packaging: {
          ignitionMonthly: IGNITION_MONTHLY,
          ignitionAnnual: IGNITION_ANNUAL,
          aiPlus: AI_PLUS_PRICE,
          baseArpu: round2(ignitionArpu()),
        },
        goLiveOnetime: GO_LIVE_ONETIME,
        rows,
      },
      null,
      2,
    ),
  );
} else if (md) printMarkdown(rows);
else printHuman(rows);
