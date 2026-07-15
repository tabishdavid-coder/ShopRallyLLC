"use client";

import { usePathname } from "next/navigation";

import {
  AP_ADMIN_MODULE_NAV_ITEMS,
  AP_CUSTOMERS_MODULE_NAV_ITEMS,
  AP_DASHBOARD_MODULE_NAV_ITEMS,
  AP_GROWTH_NAV_ITEMS,
  AP_MARKUPS_NAV_ITEMS,
  AP_PAYMENTS_NAV_ITEMS,
  AP_SEO_AUTOPILOT_NAV_ITEMS,
  apCatalogNavItemsForPlan,
  apModuleSubnavKind,
} from "@/lib/autopilot3030/nav";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { ApSubnavPills } from "@/components/autopilot3030/shell/ap-subnav-pills";
import { RoPhaseStepperFromPath } from "@/components/repair-order/ro-phase-stepper";
import { isRoEstimateWorkspacePath } from "@/lib/ro-workspace";
import { usePlanFeatures } from "@/lib/shop-capabilities";

export function ApModuleSubnav() {
  const pathname = usePathname();
  const planFeatures = usePlanFeatures();

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
          getActive={(path, item) =>
            item.href === "/dashboard/snapshot"
              ? path === "/dashboard/snapshot" ||
                path.startsWith("/dashboard/snapshot/") ||
                path === "/dashboard"
              : path === "/dashboard/overview" || path.startsWith("/dashboard/overview/")
          }
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
          ariaLabel="Catalog"
          pathname={pathname}
        />
      );
    case "customers":
      return (
        <ApSubnavPills items={AP_CUSTOMERS_MODULE_NAV_ITEMS} ariaLabel="Customers" pathname={pathname} />
      );
    case "admin":
      return <ApSubnavPills items={AP_ADMIN_MODULE_NAV_ITEMS} ariaLabel="Admin" pathname={pathname} />;
    case "settings":
      /* Settings sub-tabs live in settings/layout.tsx (Tekmetric horizontal strip). */
      return null;
    default:
      return null;
  }
}
