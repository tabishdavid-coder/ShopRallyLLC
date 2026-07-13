import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  CalendarClock,
  Calculator,
  CreditCard,
  FileSpreadsheet,
  HandCoins,
  MessagesSquare,
  Megaphone,
  Scale,
  Store,
  Users,
  Wrench,
} from "lucide-react";

import type { PlanFeatureSet } from "@/lib/plans";
import {
  isSettingsChildVisible,
  isSettingsSectionVisible,
} from "@/lib/settings-plan-gates";

/**
 * Single source of truth for the Admin / Settings information architecture.
 * Drives the grouped left index rail, the settings search typeahead, and the
 * landing overview. Every route rendered under /settings/** should map to a
 * section (or one of its children) here so it is reachable + searchable.
 */

export type SettingsGroupId =
  | "shop"
  | "repair-orders"
  | "customers"
  | "communications"
  | "platform";

export type SettingsGroup = {
  id: SettingsGroupId;
  label: string;
};

export const SETTINGS_GROUPS: SettingsGroup[] = [
  { id: "shop", label: "Shop" },
  { id: "repair-orders", label: "Repair Orders" },
  { id: "customers", label: "Customers & Marketing" },
  { id: "communications", label: "Communications" },
  { id: "platform", label: "Integrations & Billing" },
];

/** A deep-linkable sub-page or in-page section of a settings section. */
export type SettingsChild = {
  id: string;
  label: string;
  href: string;
  keywords?: string[];
};

