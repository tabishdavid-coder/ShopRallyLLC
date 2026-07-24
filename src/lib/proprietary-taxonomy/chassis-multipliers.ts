import type { ChassisComplexityTier } from "./types";

/** Strict packaging scaling table (mirrors SQL chassis_labor_multipliers seed). */
const MULTIPLIERS: Partial<
  Record<ChassisComplexityTier, Partial<Record<ChassisComplexityTier, number>>>
> = {
  INLINE_4_OPEN: {
    INLINE_4_OPEN: 1.0,
    INLINE_4_PACKED: 1.1,
    V6_MODERATE: 1.15,
    V6_TIGHT: 1.28,
    V8_TRUCK: 1.2,
    V8_PERFORMANCE: 1.35,
    BOXER_SUBARU: 1.22,
    EV_SKATEBOARD: 1.4,
    HYBRID_DUAL_POWERTRAIN: 1.3,
    HEAVY_DUTY_COMMERCIAL: 1.45,
  },
  V6_MODERATE: {
    V6_MODERATE: 1.0,
    V6_TIGHT: 1.12,
  },
  V6_TIGHT: {
    V6_TIGHT: 1.0,
    V6_MODERATE: 0.9,
    INLINE_4_OPEN: 0.78,
  },
};

/**
 * Look up labor-hour multiplier for chassis hierarchy interpolation (L2).
 * Returns null when no explicit transition is defined (fail closed → L4).
 */
export function chassisLaborMultiplier(
  fromTier: ChassisComplexityTier,
  toTier: ChassisComplexityTier,
): number | null {
  if (fromTier === toTier) return 1.0;
  const m = MULTIPLIERS[fromTier]?.[toTier];
  return typeof m === "number" && m > 0 ? m : null;
}

/** Scale hours with 3-decimal precision (matches SQL numeric(8,3)). */
export function scaleLaborHours(baseHours: number, multiplier: number): number {
  if (!Number.isFinite(baseHours) || baseHours < 0) {
    throw new Error("baseHours invalid");
  }
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error("multiplier invalid");
  }
  return Math.round(baseHours * multiplier * 1000) / 1000;
}
