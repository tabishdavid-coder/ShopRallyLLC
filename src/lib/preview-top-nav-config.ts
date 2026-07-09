import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Columns3,
  CreditCard,
  Disc3,
  FileText,
  Gauge,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Shield,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { GROWTH_ENGINE } from "@/lib/growth-engine-brand";
import type { NavItem } from "@/lib/nav";

export type TopNavLink = {
  kind: "link";
  label: string;
  href: string;
  icon: LucideIcon;
  /** Highlight when pathname matches any of these prefixes */
  match?: string[];
};

export type TopNavMenu = {
  kind: "menu";
  label: string;
  icon: LucideIcon;
  description?: string;
  items: NavItem[];
};

export type TopNavEntry = TopNavLink | TopNavMenu;

export type ContextTab = {
  label: string;
  href: string;
  match: string[];
};

/** Primary navigation — horizontal top bar (HubSpot / Stripe header pattern). */
export const PREVIEW_TOP_NAV: TopNavEntry[] = [
  {
    kind: "link",
    label: "Home",
    href: "/preview",
    icon: LayoutDashboard,
    match: ["/preview"],
  },
  {
    kind: "menu",
    label: "Work",
    icon: Columns3,
    description: "Daily shop floor",
    items: [
      { title: "Shop Home", href: "/job-board", icon: LayoutDashboard },
      { title: "Tech Board", href: "/tech-board", icon: Gauge },
      { title: "Appointments", href: "/appointments", icon: CalendarDays },
    ],
  },
  {
    kind: "link",
    label: "Messages",
    href: "/messages",
    icon: MessageSquare,
    match: ["/messages"],
  },
  {
    kind: "link",
    label: "Customers",
    href: "/customers",
    icon: Users,
    match: ["/customers", "/maintenance-programs"],
  },
  {
    kind: "menu",
    label: "Catalog",
    icon: Package,
    description: "Parts, jobs & vendors",
    items: [
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Tires", href: "/tires", icon: Disc3 },
      { title: "Canned Jobs", href: "/canned-jobs", icon: Star },
      { title: "Labor Book", href: "/labor-guide", icon: Wrench },
      { title: "Inspections", href: "/inspections", icon: ClipboardCheck },
      { title: "Vendors", href: "/vendors/integrations", icon: Truck },
      { title: "Orders", href: "/orders", icon: Receipt, stub: true },
      { title: "Maintenance Plans", href: "/maintenance-programs/subscribers", icon: Shield },
    ],
  },
  {
    kind: "menu",
    label: "Insights",
    icon: BarChart3,
    description: "Reports & revenue",
    items: [
      { title: "Shop Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: GROWTH_ENGINE.name, href: "/marketing", icon: TrendingUp },
      { title: "Payments", href: "/payments", icon: CreditCard },
    ],
  },
  {
    kind: "menu",
    label: "Setup",
    icon: Settings,
    description: "Shop admin",
    items: [
      { title: "Employees", href: "/employees", icon: IdCard },
      { title: "Shop Settings", href: "/settings", icon: Settings },
      { title: "Billing", href: "/billing", icon: FileText },
      { title: "Help & Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

/** Secondary tabs shown under the header when browsing Work modules. */
export const PREVIEW_WORK_TABS: ContextTab[] = [
  { label: "Shop Home", href: "/preview", match: ["/preview"] },
  { label: "Tech Board", href: "/tech-board", match: ["/tech-board"] },
  { label: "Appointments", href: "/appointments", match: ["/appointments"] },
];

export type PreviewShellLayoutId = "top-nav" | "left-sidebar";

export const PREVIEW_SHELL_LAYOUT_KEY = "rp-preview-shell-layout";

export const DEFAULT_SHELL_LAYOUT: PreviewShellLayoutId = "top-nav";

export const PREVIEW_SHELL_LAYOUTS = [
  {
    id: "top-nav" as const,
    name: "Top command bar",
    reference: "HubSpot · Stripe · Freshworks",
    description:
      "Primary modules across the top — full-width content, no left sidebar scroll.",
    recommended: true,
  },
  {
    id: "left-sidebar" as const,
    name: "Left sidebar",
    reference: "Classic shop SMS · grouped nav",
    description: "Classic vertical menu on the left for comparison.",
  },
];
