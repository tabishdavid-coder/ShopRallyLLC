import {
  Activity as ActivityIcon,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Camera,
  ClipboardCheck,
  Columns3,
  CreditCard,
  Disc3,
  FileText,
  Gauge,
  Globe,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Package,
  Radar,
  Receipt,
  Settings,
  Shield,
  Star,
  Target,
  Timer,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { GROWTH_PRODUCTS, type GrowthProductId } from "@/lib/growth-engine-brand";
import { SEO_AUTOPILOT_TABS } from "@/lib/seo-autopilot-nav";
import type { PlanFeatureSet } from "@/lib/plans";
import {
  isAdminNavHrefVisible,
  isApSettingsLinkVisible,
  isCatalogNavHrefVisible,
} from "@/lib/settings-plan-gates";

export type ApNavLink = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  stub?: boolean;
  disabled?: boolean;
};

export type ApNavGroup = {
  id: string;
  label: string;
  items: ApNavLink[];
};

export type ApNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  description?: string;
  items: ApNavLink[];
};

type GrowthNavProductId = Exclude<GrowthProductId, "overview" | "reputationPilot">;

const GROWTH_NAV_ICONS: Record<GrowthNavProductId, LucideIcon> = {
  outreach: Megaphone,
  automations: Zap,
  booking: CalendarCheck,
  bayCare: Shield,
  shopSite: Globe,
  seoAutopilot: Radar,
  leadSources: Target,
};

/** Growth Engine products in chrome — Reviews is a Core Shop menu item, not Growth. */
const GROWTH_NAV_IDS = [
  "outreach",
  "automations",
  "booking",
  "bayCare",
  "shopSite",
  "seoAutopilot",
  "leadSources",
] as const satisfies readonly GrowthNavProductId[];

/** Growth Engine — renamed products, same routes (excludes Google Reviews). */
export const AP_GROWTH_NAV_ITEMS: ApNavLink[] = [
  {
    title: "Growth Hub",
    href: "/marketing",
    icon: LayoutDashboard,
    description: "Performance snapshot and quick actions",
  },
  ...GROWTH_NAV_IDS.map((id) => ({
    title:
      id === "bayCare"
        ? AP_TERMS.maintenancePrograms
        : id === "leadSources"
          ? "Lead Tracking"
          : id === "booking"
            ? "Online Scheduling"
            : GROWTH_PRODUCTS[id].label,
    href: GROWTH_PRODUCTS[id].href,
    icon: GROWTH_NAV_ICONS[id],
    description: GROWTH_PRODUCTS[id].shortDescription,
  })),
  {
    title: "Payment account",
    href: "/marketing/payment-account",
    icon: CreditCard,
    description: "Stripe Connect onboarding and transaction fees",
  },
];

/** Operations rail — shop floor tools (context panel when Operations active) */
export const AP_OPERATIONS_NAV_ITEMS: ApNavLink[] = [
  {
    title: "Dashboard",
    href: "/dashboard/snapshot",
    icon: LayoutDashboard,
    description: "Daily shop snapshot & KPI overview",
  },
  {
    title: AP_TERMS.jobBoard,
    href: "/job-board",
    icon: Columns3,
    description: "Estimates, work in progress & completed ROs",
  },
  {
    title: AP_TERMS.techBoard,
    href: "/tech-board",
    icon: Gauge,
    description: "Assign work by technician",
  },
  {
    title: "Tires",
    href: "/tires",
    icon: Disc3,
    description: "Quotes, orders & tire inventory",
  },
  {
    title: AP_TERMS.quickLabor,
    href: "/quick-labor",
    icon: Timer,
    description: "Labor times by VIN or plate",
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    description: "Customer SMS threads",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Shop performance reports",
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Transactions & Stripe Connect",
  },
];

/**
 * Persistent Menu sidebar groups (screenshot IA).
 * Labels match the redesign; hrefs keep existing routes.
 */
