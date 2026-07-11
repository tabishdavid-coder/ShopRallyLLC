import "server-only";

import {
  buildAllowedNavHrefs,
  buildAllowedSectionIds,
  isCrmAccessExemptPath,
  roTabSegmentAllowed,
  routeAllowedByPermissions,
  routeRuleForPath,
  type EffectivePermissions,
} from "@/lib/crm-access";
import { canUseReleasedFeature, type SubscriptionFeature } from "@/lib/subscription";
import { getEffectivePermissions } from "@/server/permissions";

export type CrmAccessContext = {
  effective: EffectivePermissions;
  allowedNavHrefs?: string[];
  allowedSectionIds?: string[];
  growthPlanOk: boolean;
};

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

  if (effective === "all") {
    return { effective, growthPlanOk };
  }

  return {
    effective,
    allowedNavHrefs: buildAllowedNavHrefs(effective),
    allowedSectionIds: buildAllowedSectionIds(effective, growthPlanOk),
    growthPlanOk,
  };
}

export async function checkCrmRouteAccess(
  pathname: string,
  shopId: string,
): Promise<{ allowed: boolean; reason?: "permission" | "plan" }> {
  if (isCrmAccessExemptPath(pathname)) return { allowed: true };

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
