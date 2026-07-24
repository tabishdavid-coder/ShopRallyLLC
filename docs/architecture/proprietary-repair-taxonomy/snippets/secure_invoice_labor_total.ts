/**
 * Blueprint illustration of pricing SoC.
 * Canonical implementation: `src/lib/proprietary-taxonomy/billing.ts`
 *
 * INVARIANT: The LLM intent parser NEVER supplies hours, rates, or money.
 */

export type LaborMatrixRow = {
  id: string;
  vehicleTaxonomyId: string;
  serviceOperationId: string;
  factoryHours: number;
  standardHours: number;
  telemetryScore: number | null;
};

export type ShopLaborRatePreset = {
  shopId: string;
  regionKey: string;
  hourlyRateDollars: number;
};

export type InvoiceLaborLine = {
  serviceOperationId: string;
  hoursSource: "factory_hours" | "standard_hours";
  hours: number;
  rateCentsPerHour: number;
  laborTotalCents: number;
};

export function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid dollar amount");
  }
  return Math.round(amount * 100);
}

export function calculateUnalterableLaborTotal(params: {
  matrixRow: LaborMatrixRow;
  shopRate: ShopLaborRatePreset;
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
  const laborTotalCents = Math.round(hours * rateCentsPerHour);

  return {
    serviceOperationId: params.matrixRow.serviceOperationId,
    hoursSource: hoursMode,
    hours,
    rateCentsPerHour,
    laborTotalCents,
  };
}

/** Texarkana regional preset example: $135.00 / hr → 13500 cents/hr. */
export const TEXARKANA_PRESET: ShopLaborRatePreset = {
  shopId: "shop_texarkana_demo",
  regionKey: "texarkana",
  hourlyRateDollars: 135.0,
};

export function billLaborFromResolvedMatrix(args: {
  matrixRow: LaborMatrixRow;
  shopRate?: ShopLaborRatePreset;
}): InvoiceLaborLine {
  return calculateUnalterableLaborTotal({
    matrixRow: args.matrixRow,
    shopRate: args.shopRate ?? TEXARKANA_PRESET,
    hoursMode: "factory_hours",
  });
}
