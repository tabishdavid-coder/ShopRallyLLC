/** Shared labor guide hit types (safe for client + server). */

/** AI / cache labor suggestion shape — keep client-safe (no server-only imports). */
export type LaborSuggestion = {
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  notes: string;
  confidenceScore: number;
  reasoningSummary: string;
};

/** VIN-decoded vehicle context for labor lookup (client + server). */
export type Vehicle = {
  vin?: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  drivetrain?: string | null;
};

export type LaborGuideSource = "cached" | "ai_estimate" | "shop_custom" | "catalog";

export type LaborGuideHit = {
  id: string;
  jobName: string;
  queryText?: string;
  totalHours: number;
  laborOperations: string[];
  notes?: string;
  source: LaborGuideSource;
  /** Cached LaborOperation row id, when source = cached. */
  laborOperationId?: string;
  /** Canned job id, when source = shop_custom. */
  cannedJobId?: string;
  unitLabel?: string;
  unitsOnVehicle?: number;
  laborHoursPerUnit?: number;
  /** Shop canned job category label, when source = shop_custom. */
  category?: string | null;
  /** Classified main category id (browse/search breadcrumb). */
  categoryId?: string;
  /** Classified subcategory id. */
  subcategoryId?: string;
  /** Full breadcrumb path, e.g. "Suspension › Struts & Shocks". */
  categoryPath?: string;
  /** When set, detail panel shows only variants matching these positions. */
  positionFilter?: string[];
  /** Original cache job name when this hit was derived from a sibling position. */
  derivedFrom?: string;
  /** How this cached hit matched the active vehicle (VIN vs YMM). */
  vehicleMatch?: string;
  /** 0–1 estimate confidence (AI or cached). */
  confidenceScore?: number;
  /** Assembly audit warnings — advisory, non-blocking. */
  auditWarnings?: string[];
  /** Provenance label: motor_ewt | ai_motor_scoped | ai_taxonomy_scoped | ai_first_principles */
  dataSource?: string;
};

export type LaborCartLine = {
  key?: number;
  /** Short estimate line text for labor guide hits. */
  description: string;
  /** Position/scope label for cart UI only — not persisted separately. */
  variantLabel?: string;
  hours: number;
  source: LaborGuideSource;
  /** Provenance carried from the source hit so cart/job badges keep their tier
   * (BOOK / SHOP / AI-DRAFT) instead of collapsing to a generic label. */
  dataSource?: string;
};

/** Position/quantity option for a labor operation. */
export type LaborVariant = {
  id: string;
  /** Display label, e.g. "Front · Both Sides". */
  label: string;
  position?: string;
  scope?: string;
  hours: number;
  /** Default unit count when adding to cart. */
  quantityDefault: number;
  /** @deprecated Computed at cart time via shortLaborLineDescription — kept for single-variant rows. */
  description?: string;
};