export const AP_SIDEBAR_NAV_GROUPS: ApNavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard/snapshot",
        icon: LayoutDashboard,
        description: "Daily shop snapshot & KPI overview",
      },
      {
        title: AP_TERMS.jobBoard,
        href: "/job-board",
        icon: Columns3,
        description: "Estimates, work in progress & completed ROs",
      },
      {
        title: "Appointments",
        href: "/appointments",
        icon: CalendarDays,
        description: "Calendar & booking",
      },
      {
        title: AP_TERMS.techBoard,
        href: "/tech-board",
        icon: Gauge,
        description: "Assign work by technician",
      },
    ],
  },
  {
    id: "shop",
    label: "Shop",
    items: [
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        description: "Search, tags & contact info",
      },
      {
        title: "Tires",
        href: "/tires",
        icon: Disc3,
        description: "Quotes, orders & tire inventory",
      },
      {
        title: AP_TERMS.quickLabor,
        href: "/quick-labor",
        icon: Timer,
        description: "Labor times by VIN or plate",
      },
      {
        title: "Catalog",
        href: "/inventory",
        icon: Package,
        description: "Parts inventory & stock levels",
      },
      {
        title: "Messages",
        href: "/messages",
        icon: MessageSquare,
        description: "Customer SMS threads",
      },
      {
        title: "Google Reviews",
        href: "/marketing/reviews",
        icon: Star,
        description: "Sync and reply to Google Business Profile reviews",
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        title: "Growth",
        href: "/marketing",
        icon: TrendingUp,
        description: "Acquire, retain & get found locally",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "Shop performance reports",
      },
      {
        title: "Payments",
        href: "/payments",
        icon: CreditCard,
        description: "Transactions & Stripe Connect",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        title: "Admin",
        href: "/settings",
        icon: Settings,
        description: "Team, vendors, shop libraries & settings",
      },
      {
        title: AP_TERMS.cannedJobs,
        href: "/canned-jobs",
        icon: Star,
        description: "Reusable service templates for estimates",
      },
      {
        title: "Labor Library",
        href: "/labor-guide",
        icon: Wrench,
        // Platform-shared reference + shop overlay — not a full per-tenant corpus dump.
        description: "Shared labor times with shop overlay",
      },
      {
        title: "Inspection Templates",
        href: "/inspections",
        icon: ClipboardCheck,
        description: "Inspection templates & shop-wide inspections",
      },
    ],
  },
];

export const AP_SIDEBAR_NAV_ITEMS_FLAT: ApNavLink[] = AP_SIDEBAR_NAV_GROUPS.flatMap(
  (g) => g.items,
);

/** Payments module subnav */
export const AP_PAYMENTS_NAV_ITEMS: ApNavLink[] = [
  { title: "Activity", href: "/payments", icon: CreditCard },
  { title: "Connect Account", href: "/payments/account", icon: CreditCard },
  { title: "Terminals", href: "/payments/terminals", icon: CreditCard },
  { title: "Documents", href: "/payments/documents", icon: FileText, disabled: true },
  { title: "Disputes", href: "/payments/disputes", icon: FileText, disabled: true },
];

/** Markups subnav */
export const AP_MARKUPS_NAV_ITEMS: ApNavLink[] = [
  { title: "Parts Pricing", href: "/settings/markups/parts", icon: Package },
  { title: "Labor Pricing", href: "/settings/markups/labor", icon: Wrench },
];

/** SEO Autopilot subnav — same routes, Autopilot labels where applicable */
export const AP_SEO_AUTOPILOT_NAV_ITEMS: ApNavLink[] = SEO_AUTOPILOT_TABS.map((tab) => ({
  title: tab.label,
  href: tab.href,
  icon: Radar,
  description: tab.description,
}));

