import type { EntitlementKind } from "@/generated/prisma";

export type ServiceTermStatus = "DUE" | "UPCOMING" | "COMPLETED";

export type ServiceProfileItem = {
  subscriptionEntitlementId: string;
  planEntitlementId: string;
  kind: EntitlementKind;
  label: string;
  description: string | null;
  quantity: number | null;
  intervalDays: number | null;
  usedCount: number;
  remainingCount: number | null;
  nextEligibleAt: Date | null;
  termStatus: ServiceTermStatus;
  eligibleToday: boolean;
  intervalHint: string | null;
  lastPerformedAt: Date | null;
  lastPerformedByName: string | null;
};

export function intervalHintText(intervalDays: number | null): string | null {
  if (!intervalDays) return null;
  if (intervalDays >= 365) {
    const years = Math.round(intervalDays / 365);
    return `Every ${years} year${years === 1 ? "" : "s"}`;
  }
  if (intervalDays >= 30) {
    const months = Math.round(intervalDays / 30);
    return `Every ${months} month${months === 1 ? "" : "s"}`;
  }
  return `Every ${intervalDays} days`;
}

/** Remaining uses stored count, or derives from plan quantity when legacy rows omit it. */
export function effectiveRemainingCount(
  remainingCount: number | null,
  quantity: number | null,
  usedCount: number,
): number {
  if (remainingCount != null) return remainingCount;
  if (quantity != null) return Math.max(0, quantity - usedCount);
  return 0;
}

export function computeTermStatus(
  kind: EntitlementKind,
  usedCount: number,
  remainingCount: number | null,
  quantity: number | null,
  nextEligibleAt: Date | null,
  now = new Date(),
): ServiceTermStatus {
  switch (kind) {
    case "COUNTED":
    case "COUPON":
      if (effectiveRemainingCount(remainingCount, quantity, usedCount) <= 0) return "COMPLETED";
      return "DUE";
    case "UNLIMITED":
    case "INTERVAL":
      if (nextEligibleAt && nextEligibleAt > now) return "UPCOMING";
      return "DUE";
    case "EVERY_VISIT":
      return "DUE";
    default:
      return usedCount > 0 ? "COMPLETED" : "DUE";
  }
}

export function isEligibleToday(
  kind: EntitlementKind,
  remainingCount: number | null,
  nextEligibleAt: Date | null,
  quantity: number | null = null,
  usedCount = 0,
  now = new Date(),
): boolean {
  switch (kind) {
    case "COUNTED":
    case "COUPON":
      return effectiveRemainingCount(remainingCount, quantity, usedCount) > 0;
    case "UNLIMITED":
    case "INTERVAL":
      return !nextEligibleAt || nextEligibleAt <= now;
    case "EVERY_VISIT":
      return true;
    default:
      return false;
  }
}

export function termProgressSummary(
  items: Pick<ServiceProfileItem, "kind" | "usedCount" | "quantity" | "termStatus">[],
): { used: number; total: number; label: string } {
  const counted = items.filter((i) => i.kind === "COUNTED" || i.kind === "COUPON");
  if (!counted.length) {
    const due = items.filter((i) => i.termStatus === "DUE").length;
    return { used: due, total: items.length, label: "services due" };
  }
  const used = counted.reduce((s, i) => s + i.usedCount, 0);
  const total = counted.reduce((s, i) => s + (i.quantity ?? 0), 0);
  return { used, total, label: "services used this term" };
}

export function statusBadgeClass(status: ServiceTermStatus): string {
  switch (status) {
    case "DUE":
      return "bg-brand-red/10 text-brand-red border-brand-red/30";
    case "UPCOMING":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 border-green-200";
  }
}

export function statusLabel(status: ServiceTermStatus): string {
  switch (status) {
    case "DUE":
      return "Due";
    case "UPCOMING":
      return "Upcoming";
    case "COMPLETED":
      return "Completed";
  }
}
