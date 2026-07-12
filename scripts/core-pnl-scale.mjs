#!/usr/bin/env node
/**
 * Core plan P&L scale table — same shape as the Pro/all-in reference sheet:
 *   Shops | HC | ARR | Data licenses | SMS | Infra | Stripe | AI+email |
 *   Payroll | Marketing | G&A | Total cost | Op. profit | Margin
 *
 * Core path: no MOTOR data licenses, no SMS (feature gated), AI Instant Quote COGS,
 * lower ARPU ($119/$109 + AI/web attach).
 *
 *   node scripts/core-pnl-scale.mjs
 *   node scripts/core-pnl-scale.mjs --json
 *   node scripts/core-pnl-scale.mjs --csv
 */

const SHOP_POINTS = [25, 50, 100, 200, 250, 500, 750, 1000, 2000];

/** Headcount by shop count (lean Core ops — under Pro-stack HC; simpler surface). */
const HC_BY_SHOPS = {
  25: 1,
  50: 1.5,
  100: 2.5,
  200: 4,
  250: 4.5,
  500: 7,
  750: 10,
  1000: 14,
  2000: 24,
};

const CORE_MONTHLY = 119;
const CORE_ANNUAL = 109;
const ANNUAL_SHARE = 0.55;
const AI_ATTACH = 0.48;
const AI_PRICE = 39;
const WEB_ATTACH = 0.12;
const WEB_ARPU = 120;
const VIN_OVERAGE_ARPU = 0; // VIN/plate decode OFF for this Core path
const AI_OVERAGE_ARPU = 1.1; // ~$1.10/shop/mo blended
/** When false: no VIN/plate decode product or COGS (manual YMM entry / AI Quote parses YMM from text). */
const VIN_DECODE_ENABLED = false;

function coreArpuMo() {
  return (
    ANNUAL_SHARE * CORE_ANNUAL +
    (1 - ANNUAL_SHARE) * CORE_MONTHLY +
    AI_ATTACH * AI_PRICE +
    WEB_ATTACH * WEB_ARPU +
    (VIN_DECODE_ENABLED ? VIN_OVERAGE_ARPU : 0) +
    AI_OVERAGE_ARPU
  );
}

function arrSales(shops) {
  return shops * coreArpuMo() * 12;
}

/**
 * Data licenses on this Core path:
 * - MOTOR = $0
 * - VIN/plate decode = OFF → $0 (advisors enter YMM manually; AI Quote parses YMM from NL text)
 */
function dataLicenses(shops) {
  if (!VIN_DECODE_ENABLED) return 0;
  const per = shops <= 100 ? 18 : shops <= 500 ? 12 : shops <= 1000 ? 9 : 7;
  return shops * per;
}

/** Core has no two-way SMS in plan — $0 until Pro. */
function smsCost() {
  return 0;
}

/** Neon + Vercel + Clerk + observability — mostly fixed then step. */
function infra(shops) {
  const base = 2800; // annual floor
  const per = shops <= 100 ? 22 : shops <= 500 ? 16 : shops <= 1000 ? 12 : 10;
  return base + shops * per;
}

/** Stripe Billing ~3% of ARR (subscription collection). */
function stripeFees(arr) {
  return arr * 0.03;
}

/**
 * AI Instant Quote LLM + Resend/email.
 * ~$0.04/quote × usage + email sends. Higher than thin “AI” line on Pro-stack sheets
 * because Instant Quote is the Core wedge.
 */
function aiEmail(shops) {
  const quotesPerShopMo =
    AI_ATTACH * 220 + (1 - AI_ATTACH) * 28; // matches scenario usage
  const llmYr = shops * quotesPerShopMo * 12 * 0.04;
  const emailYr = shops * 18; // Resend ~$1.50/shop/mo blended
  return llmYr + emailYr;
}

/** Fully loaded payroll from HC. */
function payroll(hc) {
  // Blend: early founder premium, then ~$110–120k loaded (Core leaner than Pro sheet)
  if (hc <= 1) return 180_000;
  if (hc <= 2) return hc * 145_000;
  if (hc <= 5) return hc * 120_000;
  if (hc <= 12) return hc * 112_000;
  return hc * 115_000;
}

/** Demand-gen + content + tools. AI Quote demo inbound lowers paid mix. */
function marketing(shops, arr) {
  const pct = shops <= 100 ? 0.08 : shops <= 500 ? 0.065 : shops <= 1000 ? 0.055 : 0.05;
  const floor = shops <= 50 ? 8_000 : 0;
  return Math.max(floor, arr * pct);
}

function ga(shops) {
  // Legal, accounting, insurance, admin tools — slow step function
  if (shops <= 25) return 18_000;
  if (shops <= 50) return 19_000;
  if (shops <= 100) return 21_000;
  if (shops <= 250) return 26_000;
  if (shops <= 500) return 34_000;
  if (shops <= 750) return 42_000;
  if (shops <= 1000) return 52_000;
  return 72_000;
}

function roundDollar(n) {
  return Math.round(n);
}

function fmtMoney(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const s = m >= 10 ? m.toFixed(1) : m.toFixed(2).replace(/0$/, "");
    return `${sign}$${parseFloat(s)}M`;
  }
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
  if (abs >= 1000) {
    // Keep exact for mid hundreds like $3,321 style when < 10k? User used $3,321
    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }
  return `${sign}$${Math.round(abs)}`;
}