/** Settings — grouped hub (replaces horizontal tab strip in 3030) */
export const AP_SETTINGS_GROUPS: ApNavGroup[] = [
  {
    id: "identity",
    label: "Shop Identity",
    items: [
      { title: AP_TERMS.shopProfile, href: "/settings", icon: Settings },
    ],
  },
  {
    id: "service",
    label: "Service Defaults",
    items: [
      { title: AP_TERMS.roSettings, href: "/settings/ro-settings", icon: FileText },
      {
        title: "Quote & Invoice Display",
        href: "/settings/ro-settings?section=quote-invoice-display",
        icon: FileText,
      },
      { title: "Appointments", href: "/settings/appointments", icon: CalendarDays },
    ],
  },
  {
    id: "pricing",
    label: "Pricing & Quotes",
    items: [
      { title: "Pricing Matrices", href: "/settings/markups", icon: Receipt },
      { title: "Quote Terms", href: "/settings/ro-settings?section=estimate-terms", icon: FileText },
      {
        title: "Estimate Workspace",
        href: "/settings/ro-settings?section=estimate-workspace",
        icon: FileText,
      },
    ],
  },
  {
    id: "customers",
    label: "Customer Data",
    items: [
      { title: "Customer Defaults", href: "/settings/customers", icon: Users },
      { title: "Lead Tracking", href: "/settings/marketing", icon: Target },
      { title: "Commissions", href: "/settings/commissions", icon: Receipt },
    ],
  },
  {
    id: "connections",
    label: "Connections",
    items: [
      { title: "Integrations", href: "/settings/integrations", icon: Globe },
      { title: "Communications", href: "/settings/communications", icon: MessageSquare },
      { title: "QuickBooks", href: "/settings/quickbooks", icon: FileText },
    ],
  },
  {
    id: "account",
    label: "Account & Compliance",
    items: [
      { title: "Legal", href: "/settings/legal", icon: Shield },
      { title: "Subscription", href: "/settings/subscription", icon: CreditCard },
    ],
  },
];

export const AP_SETTINGS_NAV_FLAT: ApNavLink[] = AP_SETTINGS_GROUPS.flatMap((g) => g.items);

/** Settings nav groups for the active shop CRM build (plan-filtered). */
export function apSettingsGroupsForBuild(features?: PlanFeatureSet): ApNavGroup[] {
  if (!features) return AP_SETTINGS_GROUPS;
  return AP_SETTINGS_GROUPS.map((group) => {
    const items = group.items.filter((item) => isApSettingsLinkVisible(item.href, features));
    let label = group.label;
    if (
      group.id === "connections" &&
      items.length === 1 &&
      items[0]?.href === "/settings/communications" &&
      !features.integrations
    ) {
      label = "Communications";
    }
    return { ...group, label, items };
  }).filter((g) => g.items.length > 0);
}

/** Repair Order workspace phases — stepper labels (routes unchanged). See `src/lib/ro-phases.ts`.
 *  Payment moved into the Finance drawer — no longer a phase step. */
export const AP_SERVICE_TICKET_PHASES: ApNavLink[] = [
  { title: "Overview", href: "", icon: FileText },
  { title: "Estimate", href: "estimate", icon: Receipt },
  { title: "Work in Progress", href: "work-in-progress", icon: Wrench },
];

