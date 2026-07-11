#!/usr/bin/env node
/**
 * Core-only growth scenario: founding go-live → 200 paying shops.
 * No MOTOR DaaS (shop labor library + reference taxonomy). Prices from src/lib/plans.ts.
 *
 * Usage:
 *   node scripts/core-to-200-scenario.mjs
 *   node scripts/core-to-200-scenario.mjs --monthly-price=119 --annual-share=0.55
 *   node scripts/core-to-200-scenario.mjs --json
 */

const CORE_MONTHLY = 119; // PLANS.STARTER.monthlyCents / 100
const CORE_ANNUAL_MO = 109; // PLANS.STARTER.annualMonthlyCents / 100
const TARGET_SHOPS = 200;

/** Default ramp: net new paying shops added each month (after churn). */
const DEFAULT_NET_NEW_BY_MONTH = [
  // Months 1–3: founding / friends
  3, 4, 5,
  // 4–6: early traction
  6, 7, 8,
  // 7–9: channel forming
  9, 10, 11,
  // 10–12: steady sales
  12, 13, 14,
  // 13–18: scale
  15, 15, 16, 16, 17, 17,
  // 19–24: fill to ~200
  12, 10, 8, 6, 4, 2,
];

function parseArgs(argv) {
  const out = {
    monthlyPrice: CORE_MONTHLY,
    annualPrice: CORE_ANNUAL_MO,
    annualShare: 0.55,
    monthlyChurn: 0.025, // 2.5%/mo on monthly cohort only (annual treated as prepaid year)
    addonAttach: 0.12, // share of shops with ShopSite or SEO (Core à la carte)
    addonArpu: 120, // blended $ among attachers (mix of 99 / 129 / 199)
    startShops: 0,
    target: TARGET_SHOPS,
    json: false,
  };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a.startsWith("--monthly-price=")) out.monthlyPrice = Number(a.split("=")[1]);
    else if (a.startsWith("--annual-price=")) out.annualPrice = Number(a.split("=")[1]);
    else if (a.startsWith("--annual-share=")) out.annualShare = Number(a.split("=")[1]);
    else if (a.startsWith("--monthly-churn=")) out.monthlyChurn = Number(a.split("=")[1]);
    else if (a.startsWith("--addon-attach=")) out.addonAttach = Number(a.split("=")[1]);
    else if (a.startsWith("--addon-arpu=")) out.addonArpu = Number(a.split("=")[1]);
    else if (a.startsWith("--start=")) out.startShops = Number(a.split("=")[1]);
    else if (a.startsWith("--target=")) out.target = Number(a.split("=")[1]);
  }
  return out;
}

function blendedArpu(cfg) {
  return cfg.annualShare * cfg.annualPrice + (1 - cfg.annualShare) * cfg.monthlyPrice;
}

function run(cfg) {
  const arpu = blendedArpu(cfg);
  const addonContribution = cfg.addonAttach * cfg.addonArpu;
  const effectiveArpu = arpu + addonContribution;

  let shops = cfg.startShops;
  let month = 0;
  const rows = [];
  const milestones = [10, 25, 50, 100, 150, 200];
  const hit = {};

  const ramp = [...DEFAULT_NET_NEW_BY_MONTH];
  // If still short of target after ramp, keep adding at last pace until hit
  while (shops < cfg.target && month < 60) {
    const planned = ramp[month] ?? Math.max(2, Math.round((ramp.at(-1) ?? 8) * 0.75));
    // Apply soft churn only to the monthly-billing share of the base
    const monthlyCohort = shops * (1 - cfg.annualShare);
    const churned = Math.round(monthlyCohort * cfg.monthlyChurn);
    const net = Math.max(0, planned);
    shops = Math.max(0, shops - churned + net);
    month += 1;

    const mrr = shops * effectiveArpu;
    const arr = mrr * 12;
    rows.push({
      month,
      shops: Math.min(shops, cfg.target),
      netAdds: net,
      churned,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
    });

    for (const m of milestones) {
      if (!hit[m] && shops >= m) hit[m] = month;
    }
    if (shops >= cfg.target) {
      shops = cfg.target;
      rows[rows.length - 1].shops = cfg.target;
      rows[rows.length - 1].mrr = Math.round(cfg.target * effectiveArpu);
      rows[rows.length - 1].arr = Math.round(cfg.target * effectiveArpu * 12);
      break;
    }
  }

  const at200 = rows[rows.length - 1];
  // Illustrative OpEx / COGS (Core path — no MOTOR)
  const infraAt200 = 2_500; // Neon + Vercel + Clerk + observability ballpark
  const supportAt200 = 8_000; // 1–2 CS / success FTE blended loaded
  const salesAt200 = 12_000; // AE/SDR + ads ongoing
  const opexAt200 = infraAt200 + supportAt200 + salesAt200;
  const grossMrr = at200.mrr;
  const contrib = grossMrr - opexAt200;

  return {
    assumptions: {
      plan: "Core (STARTER)",
      motor: "OFF — shop labor library + reference taxonomy + AI gap-fill",
      listMonthly: cfg.monthlyPrice,
      annualPerMonth: cfg.annualPrice,
      annualShare: cfg.annualShare,
      blendedCoreArpu: Math.round(arpu * 100) / 100,
      addonAttach: cfg.addonAttach,
      addonArpu: cfg.addonArpu,
      effectiveArpu: Math.round(effectiveArpu * 100) / 100,
      monthlyChurnOnMonthlyCohort: cfg.monthlyChurn,
      startShops: cfg.startShops,
      target: cfg.target,
      releasePhase: "P0 Core CRM (PHASED-ROLLOUT.md) — motorLabor / sms / growthEngine dark",
    },
    milestones: hit,
    monthsToTarget: month,
    final: at200,
    unitEconomicsAt200: {
      mrr: at200.mrr,
      arr: at200.arr,
      illustrativeOpexMo: opexAt200,
      contributionMo: Math.round(contrib),
      motorCogsMo: 0,
      note: "OpEx is illustrative — not a full P&L. MOTOR COGS stay $0 until Pro unlock.",
    },
    contrastProUnlock: {
      when: "After ~100–150 Core shops OR signed MOTOR DaaS commercial license + demand",
      proListMonthly: 279,
      proAnnual: 239,
      risk: "MOTOR DaaS commercial license is a platform COGS / contract gate — do not flip motorLabor until licensed",
    },
    series: rows,
  };
}

