/**
 * getShopRally.com GA4 measurement.
 * Override with NEXT_PUBLIC_GA_MEASUREMENT_ID when needed (e.g. staging).
 */
const DEFAULT_MARKETING_GA_ID = "G-9S1J111T3K";

export function getMarketingGaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_MARKETING_GA_ID;
}
