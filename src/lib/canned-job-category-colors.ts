import { cn } from "@/lib/utils";

/** Preset canned-job categories that get distinct scan colors. */
export type CannedJobCategoryPreset =
  | "Brakes"
  | "Electrical"
  | "Engine"
  | "Fluids"
  | "Inspection"
  | "Maintenance"
  | "Other"
  | "Suspension";

type CategoryColorSet = {
  /** Soft tint — badges and unselected chips */
  soft: string;
  /** Stronger fill — selected builder chips */
  chipActive: string;
  /** Unselected builder chip hover */
  chipHover: string;
  /** Rounded filter chip — selected */
  filterActive: string;
  /** Rounded filter chip — unselected */
  filterInactive: string;
};

const PRESET_COLORS: Record<CannedJobCategoryPreset, CategoryColorSet> = {
  Brakes: {
    soft: "border-brand-red/30 bg-brand-red/10 text-brand-red",
    chipActive: "border-brand-red/55 bg-brand-red/22 text-brand-red shadow-sm",
    chipHover: "hover:border-brand-red/40 hover:bg-brand-red/16 hover:text-brand-red",
    filterActive: "border-brand-red bg-brand-red text-white",
    filterInactive:
      "border-brand-red/30 bg-brand-red/10 text-brand-red hover:border-brand-red/45 hover:bg-brand-red/16",
  },
  Electrical: {
    soft: "border-amber-600/30 bg-amber-500/12 text-amber-950",
    chipActive: "border-amber-600/55 bg-amber-500/24 text-amber-950 shadow-sm",
    chipHover: "hover:border-amber-600/45 hover:bg-amber-500/18 hover:text-amber-950",
    filterActive: "border-amber-700 bg-amber-700 text-white",
    filterInactive:
      "border-amber-600/30 bg-amber-500/12 text-amber-950 hover:border-amber-600/45 hover:bg-amber-500/18",
  },
  Engine: {
    soft: "border-violet-700/30 bg-violet-600/10 text-violet-950",
    chipActive: "border-violet-700/55 bg-violet-600/22 text-violet-950 shadow-sm",
    chipHover: "hover:border-violet-700/45 hover:bg-violet-600/16 hover:text-violet-950",
    filterActive: "border-violet-800 bg-violet-800 text-white",
    filterInactive:
      "border-violet-700/30 bg-violet-600/10 text-violet-950 hover:border-violet-700/45 hover:bg-violet-600/16",
  },
  Fluids: {
    soft: "border-sky-600/30 bg-sky-500/12 text-sky-950",
    chipActive: "border-sky-600/55 bg-sky-500/24 text-sky-950 shadow-sm",
    chipHover: "hover:border-sky-600/45 hover:bg-sky-500/18 hover:text-sky-950",
    filterActive: "border-sky-700 bg-sky-700 text-white",
    filterInactive:
      "border-sky-600/30 bg-sky-500/12 text-sky-950 hover:border-sky-600/45 hover:bg-sky-500/18",
  },
  Inspection: {
    soft: "border-emerald-700/30 bg-emerald-600/10 text-emerald-950",
    chipActive: "border-emerald-700/55 bg-emerald-600/22 text-emerald-950 shadow-sm",
    chipHover: "hover:border-emerald-700/45 hover:bg-emerald-600/16 hover:text-emerald-950",
    filterActive: "border-emerald-800 bg-emerald-800 text-white",
    filterInactive:
      "border-emerald-700/30 bg-emerald-600/10 text-emerald-950 hover:border-emerald-700/45 hover:bg-emerald-600/16",
  },
  Maintenance: {
    soft: "border-brand-navy/30 bg-brand-navy/10 text-brand-navy",
    chipActive: "border-brand-navy/55 bg-brand-navy/18 text-brand-navy shadow-sm",
    chipHover: "hover:border-brand-navy/45 hover:bg-brand-navy/14 hover:text-brand-navy",
    filterActive: "border-brand-navy bg-brand-navy text-white",
    filterInactive:
      "border-brand-navy/30 bg-brand-navy/10 text-brand-navy hover:border-brand-navy/45 hover:bg-brand-navy/14",
  },
  Other: {
    soft: "border-slate-400/35 bg-slate-100 text-slate-700",
    chipActive: "border-slate-500/50 bg-slate-200/80 text-slate-900 shadow-sm",
    chipHover: "hover:border-slate-400/50 hover:bg-slate-100 hover:text-slate-800",
    filterActive: "border-slate-600 bg-slate-600 text-white",
    filterInactive:
      "border-slate-400/35 bg-slate-100 text-slate-700 hover:border-slate-500/45 hover:bg-slate-200/70",
  },
  Suspension: {
    soft: "border-brand-orange/35 bg-brand-orange/12 text-orange-950",
    chipActive: "border-brand-orange/60 bg-brand-orange/26 text-orange-950 shadow-sm",
    chipHover: "hover:border-brand-orange/50 hover:bg-brand-orange/18 hover:text-orange-950",
    filterActive: "border-brand-orange bg-brand-orange text-white",
    filterInactive:
      "border-brand-orange/35 bg-brand-orange/12 text-orange-950 hover:border-brand-orange/50 hover:bg-brand-orange/18",
  },
};

