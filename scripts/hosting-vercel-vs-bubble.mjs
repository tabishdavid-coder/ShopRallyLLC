#!/usr/bin/env node
/**
 * Hosting compare: Vercel stack (ShopRally as-built) vs Bubble (rebuild path).
 * Monthly vendor infra only — same Core assumptions (no VIN, no MOTOR, no SMS).
 *
 *   node scripts/hosting-vercel-vs-bubble.mjs
 *   node scripts/hosting-vercel-vs-bubble.mjs --json
 */

const POINTS = [1, 25, 50, 100, 200, 250, 500, 750, 1000, 2000];

const ARPU = 147.72;
const AI_ATTACH = 0.48;
const QUOTES_MO = AI_ATTACH * 220 + (1 - AI_ATTACH) * 28;
const LLM = 0.04;

/** Vercel path: Next.js + Neon + Clerk + Resend + light obs (current architecture). */
function vercelStack(shops) {
  const vercel = Math.round(20 + (shops <= 1 ? 5 : 5 + shops * 0.75));
  const neon =
    shops <= 1 ? 0 : shops <= 50 ? 19 : shops <= 250 ? 69 : shops <= 1000 ? 150 : 300;
  const clerk =
    shops <= 1 ? 0 : shops <= 50 ? 25 : shops <= 250 ? 99 : shops <= 1000 ? 200 : 400;
  const resend = shops <= 1 ? 0 : shops <= 100 ? 20 : shops <= 500 ? 40 : 80;
  const obs = shops <= 1 ? 0 : shops <= 100 ? 26 : shops <= 500 ? 50 : 100;
  const misc = 5;
  const hosting = vercel + neon + clerk + resend + obs + misc;
  const stripe = Math.round(shops * ARPU * 0.03);
  const aiEmail = Math.round(shops * QUOTES_MO * LLM + shops * 1.5);
  return {
    plan:
      shops <= 1
        ? "Pro ($20 seat)"
        : shops <= 100
          ? "Pro + usage"
          : "Pro + usage (busy)",
    hosting,
    breakdown: { vercel, neon, clerk, resend, obs, misc },
    stripe,
    aiEmail,
    total: hosting + stripe + aiEmail,
  };
}

/**
 * Bubble path: one Bubble app hosts UI+DB+auth.
 * Still need Stripe + external AI (Bubble doesn't include LLM) + email provider.
 * WU estimate: CRM is DB-heavy — ~8k–15k WU/shop/mo ballpark for multi-tenant RO traffic.
 * Plans (web, annual): Starter $29 / 175k WU · Growth $119 / 250k · Team $349 / 500k
 * Overage default ~$0.30 / 1k WU (illustrative; tiers discount).
 */
function bubbleStack(shops) {
  const wuPerShop = shops <= 25 ? 12_000 : shops <= 100 ? 10_000 : 8_000;
  const wu = shops * wuPerShop;

  let planName;
  let planFee;
  let includedWu;
  if (wu <= 175_000 && shops <= 10) {
    planName = "Starter";
    planFee = 29;
    includedWu = 175_000;
  } else if (wu <= 250_000 && shops <= 30) {
    planName = "Growth";
    planFee = 119;
    includedWu = 250_000;
  } else if (wu <= 500_000 && shops <= 60) {
    planName = "Team";
    planFee = 349;
    includedWu = 500_000;
  } else {
    // Stay on Team + WU overage / tiers (Enterprise not modeled as fixed)
    planName = "Team + WU";
    planFee = 349;
    includedWu = 500_000;
  }

  const overageWu = Math.max(0, wu - includedWu);
  const overageFee = Math.round((overageWu / 1000) * 0.3);
  // At very high WU, assume buying a workload tier (~40% cheaper than raw overage)
  const wuBill =
    overageWu > 2_000_000
      ? Math.round(overageFee * 0.6)
      : overageWu > 500_000
        ? Math.round(overageFee * 0.75)
        : overageFee;

  const hosting = planFee + wuBill;
  const stripe = Math.round(shops * ARPU * 0.03);
  // Same AI LLM; email via Bubble or Resend — keep Resend-like cost
  const aiEmail = Math.round(shops * QUOTES_MO * LLM + shops * 1.5);

  return {
    plan: `${planName} (${(wu / 1000).toFixed(0)}k WU)`,
    hosting,
    breakdown: { planFee, wuBill, wu, includedWu },
    stripe,
    aiEmail,
    total: hosting + stripe + aiEmail,
  };
}

function fmt(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function run() {
  const rows = POINTS.map((shops) => {
    const v = vercelStack(shops);
    const b = bubbleStack(shops);
    return {
      shops,
      revenue: Math.round(shops * ARPU),
      vercel: v,
      bubble: b,
      delta: b.total - v.total,
      cheaper: b.total < v.total ? "Bubble" : b.total > v.total ? "Vercel" : "Tie",
    };
  });
  return {
    notes: {
      vercel:
        "One Next.js deploy (Master + Shop CRM). Neon + Clerk + Resend separate. No per-shop host.",
      bubble:
        "Would rebuild CRM on Bubble (not current codebase). Plan + Workload Units; DB/auth included. Stripe + AI still external.",
      shared: "No VIN · no MOTOR · no SMS. Core ARPU ~$147.72/mo.",
    },
    rows,
  };
}

const data = run();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.log("\n══ Hosting: Vercel stack vs Bubble (monthly) ══\n");
console.log(data.notes.shared);
console.log("Left = Vercel (as-built) · Right = Bubble (rebuild)\n");
console.log(
  [
    "Shops",
    "Sales",
    "Vercel plan",
    "Vercel host",
    "Vercel total*",
    "Bubble plan",
    "Bubble host",
    "Bubble total*",
    "Δ (B−V)",
    "Cheaper",
  ].join("\t"),
);

for (const r of data.rows) {
  console.log(
    [
      r.shops,
      fmt(r.revenue),
      r.vercel.plan,
      fmt(r.vercel.hosting),
      fmt(r.vercel.total),
      r.bubble.plan,
      fmt(r.bubble.hosting),
      fmt(r.bubble.total),
      (r.delta >= 0 ? "+" : "") + fmt(r.delta),
      r.cheaper,
    ].join("\t"),
  );
}
console.log("\n* total = hosting + Stripe (~3% ARR) + AI/email COGS\n");
console.log("Vercel:", data.notes.vercel);
console.log("Bubble:", data.notes.bubble);
console.log("");