/** Primary command rail sections */
export const AP_NAV_SECTIONS: ApNavSection[] = [
  {
    id: "operations",
    label: "Operations",
    icon: LayoutDashboard,
    href: "/dashboard/snapshot",
    description: "Dashboard, job board & shop floor tools",
    items: AP_OPERATIONS_NAV_ITEMS,
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    href: "/customers",
    items: [
      {
        title: "All Customers",
        href: "/customers",
        icon: Users,
        description: "Search, tags & contact info",
      },
      {
        title: AP_TERMS.maintenanceSubscribers,
        href: "/maintenance-programs/subscribers",
        icon: Shield,
        description: "Care plan subscribers & renewals",
      },
    ],
  },
  {
    id: "schedule",
    label: "Appointments",
    icon: CalendarDays,
    href: "/appointments",
    items: [
      {
        title: "Appointments",
        href: "/appointments",
        icon: CalendarDays,
        description: "Calendar & booking",
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Package,
    href: "/inventory",
    description: "Parts inventory & stock levels",
    items: [{ title: "Inventory", href: "/inventory", icon: Package }],
  },
  {
    id: "growth",
    label: AP_TERMS.growthEngine,
    icon: TrendingUp,
    href: "/marketing",
    description: "Acquire, retain & get found locally",
    items: AP_GROWTH_NAV_ITEMS,
  },
  {
    id: "admin",
    label: "Admin",
    icon: Settings,
    href: "/settings",
    description: AP_TERMS.shopSettings,
    items: [
      { title: "Team", href: "/employees", icon: IdCard },
      { title: "Vendor Connect", href: "/vendors/integrations", icon: Truck },
      { title: AP_TERMS.cannedJobs, href: "/canned-jobs", icon: Star },
      {
        title: "Labor Library",
        href: "/labor-guide",
        icon: Wrench,
        description:
          "Platform-shared labor reference + shop overlay — not a full per-tenant corpus dump",
      },
      { title: "Inspection Templates", href: "/inspections", icon: ClipboardCheck },
      ...AP_SETTINGS_NAV_FLAT.slice(0, 3),
      { title: AP_TERMS.shopSettings, href: "/settings", icon: Settings },
      { title: "Help & Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** Primary top bar sections — Operations stays fixed in the left sidebar. */
export const AP_TOP_NAV_SECTIONS: ApNavSection[] = AP_NAV_SECTIONS.filter(
  (section) => section.id !== "operations",
);

/** In-page chip subnav for Catalog — inventory only (single page, chips usually hidden). */
export const AP_CATALOG_MODULE_NAV_ITEMS: ApNavLink[] =
  AP_NAV_SECTIONS.find((s) => s.id === "catalog")?.items ?? [];

/** Catalog chips filtered by plan (Core hides plan-gated catalog entries). */
export function apCatalogNavItemsForPlan(features: PlanFeatureSet): ApNavLink[] {
  return AP_CATALOG_MODULE_NAV_ITEMS.filter((item) =>
    isCatalogNavHrefVisible(item.href, features),
  );
}

/** In-page chip subnav for Dashboard routes (not shown in the operations sidebar). */
export const AP_DASHBOARD_MODULE_NAV_ITEMS: ApNavLink[] = [
  { title: "Snapshot", href: "/dashboard/snapshot", icon: Camera, description: "Today's shop activity" },
  { title: "KPIs", href: "/dashboard/kpis", icon: BarChart3, description: "Sales & performance" },
  {
    title: "Shop Activity",
    href: "/dashboard/shop-activity",
    icon: ActivityIcon,
    description: "Advisor and shop event timeline",
  },
];

export const AP_DASHBOARD_HREF = "/dashboard/snapshot";

/** In-page chip subnav for Customers top section. */
export const AP_CUSTOMERS_MODULE_NAV_ITEMS: ApNavLink[] =
  AP_NAV_SECTIONS.find((s) => s.id === "customers")?.items ?? [];

/** In-page chip subnav for Admin — team, vendors, shop libraries, settings, help. */
export const AP_ADMIN_MODULE_NAV_ITEMS: ApNavLink[] = [
  { title: "Team", href: "/employees", icon: IdCard },
  { title: "Vendor Connect", href: "/vendors/integrations", icon: Truck },
  { title: AP_TERMS.cannedJobs, href: "/canned-jobs", icon: Star },
  {
    title: "Labor Library",
    href: "/labor-guide",
    icon: Wrench,
    description:
      "Platform-shared labor reference + shop overlay — not a full per-tenant corpus dump",
  },
  { title: "Inspection Templates", href: "/inspections", icon: ClipboardCheck },
  { title: AP_TERMS.shopSettings, href: "/settings", icon: Settings },
  { title: "Help & Support", href: "/support", icon: LifeBuoy },
];

/** Admin module chips filtered by plan — Vendor Connect follows `partsTech` (Ignition+). */
export function apAdminNavItemsForPlan(features: PlanFeatureSet): ApNavLink[] {
  return AP_ADMIN_MODULE_NAV_ITEMS.filter((item) =>
    isAdminNavHrefVisible(item.href, features),
  );
}

const CATALOG_PATH_PREFIXES = ["/inventory"] as const;

/** Shop libraries live under Admin IA (not Catalog). */
const ADMIN_SHOP_LIBRARY_PATH_PREFIXES = [
  "/canned-jobs",
  "/labor-guide",
  "/inspections",
] as const;

const ADMIN_PATH_PREFIXES = [
  "/settings",
  "/employees",
  "/support",
  "/vendors",
  ...ADMIN_SHOP_LIBRARY_PATH_PREFIXES,
] as const;

export const AP_HOME_HREF = AP_DASHBOARD_HREF;

export const AP_NAV_ITEMS_FLAT: ApNavLink[] = AP_NAV_SECTIONS.flatMap((s) => s.items);

const OPERATIONS_PATH_PREFIXES = [
  "/dashboard",
  "/home",
  "/job-board",
  "/workflow",
  "/tech-board",
  "/tires",
  "/quick-labor",
  "/messages",
  "/marketing/reviews",
  "/reports",
  "/repair-orders",
  "/payments",
];

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/workflow", "/marketing"]);

/** Admin hub sidebar item — settings/team/vendors/support (libraries have their own System links). */
const ADMIN_HUB_PATH_PREFIXES = [
  "/settings",
  "/employees",
  "/support",
  "/vendors",
] as const;

/** Flat list used for sidebar active matching. */
export function apSidebarNavItemIsActive(pathname: string, item: ApNavLink): boolean {
  if (item.href === "/settings") {
    return ADMIN_HUB_PATH_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }
  return apNavItemIsActive(pathname, item, AP_SIDEBAR_NAV_ITEMS_FLAT);
}

export function apSectionForPath(pathname: string): ApNavSection {
  if (ADMIN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return AP_NAV_SECTIONS.find((s) => s.id === "admin")!;
  }
  // Google Reviews is a Core Shop menu item — not Growth Engine chrome.
  if (pathname === "/marketing/reviews" || pathname.startsWith("/marketing/reviews/")) {
    return AP_NAV_SECTIONS.find((s) => s.id === "operations")!;
  }
  if (pathname.startsWith("/marketing")) {
    return AP_NAV_SECTIONS.find((s) => s.id === "growth")!;
  }
  if (
    OPERATIONS_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return AP_NAV_SECTIONS.find((s) => s.id === "operations")!;
  }
  for (const section of AP_NAV_SECTIONS) {
    if (section.href && (pathname === section.href || pathname.startsWith(`${section.href}/`))) {
      return section;
    }
    if (section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return section;
    }
  }
  return AP_NAV_SECTIONS[0];
}

export function apSectionIsActive(pathname: string, section: ApNavSection): boolean {
  return apSectionForPath(pathname).id === section.id;
}

export function apNavItemIsActive(
  pathname: string,
  item: ApNavLink,
  sectionItems: ApNavLink[],
): boolean {
  let resolved = pathname;
  if (pathname.startsWith("/repair-orders/") && pathname !== "/repair-orders/new") {
    resolved = "/job-board";
  }
  if (pathname.startsWith("/settings/markups")) {
    if (item.href === "/settings/markups") return true;
  }
  if (pathname === "/settings/subscription" || pathname === "/settings/billing" || pathname === "/billing") {
    if (item.href === "/settings/subscription") return true;
  }
  if (
    item.href === "/marketing/payment-account" &&
    (pathname.startsWith("/marketing/payment-account") ||
      pathname.startsWith("/settings/payments") ||
      pathname === "/settings/integrations/stripe")
  ) {
    return true;
  }

  function matches(href: string): boolean {
    // Sidebar "Dashboard" stays active for Snapshot, KPIs, Shop Activity, and legacy Overview.
    if (
      href === "/dashboard/snapshot" ||
      href === "/dashboard/kpis" ||
      href === "/dashboard/shop-activity"
    ) {
      return resolved === "/dashboard" || resolved.startsWith("/dashboard/");
    }
    if (href === "/dashboard/overview") {
      return resolved === "/dashboard/overview" || resolved.startsWith("/dashboard/overview/");
    }
    if (href === "/dashboard") {
      return resolved === "/dashboard" || resolved.startsWith("/dashboard/");
    }
    // Sidebar "Catalog" — inventory only.
    if (href === "/inventory") {
      return resolved === "/inventory" || resolved.startsWith("/inventory/");
    }
    if (EXACT_MATCH_HREFS.has(href)) return resolved === href;
    if (href === "/settings") return resolved === "/settings";
    if (href === "/payments") return resolved === "/payments";
    return resolved === href || resolved.startsWith(`${href}/`);
  }

  const candidates = sectionItems.filter((i) => matches(i.href));
  if (candidates.length === 0) return false;
  const best = candidates.reduce((a, b) => (a.href.length >= b.href.length ? a : b));
  return best.href === item.href;
}

export function apPageTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/snapshot")) return "Dashboard";
  if (
    pathname.startsWith("/dashboard/kpis") ||
    pathname.startsWith("/dashboard/overview")
  ) {
    return "KPIs";
  }
  if (pathname.startsWith("/dashboard/shop-activity")) return "Shop Activity";
  if (pathname === "/workflow") return "Workflow";
  if (pathname.startsWith("/repair-orders/")) return AP_TERMS.repairOrder;
  if (pathname.startsWith("/settings")) return AP_TERMS.shopSettings;
  if (pathname === "/marketing/reviews" || pathname.startsWith("/marketing/reviews/")) {
    return "Google Reviews";
  }
  if (pathname.startsWith("/marketing")) return AP_TERMS.growthEngine;
  const matches = AP_NAV_ITEMS_FLAT.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const match = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return match?.title ?? "Autopilot";
}

/** Context panel is always shown on desktop (3030 shell); kept for callers/tests. */
export function apShowContextPanel(_pathname: string): boolean {
  return true;
}

export function apShowOperationsPanel(pathname: string): boolean {
  return apSectionForPath(pathname).id === "operations";
}

export function apModuleSubnavKind(
  pathname: string,
): "none" | "dashboard" | "growth" | "settings" | "markups" | "payments" | "seo" | "catalog" | "customers" | "admin" {
  // Snapshot + KPIs + Shop Activity share an in-page chip strip under Dashboard.
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/snapshot") ||
    pathname.startsWith("/dashboard/kpis") ||
    pathname.startsWith("/dashboard/shop-activity") ||
    pathname.startsWith("/dashboard/overview")
  ) {
    return "dashboard";
  }
  if (pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/marketing/seo-automation")) return "seo";
  // Reviews is Shop chrome — no Growth Engine pill strip.
  if (pathname === "/marketing/reviews" || pathname.startsWith("/marketing/reviews/")) {
    return "none";
  }
  if (pathname.startsWith("/marketing")) return "growth";
  if (pathname.startsWith("/payments")) return "payments";
  if (ADMIN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "admin";
  }
  if (pathname.startsWith("/customers") || pathname.startsWith("/maintenance-programs")) {
    return "customers";
  }
  if (CATALOG_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // Single inventory page — skip redundant chip strip.
    return AP_CATALOG_MODULE_NAV_ITEMS.length > 1 ? "catalog" : "none";
  }
  return "none";
}

export function apSettingsNavActive(pathname: string, href: string): boolean {
  if (href === "/settings") return pathname === "/settings";
  if (href === "/settings/subscription") {
    return (
      pathname === "/settings/subscription" ||
      pathname === "/settings/billing" ||
      pathname === "/billing"
    );
  }
  if (href === "/settings/markups") return pathname.startsWith("/settings/markups");
  return pathname === href || pathname.startsWith(`${href}/`);
}
