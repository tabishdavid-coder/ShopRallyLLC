/**
 * Platform Stripe Price IDs for Ignition (Core) CRM + AI Plus add-on.
 * Create Products/Prices in Stripe Dashboard, then set env vars.
 */

export type PlanStripeCatalogId =
  | "ignition_monthly"
  | "ignition_annual"
  | "ai_plus_monthly";

export const PLAN_STRIPE_CATALOG: Record<
  PlanStripeCatalogId,
  { label: string; envVar: string; mode: "subscription" }
> = {
  ignition_monthly: {
    label: "Ignition (monthly)",
    envVar: "STRIPE_PRICE_IGNITION_MONTHLY",
    mode: "subscription",
  },
  ignition_annual: {
    label: "Ignition (annual)",
    envVar: "STRIPE_PRICE_IGNITION_ANNUAL",
    mode: "subscription",
  },
  ai_plus_monthly: {
    label: "AI Plus",
    envVar: "STRIPE_PRICE_AI_PLUS_MONTHLY",
    mode: "subscription",
  },
};

export function resolvePlanStripePriceId(catalogId: PlanStripeCatalogId): string | null {
  const envVar = PLAN_STRIPE_CATALOG[catalogId].envVar;
  const value = process.env[envVar]?.trim();
  return value || null;
}

/** True when Ignition monthly or annual price is configured. */
export function isIgnitionCheckoutConfigured(): boolean {
  return Boolean(
    resolvePlanStripePriceId("ignition_monthly") ||
      resolvePlanStripePriceId("ignition_annual"),
  );
}

export function isAiPlusCheckoutConfigured(): boolean {
  return Boolean(resolvePlanStripePriceId("ai_plus_monthly"));
}
