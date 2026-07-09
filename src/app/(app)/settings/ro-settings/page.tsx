import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { RoSettings } from "@/components/settings/ro-settings";
import { resolveAdvanced } from "@/lib/ro-settings";
import { resolveTransparency } from "@/lib/transparency";
import { resolveCompletedRoArchiveSettings } from "@/lib/job-board-archive";
import { resolveJobBoardPipelineConfig } from "@/lib/job-board-pipeline";
import { DEFAULT_ESTIMATE_TERMS_HTML } from "@/lib/estimate-terms-default";

const c = (cents: number) => cents / 100;

export default async function RoSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const shopId = await getShopId();
  const [shop, laborRates, fees, discounts] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        laborRateCents: true,
        taxRateBps: true,
        taxOnLabor: true,
        taxOnParts: true,
        taxOnFees: true,
        taxCapCents: true,
        gpPerHourGoalCents: true,
        roAdvanced: true,
        completedRoAutoArchiveEnabled: true,
        completedRoAutoArchiveDays: true,
        jobBoardPipeline: true,
        zip: true,
        docTransparency: true,
        estimateTermsHtml: true,
        invoiceTermsHtml: true,
        estimateTermsVersion: true,
        estimateTermsUpdatedAt: true,
        estimateJobsLayout: true,
      },
    }),
    prisma.laborRate.findMany({ where: { shopId }, orderBy: { sortOrder: "asc" } }),
    prisma.shopFeeTemplate.findMany({ where: { shopId }, orderBy: { sortOrder: "asc" } }),
    prisma.shopDiscountTemplate.findMany({ where: { shopId }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!shop) notFound();

  return (
    <RoSettings
      laborRates={
        laborRates.length
          ? laborRates.map((r) => ({ name: r.name, rate: c(r.rateCents), isDefault: r.isDefault }))
          : [{ name: "Standard labor rate", rate: c(shop.laborRateCents), isDefault: true }]
      }
      fees={fees.map((f) => ({
        name: f.name,
        autoApply: f.autoApply,
        method: f.method,
        base: f.base,
        amount: c(f.amount),
        cap: f.capCents == null ? null : c(f.capCents),
        taxable: f.taxable,
      }))}
      discounts={discounts.map((d) => ({
        name: d.name,
        method: d.method,
        base: d.base,
        amount: c(d.amount),
        cap: d.capCents == null ? null : c(d.capCents),
      }))}
      taxes={{
        salesTaxPct: c(shop.taxRateBps),
        taxOnLabor: shop.taxOnLabor,
        taxOnParts: shop.taxOnParts,
        taxOnFees: shop.taxOnFees,
        cap: shop.taxCapCents == null ? null : c(shop.taxCapCents),
      }}
      gpGoal={shop.gpPerHourGoalCents == null ? null : c(shop.gpPerHourGoalCents)}
      advanced={resolveAdvanced(shop.roAdvanced)}
      archive={resolveCompletedRoArchiveSettings(shop)}
      pipeline={resolveJobBoardPipelineConfig(shop.jobBoardPipeline)}
      zip={shop.zip}
      transparency={resolveTransparency(shop.docTransparency)}
      estimateTerms={{
        initialEstimateHtml: shop.estimateTermsHtml?.trim() || DEFAULT_ESTIMATE_TERMS_HTML,
        initialInvoiceHtml: shop.invoiceTermsHtml ?? "",
        version: shop.estimateTermsVersion ?? "1.0",
        updatedAt: shop.estimateTermsUpdatedAt,
      }}
      estimateJobsLayout={shop.estimateJobsLayout}
      initialSection={section}
    />
  );
}
