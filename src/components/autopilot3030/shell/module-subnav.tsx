"use client";

import { usePathname } from "next/navigation";

import {
  AP_CUSTOMERS_MODULE_NAV_ITEMS,
  AP_DASHBOARD_MODULE_NAV_ITEMS,
  AP_GROWTH_NAV_ITEMS,
  AP_MARKUPS_NAV_ITEMS,
  AP_PAYMENTS_NAV_ITEMS,
  AP_SEO_AUTOPILOT_NAV_ITEMS,
  apAdminNavItemsForPlan,
  apCatalogNavItemsForPlan,
  apModuleSubnavKind,
} from "@/lib/autopilot3030/nav";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { ApSubnavPills } from "@/components/autopilot3030/shell/ap-subnav-pills";
import { RoPhaseStepperFromPath } from "@/components/repair-order/ro-phase-stepper";
import { isRoEstimateWorkspacePath } from "@/lib/ro-workspace";
import { usePartsTechUiEnabled, usePlanFeatures } from "@/lib/shop-capabilities";

export function ApModuleSubnav() {
  const pathname = usePathname();
  const planFeatures = usePlanFeatures();
  const partsTechEnabled = usePartsTechUiEnabled();

  if (/^\/repair-orders\/(?!new(?:\/|$))[^/]+/.test(pathname)) {
    if (isRoEstimateWorkspacePath(pathname)) return null;
    return (
      <div className="ap-module-subnav flex shrink-0 overflow-x-auto px-4 py-2.5">
        <RoPhaseStepperFromPath pathname={pathname} />
      </div>
    );
  }

  const kind = apModuleSubnavKind(pathname);

  switch (kind) {
    case "dashboard":
      return (
        <ApSubnavPills
          items={AP_DASHBOARD_MODULE_NAV_ITEMS}
          ariaLabel="Dashboard"
          pathname={pathname}
          getActive={(path, item) => {
            if (item.href === "/dashboard/snapshot") {
              return (
                path === "/dashboard/snapshot" ||
                path.startsWith("/dashboard/snapshot/") ||
                path === "/dashboard"
              );
            }
            if (item.href === "/dashboard/kpis") {
              return (
                path === "/dashboard/kpis" ||
                path.startsWith("/dashboard/kpis/") ||
                path === "/dashboard/overview" ||
                path.startsWith("/dashboard/overview/")
              );
            }
            if (item.href === "/dashboard/shop-activity") {
              return (
                path === "/dashboard/shop-activity" ||
                path.startsWith("/dashboard/shop-activity/")
              );
            }
            return path === item.href || path.startsWith(`${item.href}/`);
          }}
        />
      );
    case "growth":
      return (
        <ApSubnavPills items={AP_GROWTH_NAV_ITEMS} ariaLabel={AP_TERMS.growthEngine} pathname={pathname} />
      );
    case "seo":
      return (
        <ApSubnavPills items={AP_SEO_AUTOPILOT_NAV_ITEMS} ariaLabel="SEO Autopilot" pathname={pathname} />
      );
    case "markups":
      return (
        <ApSubnavPills items={AP_MARKUPS_NAV_ITEMS} ariaLabel="Pricing matrices" pathname={pathname} />
      );
    case "payments":
      return (
        <ApSubnavPills items={AP_PAYMENTS_NAV_ITEMS} ariaLabel="Payments" pathname={pathname} />
      );
    case "catalog":
      return (
        <ApSubnavPills
          items={apCatalogNavItemsForPlan(planFeatures)}
          ariaLabel="Parts"
          pathname={pathname}
        />
      );
    case "customers":
      return (
        <ApSubnavPills items={AP_CUSTOMERS_MODULE_NAV_ITEMS} ariaLabel="Customers" pathname={pathname} />
      );
    case "admin":
      return (
        <ApSubnavPills
          items={apAdminNavItemsForPlan(planFeatures).filter((item) => {
            // Vendor Connect chip must match released PartsTech entitlement (not plan flag alone).
            if (item.href === "/vendors/integrations" || item.href.startsWith("/vendors/integrations/")) {
              return partsTechEnabled;
            }
            return true;
          })}
          ariaLabel="Admin"
          pathname={pathname}
        />
      );
    case "settings":
      /* Settings sub-tabs live in settings/layout.tsx (Tekmetric horizontal strip). */
      return null;
    default:
      return null;
  }
}
