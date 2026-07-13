import "server-only";

import {
  buildAllowedNavHrefs,
  buildAllowedSectionIds,
  CRM_NAV_HREF_PERMISSIONS,
  isCrmAccessExemptPath,
  roTabSegmentAllowed,
  routeAllowedByPermissions,
  routeRuleForPath,
  type EffectivePermissions,
} from "@/lib/crm-access";
import { canUseFeature, canUseReleasedFeature, type SubscriptionFeature } from "@/lib/subscription";
import { getEffectivePermissions } from "@/server/permissions";

export type CrmAccessContext = {
  effective: EffectivePermissions;
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
  growthPlanOk: boolean;
};

/** Nav hrefs gated by plan entitlement (server filters `allowedNavHrefs`). */
const HREF_PLAN_FEATURES: Partial<Record<string, SubscriptionFeature>> = {
  "/messages": "sms",
  "/payments": "stripePayments",
  "/orders": "parts",
  "/vendors/integrations": "parts",
  "/maintenance-programs/subscribers": "maintenance_programs",
  "/marketing": "marketing_campaigns",
  "/marketing/payment-account": "marketing_campaigns",
  "/settings/marketing": "marketing_campaigns",
  "/settings/booking": "booking",
  "/settings/markups": "markupMatrices",
  "/settings/markups/parts": "markupMatrices",
  "/settings/markups/labor": "markupMatrices",
  "/settings/communications/phone-sms": "sms",
  "/settings/payments": "stripePayments",
  "/settings/integrations/stripe": "stripePayments",
};

type PlanRouteGate = {
  prefix: string;
  feature: SubscriptionFeature;
  /** When true, also requires phased release flag. */
  released?: boolean;
};

const PLAN_ROUTE_GATES: PlanRouteGate[] = [
  { prefix: "/payments", feature: "stripePayments" },
  { prefix: "/messages", feature: "sms" },
  { prefix: "/orders", feature: "parts", released: true },
  { prefix: "/vendors", feature: "parts", released: true },
  { prefix: "/settings/marketing", feature: "marketing_campaigns", released: true },
  { prefix: "/settings/booking", feature: "booking", released: true },
  { prefix: "/settings/markups", feature: "markupMatrices" },
  { prefix: "/settings/communications/phone-sms", feature: "sms" },
  { prefix: "/settings/payments", feature: "stripePayments" },
  { prefix: "/settings/integrations/stripe", feature: "stripePayments" },
];

const RELEASED_FEATURES = new Set<SubscriptionFeature>([
  "parts",
  "maintenance_programs",
  "marketing_campaigns",
  "booking",
  "motorLabor",
  "sms",
]);

async function planAllowsFeature(
  shopId: string,
  feature: SubscriptionFeature,
  released?: boolean,
): Promise<boolean> {
  if (released || RELEASED_FEATURES.has(feature)) {
    return canUseReleasedFeature(shopId, feature);
  }
  return canUseFeature(shopId, feature);
}

async function filterNavHrefsByPlan(shopId: string, hrefs: string[]): Promise<string[]> {
  const results = await Promise.all(
    hrefs.map(async (href) => {
      const feature = HREF_PLAN_FEATURES[href];
      if (!feature) return { href, ok: true as const };
      const ok = await planAllowsFeature(shopId, feature, RELEASED_FEATURES.has(feature));
      return { href, ok };
    }),
  );
  return results.filter((r) => r.ok).map((r) => r.href);
}

async function planAllowsPath(shopId: string, pathname: string): Promise<boolean> {
  const sorted = [...PLAN_ROUTE_GATES].sort((a, b) => b.prefix.length - a.prefix.length);
  const rule = sorted.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!rule) return true;
  return planAllowsFeature(shopId, rule.feature, rule.released);
}

const GROWTH_ROUTE_PREFIXES = ["/marketing", "/maintenance-programs"];

function growthRoute(pathname: string): boolean {
  return GROWTH_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

async function growthFeaturesForPath(pathname: string): Promise<SubscriptionFeature[]> {
  if (pathname.startsWith("/maintenance-programs")) return ["maintenance_programs"];
  if (pathname.startsWith("/marketing")) {
    if (pathname.includes("online-booking") || pathname.includes("booking")) {
      return ["marketing_campaigns", "booking"];
    }
    return ["marketing_campaigns"];
  }
  return ["marketing_campaigns"];
}

export async function getCrmAccessContext(shopId: string): Promise<CrmAccessContext> {
  const effective = await getEffectivePermissions(shopId);
  const growthPlanOk = await canUseReleasedFeature(shopId, "marketing_campaigns");

  const permissionHrefs =
    effective === "all"
      ? Object.keys(CRM_NAV_HREF_PERMISSIONS)
      : buildAllowedNavHrefs(effective);
  const allowedNavHrefs = await filterNavHrefsByPlan(shopId, permissionHrefs);
  const allowedSectionIds = buildAllowedSectionIds(effective, growthPlanOk);

  if (effective === "all") {
    return { effective, allowedNavHrefs, allowedSectionIds, growthPlanOk };
  }

  return {
    effective,
    allowedNavHrefs,
    allowedSectionIds,
    growthPlanOk,
  };
}

export async function checkCrmRouteAccess(
  pathname: string,
  shopId: string,
): Promise<{ allowed: boolean; reason?: "permission" | "plan" }> {
  if (isCrmAccessExemptPath(pathname)) return { allowed: true };

  if (!(await planAllowsPath(shopId, pathname))) {
    return { allowed: false, reason: "plan" };
  }

  const effective = await getEffectivePermissions(shopId);

  if (growthRoute(pathname)) {
    const features = await growthFeaturesForPath(pathname);
    for (const feature of features) {
      const ok = await canUseReleasedFeature(shopId, feature);
      if (!ok) return { allowed: false, reason: "plan" };
    }
    const rule = routeRuleForPath(pathname);
    if (rule && !routeAllowedByPermissions(effective, pathname)) {
      return { allowed: false, reason: "permission" };
    }
    return { allowed: true };
  }

  if (!routeAllowedByPermissions(effective, pathname)) {
    return { allowed: false, reason: "permission" };
  }

  const roSegmentMatch = pathname.match(/^\/repair-orders\/([^/]+)\/([^/?]+)/);
  if (roSegmentMatch && roSegmentMatch[1] !== "new") {
    const segment = roSegmentMatch[2]!;
    if (!roTabSegmentAllowed(effective, segment)) {
      return { allowed: false, reason: "permission" };
    }
  }

  return { allowed: true };
}
