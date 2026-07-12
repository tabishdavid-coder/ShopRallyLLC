#!/usr/bin/env node
/**
 * Pricing idea test — Core $50 + AI Instant Quote $25 add-on.
 * Does NOT change src/lib/plans.ts — sensitivity only.
 *
 *   node scripts/idea-core50-ai25.mjs
 */
const CORE = 50;
const CORE_ANNUAL = 45; // ~10% annual
const AI_PRICE = 25;
const AI_ATTACH = 0.48;
const WEB_ATTACH = 0.12;
const WEB_ARPU = 120;
const ANNUAL_SHARE = 0.55;
const LIST_ARPU = 147.72; // prior Core $119 + AI $39 path

const ARPU =
  ANNUAL_SHARE * CORE_ANNUAL +
  (1 - ANNUAL_SHARE) * CORE +
  AI_ATTACH * AI_PRICE +
  WEB_ATTACH * WEB_ARPU +
  1.1;

const HC = { 25: 1, 50: 1.5, 100: 2.5, 200: 4, 250: 4.5, 500: 7, 750: 10, 1000: 14, 2000: 24 };
const POINTS = [25, 50, 100, 200, 250, 500, 750, 1000, 2000];
const QUOTES = AI_ATTACH * 220 + (1 - AI_ATTACH) * 28;

function payroll(hc) {
  if (hc <= 1) return 180000;
  if (hc <= 2) return hc * 145000;
  if (hc <= 5) return hc * 120000;
  if (hc <= 12) return hc * 112000;
  return hc * 115000;
}
function infra(s) {
  return 2800 + s * (s <= 100 ? 22 : s <= 500 ? 16 : s <= 1000 ? 12 : 10);
}
function marketing(s, arr) {
  const pct = s <= 100 ? 0.08 : s <= 500 ? 0.065 : s <= 1000 ? 0.055 : 0.05;
  return Math.max(s <= 50 ? 8000 : 0, arr * pct);
}
function ga(s) {
  if (s <= 25) return 18000;
  if (s <= 50) return 19000;
  if (s <= 100) return 21000;
  if (s <= 250) return 26000;
  if (s <= 500) return 34000;
  if (s <= 750) return 42000;
  if (s <= 1000) return 52000;
  return 72000;
}
function fmt(n) {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}$${parseFloat((a / 1e6).toFixed(2))}M`;
  if (a >= 10000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
  return `${sign}$${Math.round(a)}`;
}

console.log("\n══ IDEA TEST: Core $50 + AI add-on $25 (no VIN/MOTOR/SMS) ══\n");
console.log(`Blended ARPU ≈ $${ARPU.toFixed(2)}/mo  (list path was ~$${LIST_ARPU}/mo → ${Math.round((ARPU / LIST_ARPU - 1) * 100)}%)\n`);

console.log(
  ["Shops", "HC", "ARR", "Data", "SMS", "Infra", "Stripe", "AI+email", "Payroll", "Mkt", "G&A", "Total cost", "Op.profit", "Margin"].join("\t"),
);
for (const s of POINTS) {
  const hc = HC[s];
  const arr = s * ARPU * 12;
  const stripe = arr * 0.03;
  const ai = s * QUOTES * 12 * 0.04 + s * 18;
  const pay = payroll(hc);
  const mkt = marketing(s, arr);
  const g = ga(s);
  const inf = infra(s);
  const total = inf + stripe + ai + pay + mkt + g;
  const op = arr - total;
  console.log(
    [s, hc, fmt(arr), "$0", "$0", fmt(inf), fmt(stripe), fmt(ai), fmt(pay), fmt(mkt), fmt(g), fmt(total), fmt(op), `${((op / arr) * 100).toFixed(0)}%`].join("\t"),
  );
}

console.log("\n── MRR vs list pricing ──");
for (const s of [1, 25, 200, 500, 2000]) {
  const neu = Math.round(s * ARPU);
  const old = Math.round(s * LIST_ARPU);
  console.log(`  ${s} shops: idea $${neu}/mo  vs  list $${old}/mo  (${Math.round((neu / old - 1) * 100)}%)`);
}

console.log("\n── Vendor-only (ignore payroll) ──");
for (const s of [1, 25, 100, 200]) {
  const rev = Math.round(s * ARPU);
  const host = Math.round(20 + (s <= 1 ? 5 : 5 + s * 0.75)) + (s <= 1 ? 0 : 19 + 25 + 20 + 26) + 5;
  const stripe = Math.round(s * ARPU * 0.03);
  const ai = Math.round(s * QUOTES * 0.04 + s * 1.5);
  const vendor = host + stripe + ai;
  console.log(`  ${s} shops: sales $${rev} − vendor $${vendor} = +$${rev - vendor}/mo`);
}
console.log("\nVerdict: ~half the revenue of $119+$39. Vendor unit economics still positive,");
console.log("but full P&L (with payroll) never reaches op. profit at modeled HC — need much leaner team or higher price.\n");
