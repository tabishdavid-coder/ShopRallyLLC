"use client";

import { usePathname } from "next/navigation";

import {
  AP_ADMIN_MODULE_NAV_ITEMS,
  AP_CATALOG_MODULE_NAV_ITEMS,
  AP_CUSTOMERS_MODULE_NAV_ITEMS,
  AP_DASHBOARD_MODULE_NAV_ITEMS,
  AP_GROWTH_NAV_ITEMS,
  AP_MARKUPS_NAV_ITEMS,
  AP_PAYMENTS_NAV_ITEMS,
  AP_SEO_AUTOPILOT_NAV_ITEMS,
  apModuleSubnavKind,
  type ApNavLink,
} from "@/lib/autopilot3030/nav";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { ApSubnavPills } from "@/components/autopilot3030/shell/ap-subnav-pills";
import { RoPhaseStepperFromPath } from "@/components/repair-order/ro-phase-stepper";
import { isPlanHiddenNavHref } from "@/lib/crm-access";
import { isRoEstimateWorkspacePath } from "@/lib/ro-workspace";
import { useShopCapabilities } from "@/lib/shop-capabilities";

function filterPlanItems(items: ApNavLink[], caps: ReturnType<typeof useShopCapabilities>): ApNavLink[] {
  const planFlags = {
    growth: caps.growth,
    maintenancePrograms: caps.maintenancePrograms,
    sms: caps.sms,
  };
  return items.filter((item) => !isPlanHiddenNavHref(item.href, planFlags));
}

export function ApModuleSubnav() {
  const pathname = usePathname();
  const caps = useShopCapabilities();

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
      if (!caps.growth) return null;
      return (
        <ApSubnavPills
          items={filterPlanItems(AP_GROWTH_NAV_ITEMS, caps)}
          ariaLabel={AP_TERMS.growthEngine}
          pathname={pathname}
        />
      );

    case "seo":
      if (!caps.websiteSeo && !caps.shopSite) return null;
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
      return <ApSubnavPills items={AP_CATALOG_MODULE_NAV_ITEMS} ariaLabel="Catalog" pathname={pathname} />;

    case "customers":
      return (
        <ApSubnavPills
          items={filterPlanItems(AP_CUSTOMERS_MODULE_NAV_ITEMS, caps)}
          ariaLabel="Customers"
          pathname={pathname}
        />
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
