import type { EntitlementKind, PlanSubscriptionStatus } from "@/generated/prisma";
import { effectiveRemainingCount } from "@/lib/maintenance-service-profile";

export type RedeemableEntitlement = {
  subscriptionEntitlementId: string;
  planEntitlementId: string;
  kind: EntitlementKind;
  label: string;
  eligible: boolean;
  reason: string;
  remainingCount: number | null;
};

export function getRedeemableEntitlements(
  sub: {
    status: PlanSubscriptionStatus;
    entitlements: {
      id: string;
      planEntitlementId: string;
      usedCount: number;
      remainingCount: number | null;
      nextEligibleAt: Date | null;
    }[];
  },
  planEntitlements: {
    id: string;
    kind: EntitlementKind;
    label: string;
    quantity: number | null;
    intervalDays: number | null;
  }[],
): RedeemableEntitlement[] {
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") return [];

  const now = new Date();
  const peMap = new Map(planEntitlements.map((p) => [p.id, p]));

  return sub.entitlements
    .map((se) => {
      const pe = peMap.get(se.planEntitlementId);
      if (!pe) return null;

      const remaining = effectiveRemainingCount(se.remainingCount, pe.quantity, se.usedCount);
      let eligible = false;
      let reason = "";

      switch (pe.kind) {
        case "COUNTED":
        case "COUPON":
          eligible = remaining > 0;
          reason = eligible ? `${remaining} remaining` : "None left";
          break;
        case "UNLIMITED":
        case "INTERVAL": {
          eligible = !se.nextEligibleAt || se.nextEligibleAt <= now;
          const days = pe.intervalDays ?? 90;
          reason = eligible ? "Eligible today" : `Next in ${days} days`;
          break;
        }
        case "EVERY_VISIT":
          eligible = true;
          reason = "Every visit";
          break;
        default:
          return null;
      }

      return {
        subscriptionEntitlementId: se.id,
        planEntitlementId: pe.id,
        kind: pe.kind,
        label: pe.label,
        eligible,
        reason,
        remainingCount: remaining,
      };
    })
    .filter(Boolean) as RedeemableEntitlement[];
}
