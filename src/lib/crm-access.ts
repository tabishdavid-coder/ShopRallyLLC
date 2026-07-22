/** Client-safe CRM nav + route permission helpers (keys match employees module). */

export type EffectivePermissions = readonly string[] | "all";

export function hasAnyPermission(
  effective: EffectivePermissions,
  keys: readonly string[],
): boolean {
  if (effective === "all") return true;
  if (keys.length === 0) return true;
  return keys.some((k) => effective.includes(k));
}

/** Minimum permission keys to show a dashboard sidebar / header item. Empty = always. */
export const CRM_NAV_HREF_PERMISSIONS: Record<string, readonly string[]> = {
  "/dashboard": [],
  "/dashboard/snapshot": [],
  "/dashboard/kpis": [],
  "/dashboard/shop-activity": [],
  "/dashboard/overview": [],
  "/job-board": ["job_board.view", "job_board.view_all"],
  "/workflow": ["job_board.view", "job_board.view_all"],
  "/tech-board": ["job_board.view", "job_board.view_all"],
  "/tires": ["job_board.view", "job_board.view_all"],
  "/quick-labor": ["job_board.view", "job_board.view_all", "estimate.view"],
  "/messages": ["customers.message", "customers.view"],
  "/marketing/reviews": [],
  "/reports": ["reports.view"],
  "/payments": ["finance.payments_nav", "payments.view"],
  "/customers": ["customers.view"],
  "/maintenance-programs/subscribers": ["customers.view"],
  "/appointments": ["job_board.view", "job_board.view_all"],
  "/inventory": ["inventory.view", "inventory.edit"],
  "/canned-jobs": ["canned_jobs.manage"],
  "/labor-guide": ["canned_jobs.manage", "estimate.view"],
  "/inspections": ["inspections.manage"],
  "/vendors/integrations": ["vendors.manage"],
  "/orders": ["orders.manage"],
  "/employees": ["employees.manage"],
  "/settings": ["employees.manage"],
  "/settings/subscription": ["finance.account", "employees.manage"],
  "/settings/marketing": ["employees.manage"],
  "/settings/booking": ["employees.manage"],
  "/marketing": [],
  "/marketing/payment-account": ["finance.account", "employees.manage"],
  "/billing": ["finance.account", "employees.manage"],
  "/support": [],
};

export const CRM_DASHBOARD_NAV_HREFS = [
  "/dashboard",
  "/job-board",
  "/workflow",
  "/tech-board",
  "/tires",
  "/quick-labor",
  "/messages",
  "/reports",
  "/payments",
] as const;

/** Header section visibility (Growth is plan-gated separately on the server). */
export const CRM_SECTION_PERMISSIONS: Record<string, readonly string[]> = {
  dashboard: [],
  customers: ["customers.view"],
  schedule: ["job_board.view", "job_board.view_all"],
  reports: ["reports.view"],
  catalog: ["inventory.view", "inventory.edit"],
  growth: [],
  settings: [
    "employees.manage",
    "vendors.manage",
    "canned_jobs.manage",
    "inspections.manage",
  ],
};

export function navHrefAllowed(effective: EffectivePermissions, href: string): boolean {
  const exact = CRM_NAV_HREF_PERMISSIONS[href];
  if (exact !== undefined) return hasAnyPermission(effective, exact);

  if (href.startsWith("/settings/")) {
    return hasAnyPermission(effective, CRM_NAV_HREF_PERMISSIONS["/settings"] ?? ["employees.manage"]);
  }
  if (href.startsWith("/marketing")) return true;
  if (href.startsWith("/repair-orders")) {
    return hasAnyPermission(effective, ["job_board.view", "job_board.view_all", "estimate.view"]);
  }
  if (href.startsWith("/customers")) {
    return hasAnyPermission(effective, ["customers.view"]);
  }
  if (href.startsWith("/reports")) {
    return hasAnyPermission(effective, ["reports.view"]);
  }

  return true;
}