export type SettingsSection = {
  id: string;
  label: string;
  href: string;
  group: SettingsGroupId;
  icon: LucideIcon;
  /** One-line description shown in the overview + search results. */
  description: string;
  keywords: string[];
  children?: SettingsChild[];
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "shop-profile",
    label: "Shop Profile",
    href: "/settings/shop-profile",
    group: "shop",
    icon: Store,
    description: "Business name, address, contact info, and logo.",
    keywords: ["profile", "address", "phone", "email", "logo", "business", "hours", "shop id", "license", "tax id"],
    children: [
      { id: "address", label: "Shop Address", href: "/settings/shop-profile", keywords: ["location", "city", "state", "zip"] },
      { id: "contact", label: "Phone & Email", href: "/settings/shop-profile", keywords: ["contact", "website"] },
      { id: "logo", label: "Shop Logo", href: "/settings/shop-profile", keywords: ["brand", "image"] },
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    href: "/settings/appointments",
    group: "shop",
    icon: CalendarClock,
    description: "Working hours and default appointment duration.",
    keywords: ["schedule", "hours", "calendar", "booking", "duration", "day start", "day end", "timezone"],
  },
  {
    id: "legal",
    label: "Legal",
    href: "/settings/legal",
    group: "shop",
    icon: Scale,
    description: "Entity details, agreements, and acceptance history.",
    keywords: ["compliance", "msa", "agreement", "terms", "entity", "acceptance", "contract"],
  },
  {
    id: "ro-settings",
    label: "RO Settings",
    href: "/settings/ro-settings",
    group: "repair-orders",
    icon: Wrench,
    description: "Labor rates, fees, taxes, invoicing, and estimate terms.",
    keywords: ["repair order", "labor rate", "fees", "taxes", "discounts", "invoice", "estimate", "gross profit"],
    children: [
      { id: "labor", label: "Labor Rates", href: "/settings/ro-settings?section=labor", keywords: ["rate", "hourly"] },
      { id: "fees", label: "Shop Fees", href: "/settings/ro-settings?section=fees", keywords: ["supply", "shop fee"] },
      { id: "discounts", label: "Discounts", href: "/settings/ro-settings?section=discounts" },
      { id: "taxes", label: "Taxes", href: "/settings/ro-settings?section=taxes", keywords: ["sales tax", "tax rate"] },
      { id: "categories", label: "Job Categories", href: "/settings/ro-settings?section=categories" },
      { id: "payment", label: "Payment Settings", href: "/settings/ro-settings?section=payment" },
      { id: "invoice", label: "Invoice Numbering", href: "/settings/ro-settings?section=invoice", keywords: ["ro number", "sequence"] },
      {
        id: "quote-display",
        label: "Quote & Invoice Display",
        href: "/settings/ro-settings?section=quote-invoice-display",
        keywords: ["transparency", "show", "hide"],
      },
      {
        id: "estimate-terms",
        label: "Estimate Terms",
        href: "/settings/ro-settings?section=estimate-terms",
        keywords: ["terms", "conditions", "disclaimer"],
      },
      {
        id: "estimate-workspace",
        label: "Estimate Workspace",
        href: "/settings/ro-settings?section=estimate-workspace",
        keywords: ["jobs layout", "builder"],
      },
      { id: "gp", label: "GP/hr Goal", href: "/settings/ro-settings?section=gp", keywords: ["gross profit", "goal", "target"] },
      { id: "job-board", label: "Job Board", href: "/settings/ro-settings?section=jobBoard", keywords: ["pipeline", "columns", "kanban"] },
      { id: "advanced", label: "Advanced Settings", href: "/settings/ro-settings?section=advanced" },
    ],
  },
  {
    id: "markups",
    label: "Markups",
    href: "/settings/markups/parts",
    group: "repair-orders",
    icon: Calculator,
    description: "Parts & labor matrices and quote transparency.",
    keywords: ["matrix", "parts", "labor", "markup", "multiplier", "pricing", "margin", "transparency"],
    children: [
      { id: "parts", label: "Parts Matrix", href: "/settings/markups/parts", keywords: ["cost", "multiplier", "retail"] },
      { id: "labor", label: "Labor Matrix", href: "/settings/markups/labor", keywords: ["hours", "multiplier"] },
      { id: "transparency", label: "Transparency", href: "/settings/markups/transparency", keywords: ["show", "hide", "display"] },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    href: "/settings/customers",
    group: "customers",
    icon: Users,
    description: "Customer tags and default marketing opt-in.",
    keywords: ["tags", "marketing opt-in", "tcpa", "contacts"],
  },
  {
    id: "marketing",
    label: "Lead Sources",
    href: "/settings/marketing",
    group: "customers",
    icon: Megaphone,
    description: "Marketing sources shown when creating a repair order.",
    keywords: ["marketing", "referral", "source", "how did you hear", "attribution"],
  },
  {
    id: "commissions",
    label: "Commissions",
    href: "/settings/commissions",
    group: "customers",
    icon: HandCoins,
    description: "Service advisor and technician commission rules.",
    keywords: ["pay", "advisor", "technician", "spiff", "payroll", "bonus"],
  },
  {
    id: "communications",
    label: "Communications",
    href: "/settings/communications/phone-sms",
    group: "communications",
    icon: MessagesSquare,
    description: "Phone & SMS, email sending, and customer notifications.",
    keywords: ["sms", "text", "phone", "twilio", "email", "notifications", "messaging", "alerts"],
    children: [
      {
        id: "phone-sms",
        label: "Phone & SMS",
        href: "/settings/communications/phone-sms",
        keywords: ["twilio", "text", "number", "messaging"],
      },
      { id: "email", label: "Email", href: "/settings/communications/email", keywords: ["resend", "sender", "smtp"] },
      {
        id: "notifications",
        label: "Notifications",
        href: "/settings/communications/notifications",
        keywords: ["alerts", "reminders", "customer updates"],
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/settings/integrations",
    group: "platform",
    icon: Blocks,
    description: "Connect VIN, parts, Carfax, payments, and auth providers.",
    keywords: ["stripe", "twilio", "carfax", "partstech", "vin", "auto.dev", "nhtsa", "clerk", "api", "connect"],
  },
  {
    id: "quickbooks",
    label: "QuickBooks",
    href: "/settings/quickbooks",
    group: "platform",
    icon: FileSpreadsheet,
    description: "Export invoices and payments for accounting.",
    keywords: ["accounting", "export", "csv", "intuit", "bookkeeping"],
  },
  {
    id: "subscription",
    label: "Subscription",
    href: "/settings/subscription",
    group: "platform",
    icon: CreditCard,
    description: "Plan, billing, and invoice history for ShopRally.",
    keywords: ["billing", "plan", "invoice", "payment method", "upgrade", "tier", "pricing"],
  },
];

function filterSectionForPlan(section: SettingsSection, features: PlanFeatureSet): SettingsSection | null {
  if (!isSettingsSectionVisible(section.id, features)) return null;
  const children = section.children?.filter((c) => isSettingsChildVisible(c.id, features));
  if (section.id === "communications" && (!children || children.length === 0)) return null;
  const href =
    section.id === "communications" && children?.[0]
      ? children[0].href
      : section.href;
  return { ...section, href, children: children?.length ? children : undefined };
}

/** Plan-filtered sections grouped for nav + overview. */
export function filterGroupedSettingsSections(features: PlanFeatureSet): {
  group: SettingsGroup;
  sections: SettingsSection[];
}[] {
  return SETTINGS_GROUPS.map((group) => ({
    group,
    sections: SETTINGS_SECTIONS.map((s) => filterSectionForPlan(s, features))
      .filter((s): s is SettingsSection => s != null)
      .filter((s) => s.group === group.id),
  })).filter((g) => g.sections.length > 0);
}

/** Plan-filtered searchable index. */
export function filterSettingsSearchIndex(features: PlanFeatureSet): SettingsSearchEntry[] {
  const visible = SETTINGS_SECTIONS.map((s) => filterSectionForPlan(s, features)).filter(
    (s): s is SettingsSection => s != null,
  );
  const groupLabel = new Map(SETTINGS_GROUPS.map((g) => [g.id, g.label]));

  return visible.flatMap((section) => {
    const groupLabelStr = groupLabel.get(section.group) ?? "";
    const sectionEntry: SettingsSearchEntry = {
      key: section.id,
      label: section.label,
      href: section.href,
      icon: section.icon,
      sectionLabel: section.label,
      groupLabel: groupLabelStr,
      description: section.description,
      haystack: [section.label, section.description, groupLabelStr, ...section.keywords]
        .join(" ")
        .toLowerCase(),
      isChild: false,
    };
    const childEntries: SettingsSearchEntry[] = (section.children ?? []).map((child) => ({
      key: `${section.id}:${child.id}`,
      label: child.label,
      href: child.href,
      icon: section.icon,
      sectionLabel: section.label,
      groupLabel: groupLabelStr,
      haystack: [child.label, section.label, groupLabelStr, ...(child.keywords ?? [])]
        .join(" ")
        .toLowerCase(),
      isChild: true,
    }));
    return [sectionEntry, ...childEntries];
  });
}

/** Sections grouped for the left index rail + overview. */
export function groupedSettingsSections(features?: PlanFeatureSet): {
  group: SettingsGroup;
  sections: SettingsSection[];
}[] {
  if (features) return filterGroupedSettingsSections(features);
  return SETTINGS_GROUPS.map((group) => ({
    group,
    sections: SETTINGS_SECTIONS.filter((s) => s.group === group.id),
  })).filter((g) => g.sections.length > 0);
}

/** Active-state matcher for the left index rail (handles legacy aliases). */
export function settingsSectionIsActive(pathname: string, section: SettingsSection): boolean {
  switch (section.id) {
    case "shop-profile":
      return pathname === "/settings/shop-profile";
    case "ro-settings":
      return (
        pathname.startsWith("/settings/ro-settings") ||
        pathname === "/settings/estimates" ||
        pathname.startsWith("/settings/estimates/") ||
        pathname === "/settings/estimates-invoices"
      );
    case "markups":
      return pathname.startsWith("/settings/markups");
    case "communications":
      return (
        pathname.startsWith("/settings/communications") ||
        pathname === "/settings/messaging" ||
        pathname === "/settings/email" ||
        pathname === "/settings/notifications"
      );
    case "integrations":
      return pathname.startsWith("/settings/integrations");
    case "subscription":
      return (
        pathname === "/settings/subscription" ||
        pathname === "/settings/billing" ||
        pathname === "/billing"
      );
    default: {
      const base = section.href.split("?")[0];
      return pathname === base || pathname.startsWith(`${base}/`);
    }
  }
}

/** A single flattened, searchable entry (a section or one of its children). */
export type SettingsSearchEntry = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Section label the entry lives under (equals label for top-level sections). */
  sectionLabel: string;
  groupLabel: string;
  description?: string;
  /** Lowercased haystack used for matching. */
  haystack: string;
  isChild: boolean;
};

const GROUP_LABEL = new Map(SETTINGS_GROUPS.map((g) => [g.id, g.label]));

/** Flattened index of every searchable settings destination. */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = SETTINGS_SECTIONS.flatMap(
  (section) => {
    const groupLabel = GROUP_LABEL.get(section.group) ?? "";
    const sectionEntry: SettingsSearchEntry = {
      key: section.id,
      label: section.label,
      href: section.href,
      icon: section.icon,
      sectionLabel: section.label,
      groupLabel,
      description: section.description,
      haystack: [section.label, section.description, groupLabel, ...section.keywords]
        .join(" ")
        .toLowerCase(),
      isChild: false,
    };
    const childEntries: SettingsSearchEntry[] = (section.children ?? []).map((child) => ({
      key: `${section.id}:${child.id}`,
      label: child.label,
      href: child.href,
      icon: section.icon,
      sectionLabel: section.label,
      groupLabel,
      haystack: [child.label, section.label, groupLabel, ...(child.keywords ?? [])]
        .join(" ")
        .toLowerCase(),
      isChild: true,
    }));
    return [sectionEntry, ...childEntries];
  },
);

/** True when every char of `query` appears in order within `text` (fuzzy). */
function subsequenceMatch(query: string, text: string): boolean {
  let i = 0;
  for (let j = 0; j < text.length && i < query.length; j++) {
    if (text[j] === query[i]) i++;
  }
  return i === query.length;
}

/** Rank a query against the flattened index. Higher score = better match.
 * Prefers label prefix > label word-start > label substring > keyword
 * substring > fuzzy subsequence. Top-level sections beat children on ties.
 */
export function searchSettings(
  query: string,
  limit = 8,
  features?: PlanFeatureSet,
): SettingsSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = features ? filterSettingsSearchIndex(features) : SETTINGS_SEARCH_INDEX;

  const scored = index.map((entry) => {
    const label = entry.label.toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 80;
    else if (new RegExp(`\\b${escapeRegExp(q)}`).test(label)) score = 65;
    else if (label.includes(q)) score = 50;
    else if (entry.haystack.includes(q)) score = 30;
    else if (subsequenceMatch(q, label) || subsequenceMatch(q, entry.haystack)) score = 12;

    if (score > 0 && !entry.isChild) score += 3;
    return { entry, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));

  return scored.slice(0, limit).map((s) => s.entry);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
