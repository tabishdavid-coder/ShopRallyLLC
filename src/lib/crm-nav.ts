import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
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
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { GROWTH_ENGINE, GROWTH_PRODUCTS, type GrowthProductId } from "@/lib/growth-engine-brand";
import type { NavItem } from "@/lib/nav";

export type CrmNavLink = NavItem & {
  description?: string;
};

export type CrmNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Top-bar link when section has a single primary destination */
  href?: string;
  items: CrmNavLink[];
};

const GROWTH_NAV_ICONS: Record<Exclude<GrowthProductId, "overview">, LucideIcon> = {
  outreach: Megaphone,
  automations: Zap,
  booking: CalendarCheck,
  bayCare: Shield,
  reputationPilot: Star,
  shopSite: Globe,
  seoAutopilot: Radar,
  leadSources: Target,
};

const GROWTH_NAV_PRODUCT_IDS = [
  "outreach",
  "automations",
  "booking",
  "bayCare",
  "reputationPilot",
  "shopSite",
  "seoAutopilot",
  "leadSources",
] as const satisfies readonly Exclude<GrowthProductId, "overview">[];

/** Secondary nav items for Growth Engine (/marketing/*). */
export const CRM_GROWTH_NAV_ITEMS: CrmNavLink[] = [
  {
    title: GROWTH_PRODUCTS.overview.label,
    href: GROWTH_PRODUCTS.overview.href,
    icon: LayoutDashboard,
    description: GROWTH_PRODUCTS.overview.shortDescription,
  },
  ...GROWTH_NAV_PRODUCT_IDS.map((id) => ({
    title: GROWTH_PRODUCTS[id].label,
    href: GROWTH_PRODUCTS[id].href,
    icon: GROWTH_NAV_ICONS[id],
    description: GROWTH_PRODUCTS[id].shortDescription,
  })),
];

/** Dashboard section items — pinned in left sidebar (Overview + shop floor tools). */
export const CRM_DASHBOARD_NAV_ITEMS: CrmNavLink[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "KPIs, pipeline & action items",
  },
  {
    title: "Job Board",
    href: "/job-board",
    icon: Columns3,
    description: "RO pipeline — estimates, WIP & completed",
  },
  {
    title: "Tech Board",
    href: "/tech-board",
    icon: Gauge,
    description: "Dispatch work by technician",
  },
  {
    title: "Tires",
    href: "/tires",
    icon: Disc3,
    description: "Quotes, orders & tire inventory",
  },
  {
    title: "Quick Labor",
    href: "/quick-labor",
    icon: Timer,
    description: "Labor times by VIN or plate — no customer needed",
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    description: "Customer SMS inbox",
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
    description: "Transactions & Stripe",
  },
];

export const CRM_NAV_SECTIONS: CrmNavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: CRM_DASHBOARD_NAV_ITEMS,
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
        title: "Care Plan Members",
        href: "/maintenance-programs/subscribers",
        icon: Shield,
        description: "Subscribers & renewals",
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
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    href: "/reports",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        description: "Shop performance reports",
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: Package,
    items: [
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Canned Jobs", href: "/canned-jobs", icon: Star },
      { title: "Labor Book", href: "/labor-guide", icon: Wrench },
      { title: "Inspections", href: "/inspections", icon: ClipboardCheck },
      { title: "Vendors", href: "/vendors/integrations", icon: Truck },
      { title: "Orders", href: "/orders", icon: Receipt, stub: true },
    ],
  },
  {
    id: "growth",
    label: GROWTH_ENGINE.name,
    icon: TrendingUp,
    href: "/marketing",
    items: CRM_GROWTH_NAV_ITEMS,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { title: "Employees", href: "/employees", icon: IdCard },
      { title: "Shop Settings", href: "/settings", icon: Settings },
      { title: "Billing", href: "/settings/subscription", icon: FileText },
      { title: "Help & Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** Top header section tabs — same sections as CRM_NAV_SECTIONS. */
export const CRM_HEADER_SECTIONS = CRM_NAV_SECTIONS;

/** Dashboard section — always pinned in the left sidebar. */
export const CRM_DASHBOARD_SECTION = CRM_NAV_SECTIONS.find((s) => s.id === "dashboard")!;

/** @deprecated Use CRM_DASHBOARD_SECTION */
export const CRM_WORK_SECTION = CRM_DASHBOARD_SECTION;

export const CRM_HOME_HREF = "/dashboard";

/** Flat list for title lookup. */
export const CRM_NAV_ITEMS: CrmNavLink[] = CRM_NAV_SECTIONS.flatMap((s) => s.items);

const DASHBOARD_PATH_PREFIXES = [
  "/dashboard",
  "/job-board",
  "/workflow",
  "/tech-board",
  "/tires",
  "/quick-labor",
  "/messages",
  "/reports",
  "/repair-orders",
  "/payments",
];

export function crmSectionForPath(pathname: string): CrmNavSection {
  if (
    DASHBOARD_PATH_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return CRM_DASHBOARD_SECTION;
  }
  for (const section of CRM_NAV_SECTIONS) {
    if (section.href && (pathname === section.href || pathname.startsWith(`${section.href}/`))) {
      return section;
    }
    if (
      section.items.some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
    ) {
      return section;
    }
  }
  return CRM_NAV_SECTIONS[0];
}

export function crmNavIsActive(pathname: string, item: CrmNavLink): boolean {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/marketing") return pathname === "/marketing";
  if (pathname === "/workflow") return item.href === "/job-board";
  if (pathname.startsWith("/repair-orders/") && pathname !== "/repair-orders/new") {
    return item.href === "/job-board";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function crmPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Overview";
  if (pathname.startsWith("/repair-orders/")) return "Repair Order";
  const matches = CRM_NAV_ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  const match = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return match?.title ?? "ShopRally";
}

export function crmSectionIsActive(pathname: string, section: CrmNavSection): boolean {
  if (
    section.id === "reports" &&
    (pathname === "/reports" || pathname.startsWith("/reports/"))
  ) {
    return true;
  }
  return crmSectionForPath(pathname).id === section.id;
}

export function isDashboardSectionPath(pathname: string): boolean {
  return crmSectionForPath(pathname).id === "dashboard";
}

/** True when the dashboard left sidebar / mobile pills should show. */
export function isDashboardSidebarPath(pathname: string): boolean {
  return isDashboardSectionPath(pathname);
}

/** @deprecated Use isDashboardSectionPath */
export function isWorkSectionPath(pathname: string): boolean {
  return isDashboardSectionPath(pathname);
}
