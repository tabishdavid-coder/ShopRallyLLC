import { cn } from "@/lib/utils";

/**
 * Horizontal sub-nav patterns:
 * - `subnavTabClass` — underline tabs (Settings, Payments, CRM secondary nav). Do not change for settings.
 * - `apSubnavPillClass` / `ApSubnavPills` — pill chips (3030 module subnav: Growth Hub, SEO, …).
 * - `apSubnavTabClass` / `ApSubnavTabs` — underline + icon tabs (RO workspace Concerns | Services | …).
 */

/** Horizontal sub-nav row (RO tabs, Settings, Payments, …). */
export function subnavBarClass(className?: string) {
  return cn("flex flex-wrap gap-x-0.5 border-b border-border bg-card/50", className);
}

/** Horizontal tab link/button — active = cyan wash + bottom bar (crm-subnav-tab-active). */
export function subnavTabClass(active: boolean, className?: string) {
  return cn(
    "shrink-0 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
    active ? "crm-subnav-tab-active" : "crm-subnav-tab-idle",
    className,
  );
}

/** Disabled horizontal tab (coming soon). */
export function subnavTabDisabledClass(className?: string) {
  return cn(
    "shrink-0 cursor-not-allowed px-3 py-2.5 text-sm font-medium text-muted-foreground/50 sm:px-4",
    className,
  );
}

/** Top-bordered tab row (parts hub status strip). */
export function subnavTabTopClass(active: boolean, className?: string) {
  return cn(
    "border-t-2 border-transparent transition-colors",
    active ? "crm-subnav-tab-top-active" : "crm-subnav-tab-top-idle",
    className,
  );
}

/** Vertical section list (RO summary panes, settings side lists). */
export function subnavVerticalClass(active: boolean, className?: string) {
  return cn(
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
    active ? "crm-subnav-vertical-active" : "crm-subnav-vertical-idle",
    className,
  );
}

/** Default prefix match for tab hrefs (exact for /marketing, /payments, /settings roots). */
export function subnavHrefIsActive(pathname: string, href: string): boolean {
  if (href === "/marketing") return pathname === "/marketing";
  if (href === "/payments") return pathname === "/payments";
  if (href === "/settings") return pathname === "/settings";
  if (href === "/billing") return pathname === "/billing" || pathname.startsWith("/billing/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
