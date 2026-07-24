/**
 * Proprietary repair taxonomy — shared domain types.
 * Mirrors docs/architecture/proprietary-repair-taxonomy/sql DDL.
 * LLM intent output never includes hours, rates, or money.
 */

export const CHASSIS_COMPLEXITY_TIERS = [
  "INLINE_4_OPEN",
  "INLINE_4_PACKED",
  "V6_MODERATE",
  "V6_TIGHT",
  "V8_TRUCK",
  "V8_PERFORMANCE",
  "BOXER_SUBARU",
  "EV_SKATEBOARD",
  "HYBRID_DUAL_POWERTRAIN",
  "HEAVY_DUTY_COMMERCIAL",
] as const;

export type ChassisComplexityTier = (typeof CHASSIS_COMPLEXITY_TIERS)[number];

export type LaborTelemetrySource =
  | "FACTORY_SEED"
  | "SHOP_INVOICE_CLOSEOUT"
  | "VECTOR_INHERIT"
  | "CHASSIS_INTERPOLATED"
  | "MANUAL_OVERRIDE";

export type LaborResolvePath = "L0_EXACT" | "L1_VECTOR" | "L2_CHASSIS" | "L4_PENDING";

export type VehicleTaxonomyRecord = {
  id: string;
  year: number;
  make: string;
  model: string;
  engineConfiguration: string;
  driveType: string | null;
  chassisComplexityTier: ChassisComplexityTier;
  taxonomyKey: string;
  /** Optional 384-d embedding for L1 similarity. */
  configEmbedding: number[] | null;
};

export type ServiceOperationRecord = {
  id: string;
  operationKey: string;
  displayName: string;
  isBillableLeaf: boolean;
};

export type LaborTimeMatrixRecord = {
  id: string;
  vehicleTaxonomyId: string;
  serviceOperationId: string;
  factoryHours: number;
  standardHours: number;
  telemetryScore: number | null;
  chassisMultiplierApplied: number;
  confidence: number;
  inheritedFromId: string | null;
  lastTelemetrySource: LaborTelemetrySource | null;
};

export type PartsCatalogRecord = {
  id: string;
  sku: string;
  displayName: string;
  genericCategoryKey: string | null;
  brandTier: string | null;
};

export type VehiclePartFitmentRecord = {
  id: string;
  vehicleTaxonomyId: string;
  serviceOperationId: string;
  partsCatalogId: string;
  quantityRequired: number;
  variantFlags: string[];
  positionCode: string | null;
  fitmentConfidence: number;
  source: string;
};

/** Strict contract from LLM intent middleware (Python → app). */
export type IntentFitmentResult = {
  vehicle: {
    year: number | null;
    make: string | null;
    model: string | null;
    engineConfiguration: string | null;
    trim: string | null;
    driveType: string | null;
  };
  targetOperationKeys: string[];
  partsVariantFlags: string[];
  positionHints: string[];
  confidence: number;
  unresolvedTokens: string[];
};

export type ShopLaborRatePreset = {
  shopId: string;
  regionKey: string;
  /** Dollars per hour (e.g. 135 for Texarkana). Converted to cents in billing. */
  hourlyRateDollars: number;
};

export type InvoiceLaborLine = {
  serviceOperationId: string;
  operationKey?: string;
  hoursSource: "factory_hours" | "standard_hours";
  hours: number;
  rateCentsPerHour: number;
  laborTotalCents: number;
  resolvePath: LaborResolvePath;
  confidence: number;
};

export type PartsResolutionResult = {
  status: "HIT" | "PLACEHOLDER_ENQUEUED" | "PENDING_REVIEW";
  fitment: VehiclePartFitmentRecord[];
  genericCategoryKey: string | null;
  scrapeJobId: string | null;
};
