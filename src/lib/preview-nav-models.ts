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
import type { NavGroup, NavItem } from "@/lib/nav";

export type PreviewNavModelId =
  | "tekmetric"
  | "hubspot"
  | "salesforce"
  | "stripe-rail"
  | "pipedrive"
  | "intercom";

export type PreviewNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export type PreviewNavModel = {
  id: PreviewNavModelId;
  name: string;
  reference: string;
  tagline: string;
  pros: string[];
  cons: string[];
  recommended?: boolean;
  /** Classic grouped sidebar */
  groups?: NavGroup[];
  /** Icon-rail sections (Stripe-style) */
  sections?: PreviewNavSection[];
  /** Flat primary row labels for visual mockups */
  primaryLabels: string[];
};

const WORK_ITEMS: NavItem[] = [
  { title: "Job Board", href: "/job-board", icon: Columns3 },
  { title: "Tech Board", href: "/tech-board", icon: Gauge },
  { title: "Appointments", href: "/appointments", icon: CalendarDays },
];

const PEOPLE_ITEMS: NavItem[] = [
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Care Plan Members", href: "/maintenance-programs/subscribers", icon: Shield },
];

const CATALOG_ITEMS: NavItem[] = [
  { title: "Inventory", href: "/inventory", icon: Package },
  { title: "Tires", href: "/tires", icon: Disc3 },
  { title: "Canned Jobs", href: "/canned-jobs", icon: Star },
  { title: "Labor Book", href: "/labor-guide", icon: Wrench },
  { title: "Inspections", href: "/inspections", icon: ClipboardCheck },
  { title: "Vendors", href: "/vendors/integrations", icon: Truck },
  { title: "Orders", href: "/orders", icon: Receipt, stub: true },
];

const BUSINESS_ITEMS: NavItem[] = [
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: GROWTH_ENGINE.name, href: "/marketing", icon: TrendingUp },
  { title: "Payments", href: "/payments", icon: CreditCard },
];

const ADMIN_ITEMS: NavItem[] = [
  { title: "Employees", href: "/employees", icon: IdCard },
  { title: "Shop Settings", href: "/settings", icon: Settings },
  { title: "Billing", href: "/billing", icon: FileText },
  { title: "Help & Support", href: "/support", icon: LifeBuoy },
];

/** Classic grouped sidebar (legacy shop SMS reference layout). */
const LEGACY_SMS_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Shop Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Job Board", href: "/job-board", icon: Columns3 },
      { title: "Messages", href: "/messages", icon: MessageSquare },
      { title: "Tech Board", href: "/tech-board", icon: Gauge },
    ],
  },
  {
    label: "Main",
    items: [
      { title: "Appointments", href: "/appointments", icon: CalendarDays },
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
      { title: "Care Plan Members", href: "/maintenance-programs/subscribers", icon: Shield },
      { title: "Vendors", href: "/vendors/integrations", icon: Truck },
      { title: "Canned Jobs", href: "/canned-jobs", icon: Star },
      { title: "Labor Book", href: "/labor-guide", icon: Wrench },
      { title: "Inspections", href: "/inspections", icon: ClipboardCheck },
    ],
  },
  {
    label: "Admin",
    items: ADMIN_ITEMS,
  },
];

