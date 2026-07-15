import type { ShopPlan } from "@/generated/prisma";
import type { PlanFeature, PlanFeatureSet } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

/** Plan feature required to see a settings section or child. Omit = always visible. */
export type SettingsPlanRequirement = PlanFeature | "coreOnly" | null;

/** Top-level settings sections gated by plan. */
export const SETTINGS_SECTION_REQUIREMENTS: Partial<
  Record<string, SettingsPlanRequirement>
> = {
  markups: "markupMatrices",
  integrations: "integrations",
  quickbooks: "integrations",
  commissions: "advancedReports",
};

/** Deep-link children gated independently (e.g. communications → phone-sms). */
export const SETTINGS_CHILD_REQUIREMENTS: Partial<
  Record<string, SettingsPlanRequirement>
> = {
  "phone-sms": "customerSms",
  notifications: "customerSms",
};

/** Autopilot 3030 settings hub links → plan feature. */
export const AP_SETTINGS_LINK_REQUIREMENTS: Partial<
  Record<string, SettingsPlanRequirement>
> = {
  "/settings/markups": "markupMatrices",
  "/settings/markups/parts": "markupMatrices",
  "/settings/markups/labor": "markupMatrices",
  "/settings/markups/transparency": "markupMatrices",
  "/settings/integrations": "integrations",
  "/settings/quickbooks": "integrations",
  "/settings/commissions": "advancedReports",
  "/settings/communications/phone-sms": "customerSms",
  "/settings/communications/notifications": "customerSms",
  "/settings/messaging": "customerSms",
  "/settings/notifications": "customerSms",
  "/settings/payments": "integrations",
  "/settings/integrations/stripe": "integrations",
};

/** Integration cards on Settings → Integrations filtered by plan. */
export const INTEGRATION_CARD_REQUIREMENTS: Partial<
  Record<string, PlanFeature | "coreOnly">
> = {
  "Auto.dev": "coreOnly",
  Carfax: "integrations",
  PartsTech: "partsTech",
  "Twilio SMS": "customerSms",
  Stripe: "integrations",
};

export function planFeatureEnabled(
  features: PlanFeatureSet,
  requirement: SettingsPlanRequirement | undefined,
): boolean {
  if (requirement == null) return true;
  if (requirement === "coreOnly") return false;
  return Boolean(features[requirement]);
}

export function isSettingsSectionVisible(
  sectionId: string,
  features: PlanFeatureSet,
): boolean {
  return planFeatureEnabled(features, SETTINGS_SECTION_REQUIREMENTS[sectionId]);
}

export function isSettingsChildVisible(
  childId: string,
  features: PlanFeatureSet,
): boolean {
  return planFeatureEnabled(features, SETTINGS_CHILD_REQUIREMENTS[childId]);
}

export function isApSettingsLinkVisible(
  href: string,
  features: PlanFeatureSet,
): boolean {
  const base = href.split("?")[0]!;
  const req =
    AP_SETTINGS_LINK_REQUIREMENTS[href] ?? AP_SETTINGS_LINK_REQUIREMENTS[base];
  return planFeatureEnabled(features, req);
}

/** Catalog top chips / Vendor Connect — plan-gated. */
export function isCatalogNavHrefVisible(
  href: string,
  features: PlanFeatureSet,
): boolean {
  const base = href.split("?")[0]!;
  const req = CATALOG_NAV_HREF_REQUIREMENTS[href] ?? CATALOG_NAV_HREF_REQUIREMENTS[base];
  return planFeatureEnabled(features, req);
}

export function isIntegrationCardVisible(
  name: string,
  features: PlanFeatureSet,
  plan: ShopPlan,
): boolean {
  const req = INTEGRATION_CARD_REQUIREMENTS[name];
  if (req === "coreOnly") return plan !== "STARTER";
  if (req == null) return true;
  return Boolean(features[req]);
}

/** Routes that Core shops must not access — redirect to subscription. */
export const SETTINGS_UPGRADE_ROUTES: { prefix: string; feature: PlanFeature }[] = [
  { prefix: "/settings/markups", feature: "markupMatrices" },
  { prefix: "/settings/integrations", feature: "integrations" },
  { prefix: "/settings/communications/phone-sms", feature: "customerSms" },
  { prefix: "/settings/communications/notifications", feature: "customerSms" },
  { prefix: "/settings/messaging", feature: "customerSms" },
  { prefix: "/settings/notifications", feature: "customerSms" },
  { prefix: "/settings/commissions", feature: "advancedReports" },
  { prefix: "/settings/quickbooks", feature: "integrations" },
  { prefix: "/settings/payments", feature: "integrations" },
  { prefix: "/settings/integrations/stripe", feature: "integrations" },
  { prefix: "/vendors/integrations/partstech", feature: "partsTech" },
];

/** Catalog module chips — hide vendor PartsTech / connect on Core. */
export const CATALOG_NAV_HREF_REQUIREMENTS: Partial<Record<string, PlanFeature>> = {
  "/vendors/integrations": "partsTech",
};

export function settingsRouteDenied(
  pathname: string,
  features: PlanFeatureSet,
): PlanFeature | null {
  for (const { prefix, feature } of SETTINGS_UPGRADE_ROUTES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!features[feature]) return feature;
    }
  }
  return null;
}

/** Human label for upgrade redirect messaging. */
export function settingsUpgradeLabel(feature: PlanFeature): string {
  const labels: Partial<Record<PlanFeature, string>> = {
    markupMatrices: "Markup matrices",
    customerSms: "Two-way SMS",
    integrations: "Integrations",
    advancedReports: "Commissions & advanced reporting",
    partsTech: "PartsTech",
  };
  return labels[feature] ?? "This feature";
}

/** Features to show in Subscription → Feature gates (only entitled on current plan). */
export function subscriptionFeatureLabelsForPlan(plan: ShopPlan): PlanFeature[] {
  const f = PLANS[plan].features;
  const exclude = new Set<PlanFeature>(["multiLocation", "motorLabor"]);
  return (Object.keys(f) as PlanFeature[]).filter(
    (key) => typeof f[key] === "boolean" && f[key] === true && !exclude.has(key),
  );
}