export function sectionNavAllowed(
  effective: EffectivePermissions,
  sectionId: string,
  opts?: { growthPlanOk?: boolean },
): boolean {
  // Growth is Pro+ — omit from chrome when plan/release is off (Ignition / Core launch).
  if (sectionId === "growth") return opts?.growthPlanOk === true;
  const keys = CRM_SECTION_PERMISSIONS[sectionId];
  if (sectionId === "dashboard") {
    return CRM_DASHBOARD_NAV_HREFS.some((href) => navHrefAllowed(effective, href));
  }
  if (!keys || keys.length === 0) return true;
  return hasAnyPermission(effective, keys);
}

export function buildAllowedNavHrefs(effective: EffectivePermissions): string[] {
  if (effective === "all") return Object.keys(CRM_NAV_HREF_PERMISSIONS);

  const hrefs = new Set<string>();
  for (const href of Object.keys(CRM_NAV_HREF_PERMISSIONS)) {
    if (navHrefAllowed(effective, href)) hrefs.add(href);
  }
  return [...hrefs];
}

export function buildAllowedSectionIds(
  effective: EffectivePermissions,
  growthPlanOk: boolean,
): string[] {
  const ids = Object.keys(CRM_SECTION_PERMISSIONS);
  return ids.filter((id) => sectionNavAllowed(effective, id, { growthPlanOk }));
}

/**
 * Autopilot shell section ids (`operations` / `admin`) plus CRM header aliases
 * (`dashboard` / `settings`). Always include both so either shell can filter.
 * Growth is omitted when `growthPlanOk` is false — including for admins.
 */
export function buildAllowedShellSectionIds(
  effective: EffectivePermissions,
  growthPlanOk: boolean,
): string[] {
  const crmIds = buildAllowedSectionIds(effective, growthPlanOk);
  const apIds: string[] = [];
  if (sectionNavAllowed(effective, "dashboard")) apIds.push("operations");
  if (sectionNavAllowed(effective, "customers")) apIds.push("customers");
  if (sectionNavAllowed(effective, "schedule")) apIds.push("schedule");
  if (sectionNavAllowed(effective, "catalog")) apIds.push("catalog");
  if (growthPlanOk) apIds.push("growth");
  if (sectionNavAllowed(effective, "settings")) apIds.push("admin");
  return [...new Set([...crmIds, ...apIds])];
}

/** Paths under /marketing that stay reachable on Core (not Growth Engine–gated). */
export function isGrowthNavExemptHref(href: string): boolean {
  if (href === "/marketing/payment-account" || href.startsWith("/marketing/payment-account/")) {
    return true;
  }
  // Google Reviews inbox — Core+ plan feature (not Pro Growth campaigns).
  if (href === "/marketing/reviews" || href.startsWith("/marketing/reviews/")) {
    return true;
  }
  return false;
}

/**
 * Hide whole modules from daily chrome when plan/release is off.
 * Does not hide payment-account (Stripe wall) or Core settings like Lead Sources.
 */
export function isPlanHiddenNavHref(
  href: string,
  flags: {
    growth: boolean;
    maintenancePrograms: boolean;
    sms: boolean;
    /** Stripe Connect / payments hub — Pro+. */
    stripePayments?: boolean;
    /** Licensed MOTOR Labor Book (`/quick-labor`) — Pro+. */
    motorLabor?: boolean;
  },
): boolean {
  if (isGrowthNavExemptHref(href)) return false;
  if (!flags.growth && (href === "/marketing" || href.startsWith("/marketing/"))) {
    return true;
  }
  if (
    !flags.maintenancePrograms &&
    (href === "/maintenance-programs" || href.startsWith("/maintenance-programs/"))
  ) {
    return true;
  }
  if (!flags.sms && href === "/messages") return true;
  if (
    flags.stripePayments === false &&
    (href === "/payments" || href.startsWith("/payments/"))
  ) {
    return true;
  }
  if (
    flags.motorLabor === false &&
    (href === "/quick-labor" || href.startsWith("/quick-labor/"))
  ) {
    return true;
  }
  return false;
}

/** Longest-prefix route guard rules (server mirrors this list). */
export type CrmRouteRule = {
  prefix: string;
  anyOf: readonly string[];
};

