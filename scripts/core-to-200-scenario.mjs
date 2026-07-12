#!/usr/bin/env node
/**
 * Core → 200 shops scenario WITH AI Instant Quote.
 *
 * Product: natural-language price/labor asks, e.g.
 *   "how much is front brake pads and rotors on 2014 honda accord exl v6"
 * → YMM parse + job match + shop-rate ballpark (labor library / AI hours — NOT licensed MOTOR).
 *
 * Usage:
 *   node scripts/core-to-200-scenario.mjs
 *   node scripts/core-to-200-scenario.mjs --json
 *   node scripts/core-to-200-scenario.mjs --ai-attach=0.55 --breakout
 */

const CORE_MONTHLY = 119;
const CORE_ANNUAL_MO = 109;
const TARGET_SHOPS = 200;

/** AI Instant Quote add-on — Core path (no MOTOR). */
const AI_QUOTE_ADDON_MO = 39; // unlimited-ish pack / higher allowance
const AI_QUOTE_INCLUDED_ON_CORE = 40; // free NL quotes / mo on base Core
const AI_QUOTE_OVERAGE_PER_100 = 15; // $15 per extra 100 quotes
const AI_LLM_COGS_PER_QUOTE = 0.04; // illustrative LLM+infra $

/** Default ramp: planned gross adds before churn each month. */
const DEFAULT_GROSS_ADDS_BY_MONTH = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 12, 10, 8, 6, 4, 2,
];

/**
 * Sales channel mix of *new* logos (sums ~1.0).
 * Inbound grows as AI Quote demos / SEO content land.
 */
const CHANNEL_MIX_BY_PHASE = {
  // months 1–6
  early: { founding_referral: 0.45, outbound: 0.35, inbound_ai_demo: 0.1, partner: 0.1 },
  // 7–12
  mid: { founding_referral: 0.2, outbound: 0.35, inbound_ai_demo: 0.3, partner: 0.15 },
  // 13+
  scale: { founding_referral: 0.1, outbound: 0.3, inbound_ai_demo: 0.4, partner: 0.2 },
};

function parseArgs(argv) {
  const out = {
    monthlyPrice: CORE_MONTHLY,
    annualPrice: CORE_ANNUAL_MO,
    annualShare: 0.55,
    monthlyChurn: 0.025,
    webAttach: 0.12,
    webArpu: 120,
    aiAttach: 0.48, // % of Core shops paying AI Instant Quote add-on
    aiAddonPrice: AI_QUOTE_ADDON_MO,
    aiIncludedFree: AI_QUOTE_INCLUDED_ON_CORE,
    // Among AI-addon shops: avg paid quotes/mo above free tier used for overage
    // (addon includes 500; model treats overage only for free-tier-only heavy users)
    aiFreeHeavyShare: 0.18, // Core shops NOT on addon but using free tier heavily
    aiFreeHeavyExtraQuotes: 80, // extra quotes / mo above included → overage packs
    aiAddonQuotesMo: 220, // usage among addon shops (cogs)
    aiFreeQuotesMo: 28, // usage among free-only shops
    startShops: 0,
    target: TARGET_SHOPS,
    json: false,
    breakout: true,
  };
  for (const a of argv) {
    if (a === "--json") out.json = true;
    else if (a === "--breakout") out.breakout = true;
    else if (a === "--no-breakout") out.breakout = false;
    else if (a.startsWith("--monthly-price=")) out.monthlyPrice = Number(a.split("=")[1]);
    else if (a.startsWith("--annual-price=")) out.annualPrice = Number(a.split("=")[1]);
    else if (a.startsWith("--annual-share=")) out.annualShare = Number(a.split("=")[1]);
    else if (a.startsWith("--monthly-churn=")) out.monthlyChurn = Number(a.split("=")[1]);
    else if (a.startsWith("--web-attach=")) out.webAttach = Number(a.split("=")[1]);
    else if (a.startsWith("--addon-attach=")) out.webAttach = Number(a.split("=")[1]); // alias
    else if (a.startsWith("--web-arpu=")) out.webArpu = Number(a.split("=")[1]);
    else if (a.startsWith("--ai-attach=")) out.aiAttach = Number(a.split("=")[1]);
    else if (a.startsWith("--ai-price=")) out.aiAddonPrice = Number(a.split("=")[1]);
    else if (a.startsWith("--start=")) out.startShops = Number(a.split("=")[1]);
    else if (a.startsWith("--target=")) out.target = Number(a.split("=")[1]);
  }
  return out;
}

function blendedCoreArpu(cfg) {
  return cfg.annualShare * cfg.annualPrice + (1 - cfg.annualShare) * cfg.monthlyPrice;
}

