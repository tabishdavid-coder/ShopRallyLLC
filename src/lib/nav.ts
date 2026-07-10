import {
  LayoutDashboard,
  MessageSquare,
  Columns3,
  Gauge,
  CalendarDays,
  Disc3,
  Globe,
  Package,
  Receipt,
  BarChart3,
  TrendingUp,
  Shield,
  Users,
  Truck,
  Star,
  Wrench,
  ClipboardCheck,
  IdCard,
  Settings,
  CreditCard,
  FileText,
  Building2,
  LifeBuoy,
  Megaphone,
  Radar,
  Rocket,
  ServerCog,
  Scale,
  Timer,
  Workflow,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

import { GROWTH_ENGINE } from "@/lib/growth-engine-brand";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Not yet built — rendered with a placeholder page. */
  stub?: boolean;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

/** @deprecated Production CRM uses `CRM_NAV_SECTIONS` from `@/lib/crm-nav` via `CrmShell`. Kept for preview mocks. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Job Board", href: "/job-board", icon: Columns3 },
      { title: "Messages", href: "/messages", icon: MessageSquare },
      { title: "Tech Board", href: "/tech-board", icon: Gauge },
    ],
  },
  {
    label: "Main",
    items: [
      { title: "Appointments", href: "/appointments", icon: CalendarDays },
      { title: "Quick Labor", href: "/quick-labor", icon: Timer },
      { title: "Tires", href: "/tires", icon: Disc3 },
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Orders", href: "/orders", icon: Receipt, stub: true },
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: GROWTH_ENGINE.name, href: "/marketing", icon: TrendingUp },
    ],
  },
  {
    label: "Manage",
    items: [
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Maintenance Plans", href: "/maintenance-programs/subscribers", icon: Shield },
      { title: "Vendors", href: "/vendors/integrations", icon: Truck },
      { title: "Canned Jobs", href: "/canned-jobs", icon: Star },
      { title: "Labor Book", href: "/labor-guide", icon: Wrench },
      { title: "Inspections", href: "/inspections", icon: ClipboardCheck },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Employees", href: "/employees", icon: IdCard },
      { title: "Shop Settings", href: "/settings", icon: Settings },
      { title: "Payments", href: "/payments", icon: CreditCard },
      { title: "Billing", href: "/billing", icon: FileText },
      { title: "Help & Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** Flattened list for title lookups. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const EXACT_MATCH_HREFS = new Set(["/dashboard", "/workflow"]);

/** Whether a sidebar nav item should show as active for the current path. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/platform") return pathname === "/platform";
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolve a shop page title from the current pathname. */
export function navTitle(pathname: string): string | undefined {
  if (pathname.startsWith("/repair-orders/")) return "Repair Order";
  const match = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
  return match?.title;
}

/**
 * Platform owner navigation — grouped IA for ShopRally operators.
 * Shown only to platform admins and only while browsing `/platform/**`.
 */
export const PLATFORM_NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Overview", href: "/platform", icon: LayoutDashboard },
      { title: "Shops", href: "/platform/shops", icon: Building2 },
      { title: "Onboarding", href: "/platform/onboarding", icon: Rocket },
      { title: "Customer websites", href: "/platform/websites", icon: Globe },
      { title: "Support", href: "/platform/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "Billing & Plans", href: "/platform/billing", icon: CreditCard },
      { title: "Sales Leads", href: "/platform/leads", icon: Megaphone },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "Legal & Compliance", href: "/platform/legal", icon: Scale },
      { title: "Growth Engine SEO", href: "/platform/seo-automation", icon: Radar },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Release review", href: "/platform/review", icon: ClipboardList },
      { title: "System", href: "/platform/system", icon: ServerCog },
    ],
  },
];

/** Flattened platform nav for title lookups and breadcrumbs. */
export const PLATFORM_NAV_ITEMS: NavItem[] = PLATFORM_NAV_GROUPS.flatMap((g) => g.items);

/** @deprecated Use PLATFORM_NAV_GROUPS — kept for any legacy imports. */
export const PLATFORM_NAV_GROUP: NavGroup = {
  label: "Platform",
  items: PLATFORM_NAV_ITEMS,
};

/** Resolve a platform page title from the current pathname. */
export function platformNavTitle(pathname: string): string | undefined {
  if (pathname.startsWith("/platform/review/batch-04")) {
    return "Batch 4 — Platform tools";
  }
  if (pathname.startsWith("/platform/review")) {
    return "Release review";
  }

  const match = PLATFORM_NAV_ITEMS.find((item) =>
    item.href === "/platform"
      ? pathname === "/platform"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title;
}
