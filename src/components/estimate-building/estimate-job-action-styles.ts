import { cn } from "@/lib/utils";

/** Shared shell — three separate outline buttons, not a segmented bar. */
const BUTTON_BASE = cn(
  "h-9 min-w-[8.25rem] shrink-0 gap-1.5 rounded-md px-3 text-sm font-medium",
  "inline-flex items-center justify-center whitespace-nowrap",
  "border border-brand-navy/25 bg-white text-brand-navy shadow-sm",
  "hover:border-brand-navy/40 hover:bg-brand-navy/[0.04]",
  "active:bg-brand-navy/[0.07] active:shadow-none",
  "focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-1",
  "transition-[color,background-color,border-color,box-shadow]",
);

/** Flex row wrapper — spaced buttons with clear gap, not flush segments. */
export const estimateJobActionGroupClass = cn(
  "inline-flex flex-wrap items-center gap-2",
);

/** Canned jobs — muted star icon. */
export const estimateJobActionCannedButton = cn(
  BUTTON_BASE,
  "[&>svg:first-child]:text-brand-navy/60",
);

/** + Job — same outline chrome as siblings. */
export const estimateJobActionJobButton = cn(
  BUTTON_BASE,
  "[&>svg:first-child]:text-brand-navy",
);

/** Job with AI — orange sparkles accent on matching shell. */
export const estimateJobActionAiButton = cn(
  BUTTON_BASE,
  "hover:bg-brand-orange/[0.06]",
  "[&>svg:first-child]:text-brand-orange",
  "hover:[&>svg:first-child]:text-brand-orange",
);
