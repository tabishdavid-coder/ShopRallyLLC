/** SEO Autopilot sub-navigation — shop-owner IA (Phase 1). */

export type SeoAutopilotTabId =
  | "overview"
  | "analytics"
  | "activity"
  | "health"
  | "sites"
  | "reports"
  | "plan";

export const SEO_AUTOPILOT_BASE = "/marketing/seo-automation";

export const SEO_AUTOPILOT_TABS: {
  id: SeoAutopilotTabId;
  label: string;
  href: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    href: SEO_AUTOPILOT_BASE,
    description: "Health score, traffic snapshot, and what runs next.",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: `${SEO_AUTOPILOT_BASE}/analytics`,
    description: "Search clicks, impressions, and top queries from Google.",
  },
  {
    id: "activity",
    label: "Activity",
    href: `${SEO_AUTOPILOT_BASE}/activity`,
    description: "Everything ShopRally ran — audits, content, indexing.",
  },
  {
    id: "health",
    label: "Health",
    href: `${SEO_AUTOPILOT_BASE}/health`,
    description: "Local SEO checklist and open fixes.",
  },
  {
    id: "sites",
    label: "Sites",
    href: `${SEO_AUTOPILOT_BASE}/sites`,
    description: "Manage websites, Search Console, and autopilot settings.",
  },
  {
    id: "reports",
    label: "Reports",
    href: `${SEO_AUTOPILOT_BASE}/reports`,
    description: "Past monthly SEO reports and performance snapshots.",
  },
  {
    id: "plan",
    label: "Plan & services",
    href: `${SEO_AUTOPILOT_BASE}/plan`,
    description: "What your subscription includes and add-ons.",
  },
];

export function seoAutopilotTabFromPath(pathname: string): SeoAutopilotTabId {
  if (pathname === SEO_AUTOPILOT_BASE || pathname === `${SEO_AUTOPILOT_BASE}/`) {
    return "overview";
  }
  for (const tab of SEO_AUTOPILOT_TABS) {
    if (tab.id !== "overview" && (pathname === tab.href || pathname.startsWith(`${tab.href}/`))) {
      return tab.id;
    }
  }
  return "overview";
}