export const CRM_ROUTE_RULES: CrmRouteRule[] = [
  { prefix: "/employees", anyOf: ["employees.manage"] },
  { prefix: "/settings", anyOf: ["employees.manage"] },
  { prefix: "/settings/payments", anyOf: ["finance.account", "employees.manage"] },
  { prefix: "/settings/subscription", anyOf: ["finance.account", "employees.manage"] },
  { prefix: "/billing", anyOf: ["finance.account", "employees.manage"] },
  { prefix: "/reports", anyOf: ["reports.view"] },
  { prefix: "/payments", anyOf: ["finance.payments_nav", "payments.view"] },
  { prefix: "/messages", anyOf: ["customers.message", "customers.view"] },
  { prefix: "/customers", anyOf: ["customers.view"] },
  { prefix: "/maintenance-programs", anyOf: ["customers.view"] },
  { prefix: "/marketing/payment-account", anyOf: ["finance.account", "employees.manage"] },
  { prefix: "/marketing", anyOf: [] },
  { prefix: "/inventory", anyOf: ["inventory.view", "inventory.edit"] },
  { prefix: "/canned-jobs", anyOf: ["canned_jobs.manage"] },
  { prefix: "/labor-guide", anyOf: ["canned_jobs.manage", "estimate.view"] },
  { prefix: "/inspections", anyOf: ["inspections.manage"] },
  // Longer than `/vendors` — Core Google Reviews must not require PartsTech-only access.
  { prefix: "/vendors/integrations/google-reviews", anyOf: ["vendors.manage", "employees.manage"] },
  { prefix: "/vendors", anyOf: ["vendors.manage"] },
  { prefix: "/orders", anyOf: ["orders.manage"] },
  { prefix: "/appointments", anyOf: ["job_board.view", "job_board.view_all"] },
  { prefix: "/repair-orders", anyOf: ["job_board.view", "job_board.view_all", "estimate.view"] },
  { prefix: "/workflow", anyOf: ["job_board.view", "job_board.view_all"] },
  { prefix: "/tech-board", anyOf: ["job_board.view", "job_board.view_all"] },
  { prefix: "/job-board", anyOf: ["job_board.view", "job_board.view_all"] },
  { prefix: "/tires", anyOf: ["job_board.view", "job_board.view_all"] },
  { prefix: "/quick-labor", anyOf: ["job_board.view", "job_board.view_all", "estimate.view"] },
];

export function routeRuleForPath(pathname: string): CrmRouteRule | null {
  const sorted = [...CRM_ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) ?? null;
}

export function routeAllowedByPermissions(
  effective: EffectivePermissions,
  pathname: string,
): boolean {
  const rule = routeRuleForPath(pathname);
  if (!rule) return true;
  return hasAnyPermission(effective, rule.anyOf);
}

/** Paths that skip CRM permission gates (operator tools, public-ish stubs). */
export const CRM_ACCESS_EXEMPT_PREFIXES = [
  "/dashboard",
  "/design-review",
  "/design-mode",
  "/shop-access",
  "/support",
  "/home",
  "/repair-orders/new",
  "/plan-required",
] as const;

export function isCrmAccessExemptPath(pathname: string): boolean {
  return CRM_ACCESS_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** RO workspace tab segments gated by permission (overview + inspections URL always allowed). */
export const RO_TAB_SEGMENT_PERMISSIONS: Record<string, readonly string[]> = {
  estimate: ["estimate.view"],
  "work-in-progress": ["wip.view"],
  payment: ["payments.view"],
};

export function roTabSegmentAllowed(
  effective: EffectivePermissions,
  segment: string,
): boolean {
  const keys = RO_TAB_SEGMENT_PERMISSIONS[segment];
  if (!keys) return true;
  return hasAnyPermission(effective, keys);
}

/** Segments the user may open; `undefined` = all tabs (admin / unrestricted). */
export function buildAllowedRoTabSegments(
  effective: EffectivePermissions,
): string[] | undefined {
  if (effective === "all") return undefined;
  return (["inspections", "estimate", "work-in-progress", "payment"] as const).filter(
    (segment) => roTabSegmentAllowed(effective, segment),
  );
}

export function roTabSegmentFromPathname(pathname: string, roId: string): string | null {
  const prefix = `/repair-orders/${roId}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).split("/")[0];
  return rest || "";
}
