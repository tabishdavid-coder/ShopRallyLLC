/** Smart RO Intake — Gemini structured payload (staging only until user confirms). */

export const SMART_RO_ADDON_LABEL = "$20/mo · Core add-on (AI Plus)";

export const CONFIDENCE_WARN_THRESHOLD = 70;

export type SmartRoCustomer = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export type SmartRoVehicle = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  confidence_score: number;
};

export type SmartRoLaborLine = {
  task_title: string;
  description: string;
  estimated_hours: number;
  confidence_score: number;
  /** Staging-only — user (or AI low-confidence) marked the line for review. */
  flagged?: boolean;
};

/** Exact Gemini response shape — persisted only after user confirms staging. */
export type SmartRoIntakePayload = {
  customer: SmartRoCustomer;
  vehicle: SmartRoVehicle;
  labor_lines: SmartRoLaborLine[];
};

/** Editable staging state (user may override any field before commit). */
export type SmartRoStagingState = {
  rawText: string;
  customer: SmartRoCustomer;
  vehicle: SmartRoVehicle;
  laborLines: SmartRoLaborLine[];
  /** Matched existing customer ids (phone/email dedupe hints). */
  suggestedCustomerIds: string[];
};

export function isLowConfidence(score: number): boolean {
  return score < CONFIDENCE_WARN_THRESHOLD;
}

export function defaultLaborRateCents(
  laborRates: { rateCents: number; isDefault: boolean }[],
): number {
  const def = laborRates.find((r) => r.isDefault);
  return def?.rateCents ?? laborRates[0]?.rateCents ?? 15000;
}

export function lineLaborCostCents(hours: number, rateCents: number): number {
  return Math.round(Math.max(0, hours) * rateCents);
}

export function formatLaborCost(hours: number, rateCents: number): string {
  return `$${(lineLaborCostCents(hours, rateCents) / 100).toFixed(2)}`;
}
