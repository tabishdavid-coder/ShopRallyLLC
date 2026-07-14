import "server-only";

import {
  buildAllowedNavHrefs,
  buildAllowedShellSectionIds,
  isCrmAccessExemptPath,
  roTabSegmentAllowed,
  routeAllowedByPermissions,
  routeRuleForPath,
  type EffectivePermissions,
} from "@/lib/crm-access";
import { GROWTH_ENGINE, GROWTH_PRODUCTS } from "@/lib/growth-engine-brand";
import { canUseFeature, canUseReleasedFeature, type SubscriptionFeature } from "@/lib/subscription";
import { getEffectivePermissions } from "@/server/permissions";

export type CrmAccessContext = {
  effective: EffectivePermissions;
  /** RBAC-only; `undefined` = unrestricted. Plan gates use `allowedSectionIds` + capabilities. */
  allowedNavHrefs?: string[];
  /** Always set — includes Autopilot + CRM section ids; Growth omitted when not entitled. */
  allowedSectionIds: string[];
  growthPlanOk: boolean;
  maintenanceOk: boolean;
  smsOk: boolean;
};

const GROWTH_ROUTE_PREFIXES = ["/marketing", "/maintenance-programs"];

/** Stripe Connect settings live under /marketing but are Core-reachable (own wall). */
function isGrowthExemptPath(pathname: string): boolean {
  return (
    pathname === "/marketing/payment-account" ||
    pathname.startsWith("/marketing/payment-account/")
  );
}

function growthRoute(pathname: string): boolean {
  if (isGrowthExemptPath(pathname)) return false;
  return GROWTH_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

async function growthFeaturesForPath(pathname: string): Promise<SubscriptionFeature[]> {
  if (pathname.startsWith("/maintenance-programs")) return ["maintenance_programs"];
  if (pathname.startsWith("/marketing")) {
    if (pathname.includes("/website") || pathname.includes("shop-site")) {
      return ["shop_site"];
    }
    if (pathname.includes("seo") || pathname.includes("seo-automation")) {
      return ["website_seo"];
    }
    if (pathname.includes("online-booking") || pathname.includes("booking")) {
      return ["marketing_campaigns", "booking"];
    }
    if (pathname.includes("maintenance")) {
      return ["maintenance_programs"];
    }
    return ["marketing_campaigns"];
  }
  return ["marketing_campaigns"];
}

export async function getCrmAccessContext(shopId: string): Promise<CrmAccessContext> {
  const effective = await getEffectivePermissions(shopId);
  const [growthPlanOk, maintenanceOk, smsOk] = await Promise.all([
    canUseReleasedFeature(shopId, "marketing_campaigns"),
    canUseReleasedFeature(shopId, "maintenance_programs"),
    canUseReleasedFeature(shopId, "sms"),
  ]);

  // Always set section ids so admins on Core still lose the Growth chrome.
  const allowedSectionIds = buildAllowedShellSectionIds(effective, growthPlanOk);

  if (effective === "all") {
    return {
      effective,
      allowedSectionIds,
      growthPlanOk,
      maintenanceOk,
      smsOk,
    };
  }

  return {
    effective,
    allowedNavHrefs: buildAllowedNavHrefs(effective),
    allowedSectionIds,
    growthPlanOk,
    maintenanceOk,
    smsOk,
  };
}

export type CrmRouteAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "permission" | "plan";
      feature?: SubscriptionFeature;
      featureLabel?: string;
      description?: string;
      notAvailableYet?: boolean;
    };

function featureMeta(feature: SubscriptionFeature): {
  featureLabel: string;
  description: string;
} {
  switch (feature) {
    case "marketing_campaigns":
    case "booking":
      return {
        featureLabel: GROWTH_ENGINE.name,
        description: GROWTH_ENGINE.upgradeHint,
      };
    case "maintenance_programs":
      return {
        featureLabel: GROWTH_PRODUCTS.bayCare.label,
        description: `${GROWTH_PRODUCTS.bayCare.label} is part of Growth Engine on Pro and Elite.`,
      };
    case "shop_site":
      return {
        featureLabel: GROWTH_PRODUCTS.shopSite.label,
        description: GROWTH_ENGINE.overdriveHint,
      };
    case "website_seo":
      return {
        featureLabel: GROWTH_PRODUCTS.seoAutopilot.label,
        description: GROWTH_ENGINE.overdriveHint,
      };
    case "sms":
      return {
        featureLabel: "Two-way SMS",
        description: "Two-way SMS is included on Pro and Elite.",
      };
    default:
      return {
        featureLabel: "This feature",
        description: "This feature is not included in your current plan.",
      };
  }
}

export async function checkCrmRouteAccess(
  pathname: string,
  shopId: string,
): Promise<CrmRouteAccessResult> {
  if (isCrmAccessExemptPath(pathname)) return { allowed: true };

  const effective = await getEffectivePermissions(shopId);

  if (growthRoute(pathname)) {
    const features = await growthFeaturesForPath(pathname);
    for (const feature of features) {
      const entitled = await canUseFeature(shopId, feature);
      if (!entitled) {
        return { allowed: false, reason: "plan", feature, ...featureMeta(feature) };
      }
      const released = await canUseReleasedFeature(shopId, feature);
      if (!released) {
        return {
          allowed: false,
          reason: "plan",
          feature,
          ...featureMeta(feature),
          notAvailableYet: true,
        };
      }
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
