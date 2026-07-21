import { redirect } from "next/navigation";

/** Legacy Overview URL → KPI performance dashboard. */
export default async function DashboardOverviewRedirect({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.range) params.set("range", sp.range);
  else if (sp.period) params.set("range", sp.period);
  if (sp.from) params.set("from", sp.from);
  if (sp.to) params.set("to", sp.to);
  const q = params.toString();
  redirect(q ? `/dashboard/kpis?${q}` : "/dashboard/kpis");
}
