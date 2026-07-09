import type { TireOrderStatus, TireOrderSource } from "@/generated/prisma";

export const TIRE_ORDER_STATUSES: TireOrderStatus[] = [
  "LEAD",
  "DEPOSIT_RECEIVED",
  "PENDING_SUPPLIER_APPROVAL",
  "ORDERED",
  "SCHEDULED",
  "INSTALLED",
  "COMPLETE",
  "CANCELED",
];

export const TIRE_STATUS_LABELS: Record<TireOrderStatus, string> = {
  LEAD: "Lead",
  DEPOSIT_RECEIVED: "Deposit received",
  PENDING_SUPPLIER_APPROVAL: "Awaiting supplier approval",
  ORDERED: "Ordered from supplier",
  SCHEDULED: "Scheduled",
  INSTALLED: "Installed",
  COMPLETE: "Complete",
  CANCELED: "Canceled",
};

export const TIRE_STATUS_COLORS: Record<TireOrderStatus, string> = {
  LEAD: "bg-muted text-muted-foreground",
  DEPOSIT_RECEIVED: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PENDING_SUPPLIER_APPROVAL: "bg-brand-red/15 text-brand-red",
  ORDERED: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  SCHEDULED: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  INSTALLED: "bg-brand-light/30 text-brand-navy",
  COMPLETE: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  CANCELED: "bg-brand-red/10 text-brand-red",
};

export const TIRE_SOURCE_LABELS: Record<TireOrderSource, string> = {
  WEBSITE: "Website",
  CRM: "CRM",
};

export const TIRE_TYPES = [
  { value: "all-season", label: "All-season" },
  { value: "winter", label: "Winter / snow" },
  { value: "performance", label: "Performance / summer" },
  { value: "all-terrain", label: "All-terrain" },
  { value: "run-flat", label: "Run-flat" },
] as const;

export const DROP_OFF_TYPES = [
  { value: "drop-off", label: "Drop-off vehicle" },
  { value: "wait", label: "Wait at shop" },
  { value: "pickup", label: "Pickup & install" },
] as const;

export function vehicleLabel(v: {
  year?: number | null;
  make?: string | null;
  model?: string | null;
} | null): string {
  if (!v) return "—";
  const parts = [v.year, v.make, v.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

export function tireSizeLabel(front?: string | null, rear?: string | null): string {
  const f = front?.trim();
  const r = rear?.trim();
  if (f && r && f !== r) return `${f} / ${r}`;
  return f || r || "—";
}