const CUSTOM_CATEGORY_COLORS: CategoryColorSet = {
  soft: "border-brand-light/45 bg-brand-light/18 text-brand-navy",
  chipActive: "border-brand-light/60 bg-brand-light/35 text-brand-navy shadow-sm",
  chipHover: "hover:border-brand-light/55 hover:bg-brand-light/25 hover:text-brand-navy",
  filterActive: "border-brand-navy bg-brand-navy text-white",
  filterInactive:
    "border-brand-light/45 bg-brand-light/18 text-brand-navy hover:border-brand-light/60 hover:bg-brand-light/25",
};

const NONE_CHIP_COLORS = {
  active: "border-border bg-muted/70 text-foreground shadow-sm",
  inactive:
    "border-border bg-white text-muted-foreground hover:border-brand-light/50 hover:bg-brand-light/12 hover:text-brand-navy",
};

function resolvePreset(category: string): CategoryColorSet | null {
  if (category in PRESET_COLORS) {
    return PRESET_COLORS[category as CannedJobCategoryPreset];
  }
  return null;
}

/** List/table badge — always soft tint so rows stay scannable. */
export function cannedJobCategoryBadgeClasses(category: string | null | undefined): string {
  if (!category) return "border-border bg-muted/40 text-muted-foreground";
  return resolvePreset(category)?.soft ?? CUSTOM_CATEGORY_COLORS.soft;
}

const CHIP_BASE = "rounded border px-2 py-1 text-[11px] font-semibold transition-colors";

/** Builder header tag chips — per-tag hue, stronger when selected. */
export function cannedJobCategoryChipClasses(
  category: string | null,
  active: boolean,
): string {
  if (!category) {
    return cn(CHIP_BASE, active ? NONE_CHIP_COLORS.active : NONE_CHIP_COLORS.inactive);
  }

  const colors = resolvePreset(category) ?? CUSTOM_CATEGORY_COLORS;
  return cn(CHIP_BASE, active ? colors.chipActive : cn(colors.soft, colors.chipHover));
}

const FILTER_CHIP_BASE =
  "rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors";

/** Canned jobs list filter row — rounded pills with category hue. */
export function cannedJobCategoryFilterChipClasses(category: string, active: boolean): string {
  const colors = resolvePreset(category) ?? CUSTOM_CATEGORY_COLORS;
  return cn(FILTER_CHIP_BASE, active ? colors.filterActive : colors.filterInactive);
}

/** "All" / clear filter chip on canned jobs list. */
export function cannedJobCategoryFilterAllChipClasses(active: boolean): string {
  return cn(
    FILTER_CHIP_BASE,
    active
      ? "border-brand-navy bg-brand-navy text-white"
      : "border-border bg-background text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
  );
}
