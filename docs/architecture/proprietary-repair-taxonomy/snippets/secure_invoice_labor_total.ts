/**
 * Logical pricing separation of concerns — application billing path.
 *
 * INVARIANT: The LLM intent parser NEVER supplies hours, rates, or money.
 * This module is the only place that:
 *   1. Reads factory/standard hours from labor_time_matrix
 *   2. Loads the shop's regional labor rate preset (e.g. Texarkana $135/hr)
 *   3. Computes an unalterable invoice labor total in integer cents
 *
 * Aligns with ShopRally money rules: store & return integer cents; never floats.
 */

export type LaborMatrixRow = {
  id: string;
  vehicleTaxonomyId: string;
  serviceOperationId: string;
  /** Immutable seed / factory baseline — never mutated by LLM or UI guesswork. */
  factoryHours: number;
  /** Quote hours (may reflect telemetry blend / chassis interpolation). */
  standardHours: number;
  telemetryScore: number | null;
};

export type ShopLaborRatePreset = {
  shopId: string;
  /** Regional preset label, e.g. "Texarkana". */
  regionKey: string;
  /** Dollars per hour as configured by the shop (e.g. 135.00). */
  hourlyRateDollars: number;
};

export type InvoiceLaborLine = {
  serviceOperationId: string;
  hoursSource: "factory_hours" | "standard_hours";
  hours: number;
  rateCentsPerHour: number;
  /** Unalterable line total in cents. */
  laborTotalCents: number;
};

/** Convert a dollar rate to integer cents/hour without float drift. */
export function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid dollar amount");
  }
  return Math.round(amount * 100);
}

/**
 * Secure labor total: DB hours × local shop rate only.
 * Rejects any caller-supplied override of hours/rate from untrusted layers.
 */
export function calculateUnalterableLaborTotal(params: {
  matrixRow: LaborMatrixRow;
  shopRate: ShopLaborRatePreset;
  /** Prefer factory for "book" quotes; standard for shop-effective quotes. */
  hoursMode?: "factory_hours" | "standard_hours";
}): InvoiceLaborLine {
  const hoursMode = params.hoursMode ?? "factory_hours";
  const hours =
    hoursMode === "factory_hours"
      ? params.matrixRow.factoryHours
      : params.matrixRow.standardHours;

  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("labor_time_matrix hours invalid");
  }

  const rateCentsPerHour = dollarsToCents(params.shopRate.hourlyRateDollars);
  // Integer math: hours may be fractional (0.5, 1.3) — round money, not hours.
  const laborTotalCents = Math.round(hours * rateCentsPerHour);

  return {
    serviceOperationId: params.matrixRow.serviceOperationId,
    hoursSource: hoursMode,
    hours,
    rateCentsPerHour,
    laborTotalCents,
  };
}

// ---------------------------------------------------------------------------
// Example wiring (pseudocode repository calls — not LLM)
// ---------------------------------------------------------------------------

/** Texarkana regional preset example: $135.00 / hr → 13500 cents/hr. */
export const TEXARKANA_PRESET: ShopLaborRatePreset = {
  shopId: "shop_texarkana_demo",
  regionKey: "texarkana",
  hourlyRateDollars: 135.0,
};

/**
 * Application entry: after intent middleware returns operation keys + vehicle,
 * resolve matrix row in SQL and bill — never ask the LLM for price.
 */
export function billLaborFromResolvedMatrix(args: {
  matrixRow: LaborMatrixRow;
  shopRate?: ShopLaborRatePreset;
}): InvoiceLaborLine {
  const shopRate = args.shopRate ?? TEXARKANA_PRESET;
  return calculateUnalterableLaborTotal({
    matrixRow: args.matrixRow,
    shopRate,
    hoursMode: "factory_hours",
  });
}

/*
 * Example:
 *   matrixRow.factoryHours = 1.2
 *   Texarkana rate = $135/hr
 *   → rateCentsPerHour = 13500
 *   → laborTotalCents = Math.round(1.2 * 13500) = 16200  ($162.00)
 */
