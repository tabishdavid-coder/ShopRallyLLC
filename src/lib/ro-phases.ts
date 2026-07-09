import type { LucideIcon } from "lucide-react";
import { Receipt, Wrench } from "lucide-react";

import { isAutopilot3030Shell } from "@/lib/autopilot3030/shell-variant";

/** RO workspace phase — routes unchanged; labels are industry-standard shop terminology.
 *  Payment is no longer a phase step — it lives in the Finance drawer (see
 *  `payment-finance-panel.tsx` + `ro-context-actions.ts`'s `?ctx=payment` deeplink). */
export type RoPhase = {
  title: string;
  shortTitle: string;
  /** Tab segment after `/repair-orders/[id]/`; empty string = overview. */
  href: string;
  icon: LucideIcon;
  /** Key into RoTabBadges (e.g. `estimate`, `work-in-progress`). */
  badgeKey?: string;
};

const SHOPRALLY_RO_PHASES: RoPhase[] = [
  { title: "Estimate", shortTitle: "Estimate", href: "estimate", icon: Receipt, badgeKey: "estimate" },
  {
    title: "Work in Progress",
    shortTitle: "WIP",
    href: "work-in-progress",
    icon: Wrench,
    badgeKey: "work-in-progress",
  },
];

/** Same phase labels on 3030 shell stepper (routes unchanged). */
const AP_RO_PHASES: RoPhase[] = [
  { title: "Estimate", shortTitle: "Estimate", href: "estimate", icon: Receipt },
  {
    title: "Work in Progress",
    shortTitle: "WIP",
    href: "work-in-progress",
    icon: Wrench,
  },
];

/** Segments reachable by URL but not shown as stepper steps — map to parent phase for highlight. */
const RO_PHASE_SEGMENT_ALIASES: Record<string, string> = {
  inspections: "estimate",
};

/** Normalize pathname segment for stepper active/complete state (e.g. inspections → estimate). */
export function roPhaseSegmentForStepper(segment: string): string {
  return RO_PHASE_SEGMENT_ALIASES[segment] ?? segment;
}

/** Phase list for the active shell (ShopRally 3004 vs Autopilot 3030 preview). */
export function resolveRoPhases(): RoPhase[] {
  return isAutopilot3030Shell() ? AP_RO_PHASES : SHOPRALLY_RO_PHASES;
}

export { SHOPRALLY_RO_PHASES, AP_RO_PHASES };

/** Badge counts shown on RO workspace phase steps. */
export type RoTabBadges = Partial<Record<string, string | number>>;