function printHuman(result) {
  const a = result.assumptions;
  console.log("\n══ ShopRally Core → 200 shops (no MOTOR) ══\n");
  console.log(`Plan: ${a.plan}`);
  console.log(`Labor: ${a.motor}`);
  console.log(`Price: $${a.listMonthly}/mo list · $${a.annualPerMonth}/mo annual`);
  console.log(
    `Mix: ${(a.annualShare * 100).toFixed(0)}% annual → blended Core ARPU $${a.blendedCoreArpu}`,
  );
  console.log(
    `Add-ons: ${(a.addonAttach * 100).toFixed(0)}% attach @ $${a.addonArpu} → effective ARPU $${a.effectiveArpu}`,
  );
  console.log(`Churn: ${(a.monthlyChurnOnMonthlyCohort * 100).toFixed(1)}%/mo on monthly cohort only`);
  console.log(`Release: ${a.releasePhase}`);
  console.log("\n── Milestones ──");
  for (const [shops, mo] of Object.entries(result.milestones)) {
    console.log(`  ${shops} shops → month ${mo}`);
  }
  console.log(`\nHit ${a.target} shops in ~${result.monthsToTarget} months`);
  console.log(
    `At ${a.target}: MRR ~$${result.final.mrr.toLocaleString()} · ARR ~$${result.final.arr.toLocaleString()}`,
  );
  const u = result.unitEconomicsAt200;
  console.log("\n── At 200 (illustrative) ──");
  console.log(`  MOTOR COGS: $${u.motorCogsMo}/mo`);
  console.log(`  OpEx ballpark: $${u.illustrativeOpexMo.toLocaleString()}/mo`);
  console.log(`  Contribution: ~$${u.contributionMo.toLocaleString()}/mo`);
  console.log(`  ${u.note}`);
  console.log("\n── Pro / MOTOR unlock ──");
  console.log(`  ${result.contrastProUnlock.when}`);
  console.log(`  ${result.contrastProUnlock.risk}`);
  console.log("\n── Monthly series (first 12 + last 3) ──");
  const head = result.series.slice(0, 12);
  const tail = result.series.slice(-3);
  for (const r of head) {
    console.log(
      `  M${String(r.month).padStart(2)}  shops=${String(r.shops).padStart(3)}  +${r.netAdds}/-${r.churned}  MRR=$${r.mrr.toLocaleString()}`,
    );
  }
  if (result.series.length > 15) {
    console.log("  …");
    for (const r of tail) {
      console.log(
        `  M${String(r.month).padStart(2)}  shops=${String(r.shops).padStart(3)}  +${r.netAdds}/-${r.churned}  MRR=$${r.mrr.toLocaleString()}`,
      );
    }
  }
  console.log("");
}

const cfg = parseArgs(process.argv.slice(2));
const result = run(cfg);
if (cfg.json) console.log(JSON.stringify(result, null, 2));
else printHuman(result);
