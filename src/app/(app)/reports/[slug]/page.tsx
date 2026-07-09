import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ReportRunner } from "@/components/reports/report-runner";
import { getShopId } from "@/lib/shop";
import { getReportDefinition, parseReportFilters } from "@/lib/reports";
import { getReportTechnicians, runReport } from "@/server/reports";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getReportDefinition(slug);
  return { title: def ? `${def.name} — Reports` : "Report — ShopRally" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const definition = getReportDefinition(slug);
  if (!definition) notFound();

  const shopId = await getShopId();
  const filters = parseReportFilters(sp);

  const [data, technicians] = await Promise.all([
    runReport(slug, shopId, filters),
    getReportTechnicians(shopId),
  ]);

  if (!data) notFound();

  return (
    <div className="workspace-surface">
      <Suspense fallback={null}>
        <ReportRunner definition={definition} data={data} technicians={technicians} />
      </Suspense>
    </div>
  );
}
