/**
 * Vendor integration catalog + status helpers (client-safe types and labels).
 * Server-side resolution lives in `src/server/integrations.ts`.
 */

export const VENDOR_KEYS = ["partstech", "weldon", "carfax", "vin-decoder", "stripe", "google-reviews"] as const;
export type VendorKey = (typeof VENDOR_KEYS)[number];

export type VendorCategory = "parts" | "tires" | "vehicle-data" | "payments" | "marketing";

export type IntegrationConnectionState = "connected" | "configured" | "mock" | "inactive";

export type VendorIntegrationStatus = {
  key: VendorKey;
  state: IntegrationConnectionState;
  detail: string;
  envConfigured: boolean;
  shopConfigured: boolean;
  /** Safe config for forms — never includes secret values. */
  safeConfig: Record<string, unknown>;
};

export type VendorDefinition = {
  key: VendorKey;
  name: string;
  category: VendorCategory;
  description: string;
  href: string;
  /** Env vars documented on the setup page (platform-level fallback). */
  envVars: string[];
  /** Integration category label shown in the vendors UI. */
  integrationType: string;
  partnershipNote: string;
};

export const VENDOR_CATEGORIES: { key: VendorCategory; label: string }[] = [
  { key: "parts", label: "Parts" },
  { key: "tires", label: "Tires" },
  { key: "vehicle-data", label: "Vehicle Data" },
  { key: "payments", label: "Payments" },
  { key: "marketing", label: "Marketing" },
];

export const VENDOR_DEFINITIONS: VendorDefinition[] = [
  {
    key: "partstech",
    name: "PartsTech",
    category: "parts",
    description: "Search parts catalogs, punch out to suppliers, and import lines onto estimates.",
    href: "/vendors/integrations/partstech",
    envVars: ["PARTSTECH_PARTNER_ID", "PARTSTECH_API_KEY", "PARTSTECH_USER"],
    integrationType: "Partner API + shop credentials",
    partnershipNote:
      "Requires a PartsTech partner ID from PartsTech onboarding in addition to each shop's user/API key.",
  },
  {
    key: "weldon",
    name: "Weldon Tire",
    category: "tires",
    description: "Wholesale tire ordering after manager approval on website tire deposits.",
    href: "/vendors/integrations/weldon",
    envVars: ["WELDON_API_KEY", "WELDON_API_BASE_URL"],
    integrationType: "B2B portal or aggregator API",
    partnershipNote:
      "Weldon sells via weldontire.net (account # + password). Programmatic ordering needs Tireweb/Tirewire or EDI from your rep.",
  },
  {
    key: "carfax",
    name: "Carfax",
    category: "vehicle-data",
    description: "Import prior service history on repair orders (Service History Check).",
    href: "/vendors/integrations/carfax",
    envVars: ["CARFAX_PRODUCT_DATA_ID", "CARFAX_LOCATION_ID"],
    integrationType: "Carfax for Business / Service Data Transfer",
    partnershipNote:
      "Not self-serve — requires a Carfax Service Data Transfer Facilitation Agreement. QuickVIN vs full reports finalized at onboarding.",
  },
  {
    key: "vin-decoder",
    name: "VIN Decoder",
    category: "vehicle-data",
    description: "Decode VINs to year/make/model/trim/engine when adding vehicles and creating ROs.",
    href: "/vendors/integrations/vin-decoder",
    envVars: ["AUTODEV_API_KEY"],
    integrationType: "NHTSA vPIC (free) + optional paid providers",
    partnershipNote:
      "NHTSA vPIC is active with no key. Upgrade to Auto.dev, DataOne, or VinAudit for richer data and plate lookup.",
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Per-shop Stripe Connect — online invoice pay, text-to-pay, and future deposits.",
    href: "/marketing/payment-account",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "APP_URL"],
    integrationType: "Stripe Connect Express (shop-level)",
    partnershipNote:
      "Each shop connects its own Express account under the ShopRally platform. Customer payments settle to the shop; platform env keys enable Connect onboarding only.",
  },
  {
    key: "google-reviews",
    name: "Google Reviews",
    category: "marketing",
    description: "List, filter, and reply to Google Business Profile reviews from your CRM inbox.",
    href: "/vendors/integrations/google-reviews",
    envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
    integrationType: "Google Business Profile API + OAuth 2.0 per shop",
    partnershipNote:
      "Each shop connects its own Google account (owner or manager on the Business Profile). Your ShopRally admin enables Google sign-in for the platform.",
  },
];

export const STATE_META: Record<
  IntegrationConnectionState,
  { label: string; badgeClass: string }
> = {
  connected: { label: "Connected", badgeClass: "bg-emerald-100 text-emerald-700" },
  configured: { label: "Credentials saved", badgeClass: "bg-brand-light/15 text-brand-navy" },
  mock: { label: "Mock / fallback", badgeClass: "bg-amber-100 text-amber-800" },
  inactive: { label: "Not connected", badgeClass: "bg-slate-100 text-slate-600" },
};

export function vendorByKey(key: VendorKey): VendorDefinition {
  const v = VENDOR_DEFINITIONS.find((d) => d.key === key);
  if (!v) throw new Error(`Unknown vendor: ${key}`);
  return v;
}
