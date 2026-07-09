/** Stripe Price IDs for ShopSite / Local SEO monthly subscriptions. */

export type SeoStripeCatalogId =
  | "shopsite-monthly"
  | "seo-monthly"
  | "web-seo-bundle-monthly";

export const SEO_STRIPE_CATALOG: Record<
  SeoStripeCatalogId,
  { envVar: string; label: string; mode: "subscription"; listPriceLabel: string }
> = {
  "shopsite-monthly": {
    envVar: "STRIPE_PRICE_SHOPSITE_MONTHLY",
    label: "ShopSite",
    mode: "subscription",
    listPriceLabel: "$59/mo",
  },
  "seo-monthly": {
    envVar: "STRIPE_PRICE_SEO_MONTHLY",
    label: "Local SEO",
    mode: "subscription",
    listPriceLabel: "$79/mo",
  },
  "web-seo-bundle-monthly": {
    envVar: "STRIPE_PRICE_WEB_SEO_BUNDLE_MONTHLY",
    label: "Website + SEO bundle",
    mode: "subscription",
    listPriceLabel: "$119/mo",
  },
};

/** Resolve configured Stripe Price ID for a catalog SKU (null when env unset). */
export function resolveSeoStripePriceId(catalogId: SeoStripeCatalogId): string | null {
  const envVar = SEO_STRIPE_CATALOG[catalogId].envVar;
  const value = process.env[envVar]?.trim();
  return value || null;
}

/** True when platform has Stripe price IDs configured for checkout (stub until billing UI wires up). */
export function isSeoStripeCatalogConfigured(): boolean {
  return (Object.keys(SEO_STRIPE_CATALOG) as SeoStripeCatalogId[]).some(
    (id) => resolveSeoStripePriceId(id) != null,
  );
}
