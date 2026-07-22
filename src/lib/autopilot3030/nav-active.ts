import { cn } from "@/lib/utils";



/** Sidebar section label */

export function apSidebarSectionClass() {

  return "ap-sidebar-section-label";

}



/** Persistent sidebar nav link (dark chrome) */

export function apSidebarLinkClass(active: boolean) {

  return cn("ap-sidebar-link cursor-pointer", active && "ap-sidebar-link--active");

}



/** Command rail icon button — 44px touch target per mockup */

export function apRailItemClass(active: boolean) {

  return cn(

    "relative flex size-11 items-center justify-center rounded-xl transition-all duration-200",

    active ? "ap-rail-item-active" : "ap-rail-link-idle hover:text-white",

  );

}



/** Context panel nav link — light secondary panel beside dark rail */

export function apContextNavClass(active: boolean) {

  return cn(

    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150 min-h-10",

    active ? "ap-context-nav-active font-semibold" : "ap-context-nav-idle",

  );

}



/** Module subnav pill chip (horizontal) — Growth Hub, SEO, Markups, … */
export function apSubnavPillClass(active: boolean) {
  return cn(
    "ap-subnav-pill inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
    active ? "ap-subnav-pill--active ap-module-chip-active" : "ap-subnav-pill--idle ap-module-chip-idle",
  );
}

/** @deprecated Use apSubnavPillClass — kept for existing imports */
export function apModuleChipClass(active: boolean) {
  return apSubnavPillClass(active);
}

/** Underline tab subnav — RO workspace Concerns | Services | … */
export function apSubnavTabClass(active: boolean, className?: string) {
  return cn(
    "ap-subnav-tab flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm",
    active ? "ap-subnav-tab--active" : "ap-subnav-tab--idle",
    className,
  );
}



/** Mobile bottom nav item */

export function apMobileNavClass(active: boolean) {

  return cn(

    "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition-colors",

    active ? "ap-mobile-nav-active" : "ap-mobile-nav-idle",

  );

}

/** Horizontal top section tabs (Customers, Catalog, …) */

export function apTopSectionNavClass(active: boolean) {

  return cn(

    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",

    active ? "ap-top-section-nav-active" : "ap-top-section-nav-idle",

  );

}



/** Repair order stepper step */

export function apStepperStepClass(state: "complete" | "active" | "upcoming") {

  return cn(

    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",

    state === "complete" && "ap-text-accent-secondary",

    state === "active" && "ap-stepper-step-active",

    state === "upcoming" && "ap-text-subtle",

  );

}

