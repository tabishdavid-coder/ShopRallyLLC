/** Client-safe report catalog, filter types, and helpers. */

import {
  DASHBOARD_RANGE_LABELS,
  DASHBOARD_RANGES,
  parseDashboardRange,
  type DashboardDateRange,
} from "@/lib/dashboard";

export const REPORT_RANGES = [...DASHBOARD_RANGES, "custom"] as const;
export type ReportDateRange = (typeof REPORT_RANGES)[number];

export const REPORT_RANGE_LABELS: Record<ReportDateRange, string> = {
  ...DASHBOARD_RANGE_LABELS,
  custom: "Custom",
};

export type ReportCustomerType = "all" | "person" | "business";

export type ReportFilters = {
  range: ReportDateRange;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  techId?: string;
  customerType?: ReportCustomerType;
  paymentMethod?: string;
};

export type ReportCategoryId =
  | "sales"
  | "ar"
  | "repair-orders"
  | "technicians"
  | "customers"
  | "payments"
  | "marketing";

export type ReportDefinition = {
  slug: string;
  name: string;
  description: string;
  category: ReportCategoryId;
  /** Which optional filters this report supports */
  filters: {
    dateRange?: boolean;
    status?: boolean;
    tech?: boolean;
    customerType?: boolean;
    paymentMethod?: boolean;
  };
  chart?: boolean;
};

export const REPORT_CATEGORIES: Array<{
  id: ReportCategoryId;
  label: string;
  description: string;
}> = [
  { id: "sales", label: "Sales & Revenue", description: "Posted sales, GP, and throughput" },
  { id: "ar", label: "Accounts Receivable", description: "Open balances and aging" },
  { id: "repair-orders", label: "Repair Orders", description: "Volume, status, and cycle time" },
  { id: "technicians", label: "Technicians", description: "Hours and productivity" },
  { id: "customers", label: "Customers", description: "Lists and acquisition" },
  { id: "payments", label: "Payments", description: "Collections by method" },
  { id: "marketing", label: "Marketing", description: "Lead sources and campaigns" },
];

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    slug: "sales-summary",
    name: "Sales Summary",
    description: "Daily posted RO totals — labor, parts, and revenue by day.",
    category: "sales",
    filters: { dateRange: true },
    chart: true,
  },
  {
    slug: "gross-profit",
    name: "Gross Profit Summary",
    description: "Parts cost vs retail and labor revenue on completed work.",
    category: "sales",
    filters: { dateRange: true },
  },
  {
    slug: "aro-report",
    name: "Average Repair Order",
    description: "Average ticket size on completed repair orders in the period.",
    category: "sales",
    filters: { dateRange: true },
  },
  {
    slug: "car-count",
    name: "Car Count",
    description: "Completed repair orders — cars serviced per day.",
    category: "sales",
    filters: { dateRange: true },
    chart: true,
  },
  {
    slug: "ar-aging",
    name: "AR Aging",
    description: "Open invoice balances grouped by age bucket.",
    category: "ar",
    filters: {},
  },
  {
    slug: "ar-by-customer",
    name: "AR by Customer",
    description: "Outstanding balances rolled up by customer.",
    category: "ar",
    filters: { customerType: true },
  },
  {
    slug: "ro-throughput",
    name: "RO Throughput",
    description: "Repair orders created vs completed by day.",
    category: "repair-orders",
    filters: { dateRange: true },
    chart: true,
  },
  {
    slug: "ro-by-status",
    name: "ROs by Status",
    description: "Current repair order counts by workflow status.",
    category: "repair-orders",
    filters: { status: true },
  },
  {
    slug: "tire-orders",
    name: "Tire Orders",
    description: "Tire quotes and orders submitted in the period.",
    category: "repair-orders",
    filters: { dateRange: true },
  },
  {
    slug: "payments-by-method",
    name: "Payments by Method",
    description: "Collected payments grouped by payment method.",
    category: "payments",
    filters: { dateRange: true, paymentMethod: true },
  },
  {
    slug: "tech-hours",
    name: "Technician Hours",
    description: "Authorized labor hours by assigned technician.",
    category: "technicians",
    filters: { dateRange: true, tech: true },
  },
  {
    slug: "tech-productivity",
    name: "Tech Productivity",
    description: "Jobs and billed hours per technician in the period.",
    category: "technicians",
    filters: { dateRange: true, tech: true },
  },
  {
    slug: "customer-list",
    name: "Customer Export",
    description: "Full customer directory with contact info and tags.",
    category: "customers",
    filters: { customerType: true },
  },
  {
    slug: "new-customers",
    name: "New Customers",
    description: "Customers created during the selected date range.",
    category: "customers",
    filters: { dateRange: true, customerType: true },
  },
  {
    slug: "marketing-leads",
    name: "Leads by Source",
    description: "Repair orders grouped by marketing / lead source.",
    category: "marketing",
    filters: { dateRange: true },
    chart: true,
  },
];

export function getReportDefinition(slug: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.slug === slug);
}

export function reportsInCategory(category: ReportCategoryId): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter((r) => r.category === category);
}

export function parseReportRange(value: string | undefined): ReportDateRange {
  if (value === "custom") return "custom";
  return parseDashboardRange(value);
}

export function parseReportFilters(
  params: Record<string, string | undefined>,
): ReportFilters {
  const customerType = params.customerType;
  return {
    range: parseReportRange(params.range),
    dateFrom: params.from,
    dateTo: params.to,
    status: params.status,
    techId: params.tech,
    customerType:
      customerType === "person" || customerType === "business" ? customerType : "all",
    paymentMethod: params.method,
  };
}

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  format?: "text" | "cents" | "number" | "percent";
};

export type ReportKpi = {
  label: string;
  value: string;
  hint?: string;
};

export type ReportChartPoint = {
  label: string;
  value: number;
  cents?: number;
};

export type ReportPayload = {
  slug: string;
  title: string;
  description: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  kpis: ReportKpi[];
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  chart?: ReportChartPoint[];
  emptyMessage?: string;
};

export type ReportTechnicianOption = {
  id: string;
  name: string;
};