export const PREVIEW_NAV_MODELS: PreviewNavModel[] = [
  {
    id: "tekmetric",
    name: "Legacy grouped sidebar",
    reference: "Classic shop SMS · grouped nav",
    tagline: "Ungrouped top + Main / Manage / Admin — familiar module layout.",
    pros: ["Familiar to shop software users", "Every module one click away"],
    cons: ["Long scroll", "Work and admin mixed", "Less distinct visually"],
    primaryLabels: ["Dashboard", "Job Board", "Messages", "Main…", "Manage…", "Admin…"],
    groups: LEGACY_SMS_GROUPS,
  },
  {
    id: "hubspot",
    name: "Work-first CRM",
    reference: "HubSpot · Attio",
    tagline: "Today → Work → Customers → Catalog → Business → Setup.",
    pros: [
      "Matches how shops run the day",
      "Inbox near work items",
      "Analytics separated from operations",
    ],
    cons: ["One extra group to learn", "Dashboard not at very top"],
    recommended: true,
    primaryLabels: ["Today", "Work", "Customers", "Catalog", "Business", "Setup"],
    groups: [
      {
        label: "Today",
        items: [
          { title: "Shop Home", href: "/job-board", icon: LayoutDashboard },
          { title: "Messages", href: "/messages", icon: MessageSquare },
        ],
      },
      { label: "Work", items: WORK_ITEMS },
      { label: "Customers", items: PEOPLE_ITEMS.filter((i) => i.href !== "/messages") },
      { label: "Catalog", items: CATALOG_ITEMS },
      {
        label: "Business",
        items: [
          { title: "Shop Dashboard", href: "/dashboard", icon: BarChart3 },
          ...BUSINESS_ITEMS,
        ],
      },
      { label: "Setup", items: ADMIN_ITEMS },
    ],
  },
  {
    id: "salesforce",
    name: "App clouds",
    reference: "Salesforce · Microsoft Dynamics",
    tagline: "Five “apps” — Work, Customers, Parts, Revenue, Admin.",
    pros: ["Scales as you add modules", "Clear mental buckets", "Good for training staff by role"],
    cons: ["More clicks for power users", "Labels feel enterprise"],
    primaryLabels: ["Work", "Customers", "Parts & jobs", "Revenue", "Admin"],
    groups: [
      { label: "Work", items: [{ title: "Shop Home", href: "/job-board", icon: LayoutDashboard }, ...WORK_ITEMS] },
      { label: "Customers", items: PEOPLE_ITEMS },
      { label: "Parts & jobs", items: CATALOG_ITEMS },
      {
        label: "Revenue",
        items: [
          { title: "Shop Dashboard", href: "/dashboard", icon: LayoutDashboard },
          ...BUSINESS_ITEMS,
        ],
      },
      { label: "Admin", items: ADMIN_ITEMS },
    ],
  },
  {
    id: "stripe-rail",
    name: "Icon rail + flyout",
    reference: "Stripe · Slack · Notion",
    tagline: "6 icon sections — sidebar stays narrow, sub-menu expands.",
    pros: ["Maximum space for job board", "Modern SaaS feel", "Scales without long scroll"],
    cons: ["Two-click navigation", "New pattern for shop staff"],
    primaryLabels: ["Work", "Inbox", "Customers", "Catalog", "Insights", "Settings"],
    sections: [
      { id: "work", label: "Work", icon: Columns3, items: [{ title: "Shop Home", href: "/job-board", icon: LayoutDashboard }, ...WORK_ITEMS] },
      { id: "inbox", label: "Inbox", icon: MessageSquare, items: [{ title: "Messages", href: "/messages", icon: MessageSquare }] },
      { id: "customers", label: "Customers", icon: Users, items: PEOPLE_ITEMS.filter((i) => i.href !== "/messages") },
      { id: "catalog", label: "Catalog", icon: Package, items: CATALOG_ITEMS },
      {
        id: "insights",
        label: "Insights",
        icon: BarChart3,
        items: [
          { title: "Shop Dashboard", href: "/dashboard", icon: LayoutDashboard },
          ...BUSINESS_ITEMS,
        ],
      },
      { id: "settings", label: "Settings", icon: Settings, items: ADMIN_ITEMS },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipeline-primary",
    reference: "Pipedrive · Monday.com",
    tagline: "Flat primary nav — board + customers + schedule up top, rest in More.",
    pros: ["Fast access to pipeline", "Minimal cognitive load", "Great for service advisors"],
    cons: ["Secondary items hidden", "Less discoverable for new hires"],
    primaryLabels: ["Home", "Job Board", "Customers", "Appointments", "Reports", "More…"],
    groups: [
      {
        items: [
          { title: "Shop Home", href: "/job-board", icon: LayoutDashboard },
          { title: "Job Board", href: "/job-board", icon: Columns3 },
          { title: "Customers", href: "/customers", icon: Users },
          { title: "Messages", href: "/messages", icon: MessageSquare },
          { title: "Appointments", href: "/appointments", icon: CalendarDays },
          { title: "Reports", href: "/reports", icon: BarChart3 },
        ],
      },
      {
        label: "More",
        items: [
          { title: "Tech Board", href: "/tech-board", icon: Gauge },
          { title: "Shop Dashboard", href: "/dashboard", icon: BarChart3 },
          ...CATALOG_ITEMS,
          ...BUSINESS_ITEMS.filter((i) => i.href !== "/reports"),
          ...ADMIN_ITEMS,
        ],
      },
    ],
  },
  {
    id: "intercom",
    name: "Inbox-centric",
    reference: "Intercom · Zendesk · Front",
    tagline: "Messages + today’s work first — CRM built around conversations.",
    pros: ["Puts customer comms first", "Distinct from shop SMS tools", "Natural for follow-ups"],
    cons: ["Deprioritizes inventory/admin", "Less ideal for back-office roles"],
    primaryLabels: ["Inbox", "Today", "Customers", "Work", "Settings"],
    groups: [
      {
        label: "Inbox",
        items: [
          { title: "Messages", href: "/messages", icon: MessageSquare },
          { title: "Shop Home", href: "/job-board", icon: LayoutDashboard },
        ],
      },
      {
        label: "Work",
        items: WORK_ITEMS,
      },
      {
        label: "Customers",
        items: [
          { title: "Customers", href: "/customers", icon: Users },
          { title: "Care Plan Members", href: "/maintenance-programs/subscribers", icon: Shield },
        ],
      },
      {
        label: "Shop",
        items: [...CATALOG_ITEMS, ...BUSINESS_ITEMS],
      },
      { label: "Settings", items: ADMIN_ITEMS },
    ],
  },
];

export const DEFAULT_PREVIEW_NAV_MODEL: PreviewNavModelId = "hubspot";

export function getPreviewNavModel(id: string | null | undefined): PreviewNavModel {
  return (
    PREVIEW_NAV_MODELS.find((m) => m.id === id) ??
    PREVIEW_NAV_MODELS.find((m) => m.id === DEFAULT_PREVIEW_NAV_MODEL)!
  );
}

/** All nav items across a model (for title lookup). */
export function previewNavItemsForModel(model: PreviewNavModel): NavItem[] {
  if (model.groups) {
    return model.groups.flatMap((g) => g.items);
  }
  if (model.sections) {
    return model.sections.flatMap((s) => s.items);
  }
  return [];
}

export const PREVIEW_NAV_STORAGE_KEY = "rp-preview-nav-model";
