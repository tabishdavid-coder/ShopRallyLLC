import "server-only";

import { prisma } from "@/db/client";
import { getEmail } from "@/server/services/email";
import { getSeoAutomationAdmin } from "@/server/seo-automation";
import { ensureShopSeoSettings } from "@/server/seo-settings";
import { createSeoReportSnapshot } from "@/server/seo-reports";

function formatReportBody(input: {
  shopName: string;
  properties: Awaited<ReturnType<typeof getSeoAutomationAdmin>>["properties"];
  recentRuns: Awaited<ReturnType<typeof getSeoAutomationAdmin>>["recentRuns"];
}): string {
  const lines: string[] = [
    `SEO Autopilot monthly report — ${input.shopName}`,
    "",
    "Sites under management:",
  ];

  for (const p of input.properties) {
    lines.push(
      `• ${p.domain} (${p.source}) — score ${p.latestScore ?? "n/a"}% — autopilot ${p.automationEnabled ? "on" : "off"}`,
    );
  }

  lines.push("", "Recent activity:");
  for (const run of input.recentRuns.slice(0, 5)) {
    lines.push(
      `• ${run.jobType} ${run.status}${run.seoScore != null ? ` — ${run.seoScore}%` : ""}${
        run.gscClicks != null ? ` — GSC ${run.gscClicks} clicks` : ""
      }`,
    );
  }

  lines.push(
    "",
    "Manage settings: Growth Engine → SEO Autopilot in ShopRally.",
    "",
    "— ShopRally SEO Autopilot",
  );

  return lines.join("\n");
}

export type SeoMonthlyReportResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  to?: string;
};

export async function sendShopSeoMonthlyReport(shopId: string): Promise<SeoMonthlyReportResult> {
  const settings = await ensureShopSeoSettings(shopId);
  if (!settings.monthlyReportEnabled) {
    return { ok: true, skipped: true, reason: "Monthly reports disabled." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, email: true },
  });
  if (!shop) return { ok: false, reason: "Shop not found." };

  const to = settings.reportEmail?.trim() || shop.email?.trim();
  if (!to) {
    return { ok: true, skipped: true, reason: "No report email configured." };
  }

  const admin = await getSeoAutomationAdmin(shopId, true, true);
  const subject = `SEO report — ${shop.name} — ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}`;
  const body = formatReportBody({
    shopName: shop.name,
    properties: admin.properties,
    recentRuns: admin.recentRuns,
  });

  const email = getEmail();
  await email.send(to, subject, body);

  const periodLabel = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const topScore = admin.properties.reduce<number | null>((best, p) => {
    if (p.latestScore == null) return best;
    return best == null ? p.latestScore : Math.max(best, p.latestScore);
  }, null);
  const latestGscRun = admin.recentRuns.find((r) => r.gscClicks != null);

  await createSeoReportSnapshot({
    shopId,
    periodLabel,
    sentTo: to,
    summary: {
      propertyCount: admin.properties.length,
      topScore,
      gscClicks: latestGscRun?.gscClicks ?? null,
      recentRunCount: admin.recentRuns.length,
      highlights: admin.recentRuns.slice(0, 5).map((run) => {
        const parts = [run.jobType, run.status];
        if (run.seoScore != null) parts.push(`${run.seoScore}%`);
        if (run.gscClicks != null) parts.push(`${run.gscClicks} GSC clicks`);
        return parts.join(" · ");
      }),
    },
  });

  await prisma.shopSeoSettings.update({
    where: { shopId },
    data: { lastReportSentAt: new Date() },
  });

  return { ok: true, to };
}

export async function runAllShopSeoMonthlyReports() {
  const shops = await prisma.shopSeoSettings.findMany({
    where: { monthlyReportEnabled: true },
    select: { shopId: true },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const { shopId } of shops) {
    try {
      const result = await sendShopSeoMonthlyReport(shopId);
      if (!result.ok) failed += 1;
      else if (result.skipped) skipped += 1;
      else sent += 1;
    } catch {
      failed += 1;
    }
  }

  return { scanned: shops.length, sent, skipped, failed };
}
