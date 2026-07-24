import type { InvoiceLaborLine, LaborResolvePath, LaborTimeMatrixRecord, ShopLaborRatePreset } from "./types";

/** Texarkana regional preset example: $135.00 / hr → 13500 cents/hr. */
export const TEXARKANA_PRESET: ShopLaborRatePreset = {
  shopId: "shop_texarkana_demo",
  regionKey: "texarkana",
  hourlyRateDollars: 135.0,
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
 * LLM intent middleware must never supply hours, rates, or money into this path.
 */
export function calculateUnalterableLaborTotal(params: {
  matrixRow: LaborTimeMatrixRecord;
  shopRate: ShopLaborRatePreset;
  hoursMode?: "factory_hours" | "standard_hours";
  resolvePath?: LaborResolvePath;
  operationKey?: string;
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
    operationKey: params.operationKey,
    hoursSource: hoursMode,
    hours,
    rateCentsPerHour,
    laborTotalCents,
    resolvePath: params.resolvePath ?? "L0_EXACT",
    confidence: params.matrixRow.confidence,
  };
}

export function billLaborFromResolvedMatrix(args: {
  matrixRow: LaborTimeMatrixRecord;
  shopRate?: ShopLaborRatePreset;
  resolvePath?: LaborResolvePath;
  operationKey?: string;
}): InvoiceLaborLine {
  return calculateUnalterableLaborTotal({
    matrixRow: args.matrixRow,
    shopRate: args.shopRate ?? TEXARKANA_PRESET,
    hoursMode: "factory_hours",
    resolvePath: args.resolvePath,
    operationKey: args.operationKey,
  });
}
