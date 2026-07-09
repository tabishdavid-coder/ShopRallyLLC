import { type CrmNavLink } from "@/lib/crm-nav";
import { cn } from "@/lib/utils";

/** Routes that should highlight a different nav item than their URL suggests. */
const NAV_PATH_ALIASES: Record<string, string> = {};

/** Exact-match only — no child paths. */
const EXACT_MATCH_HREFS = new Set(["/dashboard", "/workflow"]);

function pathMatchesHref(pathname: string, href: string): boolean {
  if (EXACT_MATCH_HREFS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveNavPath(pathname: string): string {
  if (NAV_PATH_ALIASES[pathname]) return NAV_PATH_ALIASES[pathname];
  if (pathname.startsWith("/repair-orders/") && pathname !== "/repair-orders/new") {
    return "/job-board";
  }
  return pathname;
}

/** True when this sidebar/mobile item is the current page (longest-prefix wins). */
export function crmNavItemIsActive(
  pathname: string,
  item: CrmNavLink,
  sectionItems: CrmNavLink[],
): boolean {
  const resolved = resolveNavPath(pathname);
  const candidates = sectionItems.filter((i) => pathMatchesHref(resolved, i.href));
  if (candidates.length === 0) return false;
  const best = candidates.reduce((a, b) => (a.href.length >= b.href.length ? a : b));
  return best.href === item.href;
}

/** Shared active styles — sidebar + mobile pills. */
export function crmSidebarNavClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 min-h-11",
    active ? "crm-nav-item-active" : "crm-nav-item-idle",
  );
}

/** Top header section tabs — same highlight language as sidebar nav. */
export function crmHeaderSectionTabClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[0.8125rem] transition-colors duration-150",
    active ? "crm-header-nav-item-active" : "crm-header-nav-item-idle",
  );
}

/** Shared active styles — top section tabs (light sub-nav only). */
export function crmSectionTabClass(active: boolean) {
  return cn(
    "gap-1.5 rounded-md",
    active ? "crm-nav-tab-active" : "crm-nav-tab-idle",
  );
}

/** Shared active styles — mobile section pills. */
export function crmMobilePillClass(active: boolean) {
  return cn(
    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
    active ? "crm-nav-pill-active" : "crm-nav-pill-idle",
  );
}
