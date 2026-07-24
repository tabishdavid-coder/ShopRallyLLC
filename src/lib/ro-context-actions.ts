export const RO_CONTEXT_ACTIONS = ["history", "messages", "vehicle", "payment"] as const;

export type RoContextAction = (typeof RO_CONTEXT_ACTIONS)[number];

export function roEstimateActionHref(roId: string, action: RoContextAction): string {
  return `/repair-orders/${roId}/estimate?ctx=${action}`;
}

export function parseRoContextAction(raw: string | null | undefined): RoContextAction | null {
  if (raw === "history" || raw === "messages" || raw === "vehicle" || raw === "payment") {
    return raw;
  }
  // Legacy Specs deep-link → Vehicles tab (identity edit only).
  if (raw === "specs") return "vehicle";
  return null;
}
