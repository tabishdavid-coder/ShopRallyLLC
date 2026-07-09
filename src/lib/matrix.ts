// Client-safe pricing-matrix helpers (no server imports — used in the estimate
// editor and on the server). Money in integer cents.
// Full matrix UI lives in Settings → Markups; these helpers apply tier rules.

/** Fallback when shop has no parts matrix tiers (see Settings → Markups). */
export const DEFAULT_PART_MULTIPLIER = 2.5;

export type PartTier = { minCents: number; maxCents: number | null; multiplier: number };
export type LaborTier = { minHours: number; maxHours: number | null; multiplier: number };

function tierFor<T extends { minHours?: number; maxHours?: number | null; minCents?: number; maxCents?: number | null }>(
  tiers: T[],
  value: number,
  min: (t: T) => number,
  max: (t: T) => number | null,
): T | undefined {
  return tiers.find((t) => value >= min(t) && (max(t) == null || value <= (max(t) as number)));
}

/** Retail cents for a part cost, per the parts matrix (falls back to DEFAULT_PART_MULTIPLIER). */
export function partRetail(costCents: number, tiers: PartTier[]): number {
  const t = tierFor(tiers, costCents, (x) => x.minCents ?? 0, (x) => x.maxCents ?? null);
  const multiplier = t?.multiplier ?? DEFAULT_PART_MULTIPLIER;
  return Math.round(costCents * multiplier);
}

/** Effective labor rate (cents) for a number of hours, per the labor matrix. */
export function laborRate(baseRateCents: number, hours: number, tiers: LaborTier[]): number {
  const t = tierFor(tiers, hours, (x) => x.minHours ?? 0, (x) => x.maxHours ?? null);
  return t ? Math.round(baseRateCents * t.multiplier) : baseRateCents;
}

/** Markup percentage for display, e.g. multiplier 4.0 → "300%". */
export function markupPct(multiplier: number): string {
  return `${Math.round((multiplier - 1) * 100)}%`;
}

/** Gross profit % for display, e.g. multiplier 4.0 → "75%" (GP = (retail − cost) / retail). */
export function grossProfitPct(multiplier: number): string {
  if (multiplier <= 0) return "—";
  return `${Math.round(((multiplier - 1) / multiplier) * 1000) / 10}%`;
}

function tierForCost(tiers: PartTier[], costCents: number): PartTier | undefined {
  return tiers.find(
    (t) => costCents >= t.minCents && (t.maxCents == null || costCents <= t.maxCents),
  );
}

function tierForHours(tiers: LaborTier[], hours: number): LaborTier | undefined {
  return tiers.find(
    (t) => hours >= t.minHours && (t.maxHours == null || hours <= t.maxHours),
  );
}

/** Tooltip text for the labor matrix tier applied to a line. */
export function laborMatrixTooltip(
  hours: number,
  tiers: LaborTier[],
  baseRateCents: number,
): string {
  if (tiers.length === 0) return "Shop labor rate (no matrix tiers configured)";
  const t = tierForHours(tiers, hours);
  if (!t) return `Base rate ${(baseRateCents / 100).toFixed(2)}/hr (no matching tier)`;
  const max = t.maxHours != null ? `${t.maxHours} hrs` : "∞";
  return `${t.minHours}–${max}: ×${t.multiplier.toFixed(2)} (${markupPct(t.multiplier)} markup) on $${(baseRateCents / 100).toFixed(2)}/hr base`;
}

/** Tooltip text for the parts matrix tier applied to a line. */
export function partMatrixTooltip(costCents: number, tiers: PartTier[]): string {
  if (tiers.length === 0) return "Default part markup (no matrix tiers configured)";
  const t = tierForCost(tiers, costCents);
  const multiplier = t?.multiplier ?? DEFAULT_PART_MULTIPLIER;
  if (!t) {
    return `Default ×${multiplier.toFixed(2)} (${markupPct(multiplier)} markup)`;
  }
  const max = t.maxCents != null ? `$${(t.maxCents / 100).toFixed(2)}` : "∞";
  return `$${(t.minCents / 100).toFixed(2)}–${max} cost: ×${multiplier.toFixed(2)} (${markupPct(multiplier)} markup)`;
}
