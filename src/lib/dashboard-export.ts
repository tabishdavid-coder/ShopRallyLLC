import { downloadCsv, toCsv } from "@/lib/csv";
import { collectionRatePct, type DashboardData } from "@/lib/dashboard";

/** Download KPI + chart snapshot as CSV. */
export function exportDashboardSnapshot(data: DashboardData, shopName: string) {
  const { kpis, rangeLabel } = data;
  const collectionRate = collectionRatePct(kpis.invoicedCents, kpis.collectedCents);

  const kpiRows = [
    { section: "kpi", metric: "Cars in shop", value: kpis.carsInShop, period: rangeLabel },
    {
      section: "kpi",
      metric: "Gross volume (cents)",
      value: kpis.grossVolumeCents,
      prior: kpis.grossVolumePriorCents,
      period: rangeLabel,
    },
    {
      section: "kpi",
      metric: "Open ROs",
      value: kpis.openRoCount,
      estimates: kpis.estimatesCount,
      wip: kpis.wipCount,
      period: rangeLabel,
    },
    {
      section: "kpi",
      metric: "Completed ROs",
      value: kpis.completedInPeriod,
      prior: kpis.completedPrior,
      period: rangeLabel,
    },
    {
      section: "kpi",
      metric: "ARO (cents)",
      value: kpis.aroCents,
      prior: kpis.aroPriorCents,
      period: rangeLabel,
    },
    {
      section: "kpi",
      metric: "Outstanding AR (cents)",
      value: kpis.outstandingArCents,
      period: "current",
    },
    {
      section: "kpi",
      metric: "Appointments today",
      value: kpis.appointmentsToday,
      period: "today",
    },
    {
      section: "kpi",
      metric: "Appointments this week",
      value: kpis.appointmentsThisWeek,
      period: "7 days",
    },
    {
      section: "kpi",
      metric: "Tire orders pending approval",
      value: kpis.tireOrdersPending,
      period: "current",
    },
    {
      section: "kpi",
      metric: "Collection rate (%)",
      value: collectionRate ?? "—",
      invoiced_cents: kpis.invoicedCents,
      collected_cents: kpis.collectedCents,
      period: rangeLabel,
    },
  ];

  const revenueRows = data.revenueTrend.map((d) => ({
    section: "revenue_trend",
    date: d.date,
    label: d.label,
    revenue_cents: d.cents,
  }));

  const statusRows = data.roStatusBreakdown.map((d) => ({
    section: "ro_status",
    status: d.key,
    label: d.label,
    count: d.count,
  }));

  const apptRows = data.appointmentsWeek.map((d) => ({
    section: "appointments_week",
    date: d.date,
    label: d.label,
    appointments: d.cents,
  }));

  const mixRows = data.paymentMix.map((d) => ({
    section: "payment_mix",
    method: d.method,
    label: d.label,
    count: d.count,
    amount_cents: d.cents,
  }));

  const allRows = [...kpiRows, ...revenueRows, ...statusRows, ...apptRows, ...mixRows];
  const slug = shopName.replace(/[^\w]+/g, "-").toLowerCase();
  downloadCsv(
    `dashboard-${slug}-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}.csv`,
    toCsv(allRows as Array<Record<string, string | number>>),
  );
}
