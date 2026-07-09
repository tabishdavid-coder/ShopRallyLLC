export const RO_CONTEXT_ACTIONS = ["history", "messages", "specs", "payment"] as const;

export type RoContextAction = (typeof RO_CONTEXT_ACTIONS)[number];

export function roEstimateActionHref(roId: string, action: RoContextAction): string {
  return `/repair-orders/${roId}/estimate?ctx=${action}`;
}

export function parseRoContextAction(raw: string | null | undefined): RoContextAction | null {
  if (raw === "history" || raw === "messages" || raw === "specs" || raw === "payment") return raw;
  return null;
}
