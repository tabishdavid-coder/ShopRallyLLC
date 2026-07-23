/** Integer-cents pricing metrics for inventory / tire cost ↔ retail fields. */
export type PricingMetrics = {
  /** Gross profit in cents: retail − cost. */
  gpCents: number;
  /** Margin on sell price: (retail − cost) / retail × 100, one decimal. */
  marginPct: number | null;
  /** Markup on cost: (retail − cost) / cost × 100, one decimal. */
  markupPct: number | null;
};

/** Compute GP $, margin-on-retail %, and markup-on-cost % using integer cents. */
export function computePricingMetrics(
  costCents: number,
  retailCents: number,
): PricingMetrics {
  const gpCents = retailCents - costCents;
  const marginPct =
    retailCents > 0 ? Math.round((gpCents * 1000) / retailCents) / 10 : null;
  const markupPct =
    costCents > 0 ? Math.round((gpCents * 1000) / costCents) / 10 : null;
  return { gpCents, marginPct, markupPct };
}

export function formatPctOneDecimal(pct: number): string {
  return pct.toFixed(1);
}
