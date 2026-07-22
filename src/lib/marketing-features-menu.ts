/**
 * Marketing Features mega-menu catalog — AutoLeap-style 4-column IA,
 * ShopRally Ignition scope (prefer shipping; muted "Soon" for roadmap).
 *
 * Hashes must match section `id`s on `/features` (`features-page.tsx`).
 */
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Car,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  MessageSquare,
  Package,
  Plug,
  Receipt,
  ScanBarcode,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";

export type FeaturesMenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional badge (e.g. AI) — brand red, not competitor teal */
  badge?: "AI";
  /** Roadmap / Pro+ — muted "Soon" chip; keep sparse */
  soon?: boolean;
};

export type FeaturesMenuColumn = {
  id: string;
  title: string;
  items: FeaturesMenuItem[];
};

/** Hash fragment from a `/features#…` href (empty if none). */
export function featuresMenuHash(href: string): string {
  const i = href.indexOf("#");
  return i >= 0 ? href.slice(i + 1) : "";
}

/** Desktop mega-menu + mobile accordion sections. */
export const FEATURES_MENU_COLUMNS: FeaturesMenuColumn[] = [
  {
    id: "increase-revenue",
    title: "Increase revenue",
    items: [
      {
        label: "AI Plus",
        href: "/features#ai-plus",
        icon: Sparkles,
        badge: "AI",
      },
      {
        label: "Digital vehicle inspections",
        href: "/features#inspections",
        icon: ClipboardCheck,
      },
      {
        label: "PartsTech catalog & punchout",
        href: "/features#partstech",
        icon: Package,
      },
      {
        label: "Carfax service history",
        href: "/features#carfax",
        icon: Car,
      },
      {
        label: "Email & SMS approvals",
        href: "/features#approvals",
        icon: Share2,
      },
      {
        label: "Partner integrations",
        href: "/integrations",
        icon: Plug,
      },
    ],
  },
  {
    id: "operate-efficiently",
    title: "Operate efficiently",
    items: [
      {
        label: "Estimates & RO workspace",
        href: "/features#estimates",
        icon: Wrench,
      },
      {
        label: "Job board",
        href: "/features#job-board",
        icon: LayoutGrid,
      },
      {
        label: "Appointments",
        href: "/features#appointments",
        icon: Calendar,
      },
      {
        label: "Canned jobs & shop labor",
        href: "/features#canned-jobs",
        icon: BookOpen,
      },
      {
        label: "VIN decode",
        href: "/features#vin-decode",
        icon: ScanBarcode,
      },
      {
        label: "Inventory basics",
        href: "/features#inventory",
        icon: Package,
      },
    ],
  },
  {
    id: "real-time-insights",
    title: "Real-time insights",
    items: [
      {
        label: "Live Operations Daily Snapshot",
        href: "/features#daily-snapshot",
        icon: BarChart3,
      },
      {
        label: "Shop reports",
        href: "/features#shop-reports",
        icon: FileText,
      },
      {
        label: "Payment tracking",
        href: "/features#payments",
        icon: Receipt,
      },
      {
        label: "Customers & vehicles",
        href: "/features#customers",
        icon: Users,
      },
      {
        label: "Advanced reporting",
        href: "/features#advanced-reporting",
        icon: BarChart3,
        soon: true,
      },
      {
        label: "QuickBooks sync",
        href: "/features#quickbooks",
        icon: FileText,
        soon: true,
      },
    ],
  },
  {
    id: "delight-customers",
    title: "Delight customers",
    items: [
      {
        label: "Two-way SMS",
        href: "/features#two-way-sms",
        icon: MessageSquare,
      },
      {
        label: "Google Reviews inbox",
        href: "/features#reviews",
        icon: Star,
      },
      {
        label: "Digital estimates & invoices",
        href: "/features#digital-estimates",
        icon: FileText,
      },
      {
        label: "Inspection share links",
        href: "/features#inspection-share",
        icon: ClipboardCheck,
      },
      {
        label: "Advisor mobile app",
        href: "/features#advisor-app",
        icon: Smartphone,
      },
      {
        label: "Online booking",
        href: "/features#online-booking",
        icon: Calendar,
        soon: true,
      },
    ],
  },
];

/** Solid marketing Features page — not a hash-only or stub route. */
export const FEATURES_MENU_SEE_ALL = {
  label: "See all features",
  href: "/features" as const,
};

