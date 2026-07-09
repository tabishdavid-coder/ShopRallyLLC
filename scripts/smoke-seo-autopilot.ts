/**
 * Smoke checks for SEO Autopilot — no dev server required.
 * Run: npx tsx scripts/smoke-seo-autopilot.ts
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const requiredFiles = [
  "src/lib/seo-autopilot-nav.ts",
  "src/lib/seo-ga4-analytics.ts",
  "src/lib/seo-analytics-export.ts",
  "src/lib/seo-ga4-reconnect.ts",
  "src/lib/seo-recommendations.ts",
  "src/lib/seo-stripe-products.ts",
  "src/components/marketing/seo-automation/seo-google-reconnect-banner.tsx",
  "src/server/seo-autopilot-page.ts",
  "src/server/seo-reports.ts",
  "src/server/seo-ga4-analytics.ts",
  "src/server/seo-gsc-cache.ts",
  "src/server/seo-gsc-cache-runner.ts",
  "src/server/services/seo-ga4-data.ts",
  "src/server/services/seo-stripe-checkout.ts",
  "src/components/marketing/seo-automation/seo-autopilot-shell.tsx",
  "src/components/marketing/seo-automation/seo-setup-wizard.tsx",
  "src/components/marketing/seo-automation/seo-autopilot-reports.tsx",
  "src/components/marketing/seo-automation/seo-ga4-charts.tsx",
  "src/app/(app)/marketing/seo-automation/layout.tsx",
  "src/app/(app)/marketing/seo-automation/page.tsx",
  "src/app/(app)/marketing/seo-automation/analytics/page.tsx",
  "src/app/(app)/marketing/seo-automation/activity/page.tsx",
  "src/app/(app)/marketing/seo-automation/health/page.tsx",
  "src/app/(app)/marketing/seo-automation/sites/page.tsx",
  "src/app/(app)/marketing/seo-automation/reports/page.tsx",
  "src/app/(app)/marketing/seo-automation/plan/page.tsx",
  "src/inngest/functions/seo-gsc-cache-nightly.ts",
  "src/app/api/cron/seo-gsc-cache/route.ts",
  "prisma/migrations/20260703230000_seo_report_snapshots/migration.sql",
  "prisma/migrations/20260703240000_seo_ga4_metrics_cache/migration.sql",
  "prisma/migrations/20260703250000_seo_dismissed_recommendations/migration.sql",
  "prisma/migrations/20260703260000_seo_checkout_snooze/migration.sql",
];

const requiredTabs = ["overview", "analytics", "activity", "health", "sites", "reports", "plan"];

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

let missing = 0;
for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`  missing: ${rel}`);
    missing += 1;
  }
}
if (missing > 0) fail(`${missing} required file(s) missing`);

const navSrc = fs.readFileSync(path.join(root, "src/lib/seo-autopilot-nav.ts"), "utf8");
for (const tab of requiredTabs) {
  if (!navSrc.includes(`id: "${tab}"`)) {
    fail(`seo-autopilot-nav missing tab: ${tab}`);
  }
}

console.log("OK: SEO Autopilot smoke checks passed");
console.log(`  ${requiredFiles.length} files present`);
console.log(`  ${requiredTabs.length} tabs registered`);

const webhookSrc = fs.readFileSync(
  path.join(root, "src/app/api/webhooks/stripe/route.ts"),
  "utf8",
);
if (!webhookSrc.includes("handleSeoCheckoutCompleted") || !webhookSrc.includes("SEO_CHECKOUT_KIND")) {
  fail("Stripe webhook missing SEO add-on fulfillment");
}
console.log("  Stripe webhook SEO fulfillment wired");