function fmtMargin(op, arr) {
  if (!arr) return "n/a";
  const m = (op / arr) * 100;
  return `${m.toFixed(0)}%`;
}

function fmtHc(hc) {
  return Number.isInteger(hc) ? String(hc) : String(hc);
}

function buildRow(shops) {
  const hc = HC_BY_SHOPS[shops];
  const arr = arrSales(shops);
  const data = dataLicenses(shops);
  const sms = smsCost();
  const inf = infra(shops);
  const stripe = stripeFees(arr);
  const ai = aiEmail(shops);
  const pay = payroll(hc);
  const mkt = marketing(shops, arr);
  const g = ga(shops);
  const total = data + sms + inf + stripe + ai + pay + mkt + g;
  const op = arr - total;
  const margin = op / arr;
  return {
    shops,
    hc,
    arr: roundDollar(arr),
    dataLicenses: roundDollar(data),
    sms: roundDollar(sms),
    infra: roundDollar(inf),
    stripe: roundDollar(stripe),
    aiEmail: roundDollar(ai),
    payroll: roundDollar(pay),
    marketing: roundDollar(mkt),
    ga: roundDollar(g),
    totalCost: roundDollar(total),
    opProfit: roundDollar(op),
    margin,
  };
}

function printTable(rows) {
  const arpu = coreArpuMo();
  console.log("\n══ ShopRally CORE plan — annual P&L scale ══\n");
  console.log(
    `ARPU ≈ $${arpu.toFixed(2)}/mo (Core $${CORE_MONTHLY}/$${CORE_ANNUAL} · AI ${AI_ATTACH * 100}%@$${AI_PRICE} · Web ${WEB_ATTACH * 100}%@$${WEB_ARPU})`,
  );
  console.log(
    VIN_DECODE_ENABLED
      ? "Data licenses = VIN/plate API only (MOTOR $0) · SMS $0 (Core gated)\n"
      : "Data licenses = $0 (no VIN decode · no MOTOR) · SMS $0 (Core gated)\n",
  );

  const header = [
    "Shops",
    "HC",
    "ARR (sales)",
    "Data licenses",
    "SMS",
    "Infra",
    "Stripe",
    "AI + email",
    "Payroll",
    "Marketing",
    "G&A",
    "Total cost",
    "Op. profit",
    "Margin",
  ];
  console.log(header.join("\t"));

  for (const r of rows) {
    console.log(
      [
        r.shops,
        fmtHc(r.hc),
        fmtMoney(r.arr),
        fmtMoney(r.dataLicenses),
        fmtMoney(r.sms),
        fmtMoney(r.infra),
        fmtMoney(r.stripe),
        fmtMoney(r.aiEmail),
        fmtMoney(r.payroll),
        fmtMoney(r.marketing),
        fmtMoney(r.ga),
        fmtMoney(r.totalCost),
        fmtMoney(r.opProfit),
        fmtMargin(r.opProfit, r.arr),
      ].join("\t"),
    );
  }

  console.log("\n── vs reference Pro-stack sheet ──");
  console.log("  Lower ARR/shop (~$148 vs ~$229 ARPU)");
  console.log("  Data licenses: $0 (no VIN decode · no MOTOR)");
  console.log("  SMS: $0 vs ~$39/shop/yr");
  console.log("  AI + email: higher (Instant Quote wedge; YMM from NL text)");
  console.log("  Breakeven: see first non-negative Op. profit row\n");
}

function printCsv(rows) {
  const header = [
    "Shops",
    "HC",
    "ARR_sales",
    "Data_licenses",
    "SMS",
    "Infra",
    "Stripe",
    "AI_email",
    "Payroll",
    "Marketing",
    "GA",
    "Total_cost",
    "Op_profit",
    "Margin",
  ];
  console.log(header.join(","));
  for (const r of rows) {
    console.log(
      [
        r.shops,
        r.hc,
        r.arr,
        r.dataLicenses,
        r.sms,
        r.infra,
        r.stripe,
        r.aiEmail,
        r.payroll,
        r.marketing,
        r.ga,
        r.totalCost,
        r.opProfit,
        (r.margin * 100).toFixed(1) + "%",
      ].join(","),
    );
  }
}

const json = process.argv.includes("--json");
const csv = process.argv.includes("--csv");
const rows = SHOP_POINTS.map(buildRow);
const payload = {
  plan: "Core",
  arpuMo: Math.round(coreArpuMo() * 100) / 100,
  assumptions: {
    coreMonthly: CORE_MONTHLY,
    coreAnnual: CORE_ANNUAL,
    annualShare: ANNUAL_SHARE,
    aiAttach: AI_ATTACH,
    aiPrice: AI_PRICE,
    webAttach: WEB_ATTACH,
    webArpu: WEB_ARPU,
    motor: 0,
    sms: 0,
    vinDecode: VIN_DECODE_ENABLED,
    stripePctOfArr: 0.03,
  },
  rows,
};

if (json) console.log(JSON.stringify(payload, null, 2));
else if (csv) printCsv(rows);
else printTable(rows);