function channelForMonth(month) {
  if (month <= 6) return CHANNEL_MIX_BY_PHASE.early;
  if (month <= 12) return CHANNEL_MIX_BY_PHASE.mid;
  return CHANNEL_MIX_BY_PHASE.scale;
}

function productMix(cfg) {
  // Mutually exclusive buckets for sales breakout (of paying shops)
  const ai = cfg.aiAttach;
  const web = cfg.webAttach;
  // Approximate independence with overlap
  const both = ai * web;
  const aiOnly = ai - both;
  const webOnly = web - both;
  const coreOnly = Math.max(0, 1 - aiOnly - webOnly - both);
  return {
    core_only: round4(coreOnly),
    core_ai: round4(aiOnly),
    core_web: round4(webOnly),
    core_ai_web: round4(both),
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function money(n) {
  return Math.round(n);
}

function revenueAtShops(shops, cfg) {
  const coreArpu = blendedCoreArpu(cfg);
  const coreMrr = shops * coreArpu;
  const webMrr = shops * cfg.webAttach * cfg.webArpu;
  const aiAddonMrr = shops * cfg.aiAttach * cfg.aiAddonPrice;

  // Overage: heavy free-tier users only (addon shops assumed within pack)
  const freeOnlyShops = shops * (1 - cfg.aiAttach);
  const heavyFree = freeOnlyShops * cfg.aiFreeHeavyShare;
  const extraQuotes = heavyFree * Math.max(0, cfg.aiFreeHeavyExtraQuotes);
  const overagePacks = extraQuotes / 100;
  const aiOverageMrr = overagePacks * AI_QUOTE_OVERAGE_PER_100;

  // VIN decode OFF on this Core path — no overage revenue
  const vinOverageMrr = 0;

  const totalMrr =
    coreMrr + webMrr + aiAddonMrr + aiOverageMrr + vinOverageMrr;

  // AI LLM COGS
  const quotesAddon = shops * cfg.aiAttach * cfg.aiAddonQuotesMo;
  const quotesFree = shops * (1 - cfg.aiAttach) * cfg.aiFreeQuotesMo;
  const aiCogs = (quotesAddon + quotesFree) * AI_LLM_COGS_PER_QUOTE;

  return {
    coreMrr: money(coreMrr),
    webMrr: money(webMrr),
    aiAddonMrr: money(aiAddonMrr),
    aiOverageMrr: money(aiOverageMrr),
    vinOverageMrr: money(vinOverageMrr),
    totalMrr: money(totalMrr),
    arr: money(totalMrr * 12),
    aiQuotesMo: Math.round(quotesAddon + quotesFree),
    aiLlmCogsMo: money(aiCogs),
    motorCogsMo: 0,
  };
}

function run(cfg) {
  const coreArpu = blendedCoreArpu(cfg);
  let shops = cfg.startShops;
  let month = 0;
  const rows = [];
  const milestones = [10, 25, 50, 100, 150, 200];
  const hit = {};
  const channelAdds = {
    founding_referral: 0,
    outbound: 0,
    inbound_ai_demo: 0,
    partner: 0,
  };
  let totalGrossAdds = 0;
  let totalChurned = 0;

  const ramp = [...DEFAULT_GROSS_ADDS_BY_MONTH];

  while (shops < cfg.target && month < 60) {
    month += 1;
    const planned = ramp[month - 1] ?? Math.max(2, Math.round((ramp.at(-1) ?? 8) * 0.75));
    const monthlyCohort = shops * (1 - cfg.annualShare);
    const churned = Math.round(monthlyCohort * cfg.monthlyChurn);
    const grossAdds = Math.max(0, planned);

    const mix = channelForMonth(month);
    for (const [k, w] of Object.entries(mix)) {
      channelAdds[k] += grossAdds * w;
    }
    totalGrossAdds += grossAdds;
    totalChurned += churned;

    shops = Math.max(0, shops - churned + grossAdds);
    const capped = Math.min(shops, cfg.target);
    const rev = revenueAtShops(capped, cfg);

    rows.push({
      month,
      shops: capped,
      grossAdds,
      churned,
      ...rev,
    });

    for (const m of milestones) {
      if (!hit[m] && shops >= m) hit[m] = month;
    }
    if (shops >= cfg.target) {
      shops = cfg.target;
      const last = rows[rows.length - 1];
      Object.assign(last, { shops: cfg.target, ...revenueAtShops(cfg.target, cfg) });
      break;
    }
  }

  const at = revenueAtShops(cfg.target, cfg);
  const mix = productMix(cfg);
  const channelShare = {};
  for (const [k, v] of Object.entries(channelAdds)) {
    channelShare[k] = totalGrossAdds ? Math.round((v / totalGrossAdds) * 1000) / 1000 : 0;
  }

  // Sales $ breakout at steady 200 — by product line
  const salesRevenue = {
    core_subscription: at.coreMrr,
    ai_instant_quote_addon: at.aiAddonMrr,
    ai_quote_overage: at.aiOverageMrr,
    web_presence: at.webMrr,
    vin_overage: at.vinOverageMrr,
    total_mrr: at.totalMrr,
    total_arr: at.arr,
  };

  // Shop-count breakout at 200
  const shopBreakout = {
    core_only: Math.round(cfg.target * mix.core_only),
    core_ai: Math.round(cfg.target * mix.core_ai),
    core_web: Math.round(cfg.target * mix.core_web),
    core_ai_web: Math.round(cfg.target * mix.core_ai_web),
  };

  // MRR by shop bundle (approx using list math)
  const bundleMrr = {
    core_only: money(shopBreakout.core_only * coreArpu),
    core_ai: money(shopBreakout.core_ai * (coreArpu + cfg.aiAddonPrice)),
    core_web: money(shopBreakout.core_web * (coreArpu + cfg.webArpu)),
    core_ai_web: money(
      shopBreakout.core_ai_web * (coreArpu + cfg.aiAddonPrice + cfg.webArpu),
    ),
  };

  const opexAt200 = 2_500 + 8_000 + 12_000 + 1_500; // +$1.5k AI observability/support
  const contrib = at.totalMrr - opexAt200 - at.aiLlmCogsMo;

  return {
    feature: {
      name: "AI Instant Quote",
      example:
        "how much is front brake pads and rotors on 2014 honda accord exl v6",
      parses: ["YMM / trim", "job (pads+rotors)", "position (front)"],
      returns: [
        "shop labor hours (library or AI-labeled)",
        "parts placeholders / catalog hints",
        "ballpark $ at shop labor rate + matrix",
      ],
      notIncluded: "Licensed MOTOR flat-rate hours (Pro+ / motorLabor release)",
      coreIncludedQuotesMo: cfg.aiIncludedFree,
      addonPriceMo: cfg.aiAddonPrice,
      overagePer100: AI_QUOTE_OVERAGE_PER_100,
    },
    assumptions: {
      plan: "Core (STARTER)",
      motor: "OFF",
      listMonthly: cfg.monthlyPrice,
      annualPerMonth: cfg.annualPrice,
      annualShare: cfg.annualShare,
      blendedCoreArpu: Math.round(coreArpu * 100) / 100,
      webAttach: cfg.webAttach,
      webArpu: cfg.webArpu,
      aiAttach: cfg.aiAttach,
      aiAddonPrice: cfg.aiAddonPrice,
      monthlyChurnOnMonthlyCohort: cfg.monthlyChurn,
      startShops: cfg.startShops,
      target: cfg.target,
    },
    milestones: hit,
    monthsToTarget: month,
    final: { shops: cfg.target, ...at },
    revenueBreakoutAt200: salesRevenue,
    revenueShareAt200: Object.fromEntries(
      Object.entries(salesRevenue)
        .filter(([k]) => k !== "total_mrr" && k !== "total_arr")
        .map(([k, v]) => [k, Math.round((v / at.totalMrr) * 1000) / 10 + "%"]),
    ),
    salesChannelBreakout: {
      logos_acquired_gross: Math.round(totalGrossAdds),
      logos_churned: totalChurned,
      mix_of_gross_adds: channelShare,
      counts_approx: Object.fromEntries(
        Object.entries(channelShare).map(([k, w]) => [k, Math.round(totalGrossAdds * w)]),
      ),
    },
    productMixAt200: {
      shares: mix,
      shops: shopBreakout,
      mrr_by_bundle: bundleMrr,
    },
    unitEconomicsAt200: {
      mrr: at.totalMrr,
      arr: at.arr,
      aiLlmCogsMo: at.aiLlmCogsMo,
      motorCogsMo: 0,
      illustrativeOpexMo: opexAt200,
      contributionMo: money(contrib),
    },
    series: rows,
  };
}

function pct(n, d) {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function printHuman(result) {
  const a = result.assumptions;
  const f = result.feature;
  console.log("\n══ ShopRally Core → 200 + AI Instant Quote (no MOTOR) ══\n");
  console.log(`Feature: ${f.name}`);
  console.log(`  Example: "${f.example}"`);
  console.log(`  Core includes: ${f.coreIncludedQuotesMo} NL quotes/mo`);
  console.log(`  Add-on: $${f.addonPriceMo}/mo · overage $${f.overagePer100}/100`);
  console.log(`  Labor source: shop library / AI-labeled hours — ${f.notIncluded}`);
  console.log(`\nPlan: ${a.plan} · MOTOR ${a.motor}`);
  console.log(`Core price: $${a.listMonthly}/mo · $${a.annualPerMonth} annual`);
  console.log(
    `Mix: ${(a.annualShare * 100).toFixed(0)}% annual → Core ARPU $${a.blendedCoreArpu}`,
  );
  console.log(
    `Attach: AI Quote ${(a.aiAttach * 100).toFixed(0)}% @ $${a.aiAddonPrice} · Web ${(a.webAttach * 100).toFixed(0)}% @ $${a.webArpu}`,
  );

  console.log("\n── Milestones ──");
  for (const [shops, mo] of Object.entries(result.milestones)) {
    console.log(`  ${shops} shops → month ${mo}`);
  }
  console.log(`\nHit ${a.target} in ~${result.monthsToTarget} months`);

  const r = result.revenueBreakoutAt200;
  console.log("\n══ REVENUE BREAKOUT @ 200 shops (monthly) ══");
  console.log(`  Core subscription ...... $${r.core_subscription.toLocaleString()}  (${pct(r.core_subscription, r.total_mrr)})`);
  console.log(`  AI Instant Quote add-on  $${r.ai_instant_quote_addon.toLocaleString()}  (${pct(r.ai_instant_quote_addon, r.total_mrr)})`);
  console.log(`  AI quote overage ....... $${r.ai_quote_overage.toLocaleString()}  (${pct(r.ai_quote_overage, r.total_mrr)})`);
  console.log(`  Web presence ........... $${r.web_presence.toLocaleString()}  (${pct(r.web_presence, r.total_mrr)})`);
  console.log(`  VIN overage ............ $${r.vin_overage.toLocaleString()}  (${pct(r.vin_overage, r.total_mrr)})`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Total MRR .............. $${r.total_mrr.toLocaleString()}`);
  console.log(`  Total ARR .............. $${r.total_arr.toLocaleString()}`);

  const u = result.unitEconomicsAt200;
  console.log("\n── COGS / contribution @ 200 ──");
  console.log(`  AI LLM COGS: $${u.aiLlmCogsMo}/mo · MOTOR COGS: $0`);
  console.log(`  OpEx ballpark: $${u.illustrativeOpexMo.toLocaleString()}/mo`);
  console.log(`  Contribution: ~$${u.contributionMo.toLocaleString()}/mo`);

  const s = result.salesChannelBreakout;
  console.log("\n══ SALES CHANNEL BREAKOUT (gross logos acquired) ══");
  console.log(`  Total gross adds: ${s.logos_acquired_gross} · churned: ${s.logos_churned}`);
  for (const [k, c] of Object.entries(s.counts_approx)) {
    const label = {
      founding_referral: "Founding / referral",
      outbound: "Outbound (AE/SDR)",
      inbound_ai_demo: "Inbound (AI Quote demo)",
      partner: "Partner / reseller",
    }[k] ?? k;
    console.log(`  ${label.padEnd(28)} ${String(c).padStart(4)}  (${(s.mix_of_gross_adds[k] * 100).toFixed(0)}%)`);
  }

  const p = result.productMixAt200;
  console.log("\n══ SALES PRODUCT MIX @ 200 (shops → MRR) ══");
  console.log(
    `  Core only .............. ${String(p.shops.core_only).padStart(3)} shops · $${p.mrr_by_bundle.core_only.toLocaleString()} MRR`,
  );
  console.log(
    `  Core + AI Quote ........ ${String(p.shops.core_ai).padStart(3)} shops · $${p.mrr_by_bundle.core_ai.toLocaleString()} MRR`,
  );
  console.log(
    `  Core + Web ............. ${String(p.shops.core_web).padStart(3)} shops · $${p.mrr_by_bundle.core_web.toLocaleString()} MRR`,
  );
  console.log(
    `  Core + AI + Web ........ ${String(p.shops.core_ai_web).padStart(3)} shops · $${p.mrr_by_bundle.core_ai_web.toLocaleString()} MRR`,
  );

  console.log("\n── Monthly series (M1–12 + last 3) ──");
  const head = result.series.slice(0, 12);
  const tail = result.series.slice(-3);
  for (const row of head) {
    console.log(
      `  M${String(row.month).padStart(2)}  shops=${String(row.shops).padStart(3)}  MRR=$${String(row.totalMrr).padStart(6)}  (core $${row.coreMrr} · ai $${row.aiAddonMrr + row.aiOverageMrr} · web $${row.webMrr})`,
    );
  }
  if (result.series.length > 15) {
    console.log("  …");
    for (const row of tail) {
      console.log(
        `  M${String(row.month).padStart(2)}  shops=${String(row.shops).padStart(3)}  MRR=$${String(row.totalMrr).padStart(6)}  (core $${row.coreMrr} · ai $${row.aiAddonMrr + row.aiOverageMrr} · web $${row.webMrr})`,
      );
    }
  }
  console.log("");
}

const cfg = parseArgs(process.argv.slice(2));
const result = run(cfg);
if (cfg.json) console.log(JSON.stringify(result, null, 2));
else printHuman(result);
