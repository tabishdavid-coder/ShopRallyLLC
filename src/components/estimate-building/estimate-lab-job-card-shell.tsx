"use client";

import { cn } from "@/lib/utils";

/** Lab job card chrome — square-corner Palette C shell (soft azure edge, light shadow). */
export function EstimateLabJobCardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-none border border-[#B9C8DC] bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Auto-save status pill in lab job header. */
export function EstimateLabSaveStatus({
  state,
}: {
  state: "idle" | "dirty" | "saving" | "saved";
}) {
  if (state === "idle") return null;
  const label =
    state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Unsaved changes";
  const tone =
    state === "saved"
      ? "text-emerald-700"
      : state === "saving"
        ? "text-muted-foreground"
        : "text-amber-800";
  return (
    <span className={cn("shrink-0 text-[10px] font-medium tabular-nums", tone)} role="status">
      {label}
    </span>
  );
}

/** Slim section label above labor/parts in lab builder. */
export function EstimateLabServiceItemsHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border/70 bg-muted/20 px-2 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Service items
      </span>
      <span className="text-[10px] text-muted-foreground">Edit lines inline · changes auto-save</span>
    </div>
  );
}

export const LAB_TABLE_HEAD =
  "border-b border-border/70 bg-muted/25 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground";
export const LAB_CELL = "px-1 py-0.5";
export const LAB_INPUT = "h-7 min-w-0 px-1 text-xs tabular-nums shadow-none";

/** Borderless inline field — focus ring only (Tekmetric flat grid). */
export const LAB_INPUT_FLAT = cn(
  LAB_INPUT,
  "rounded-none border-0 bg-transparent shadow-none",
  "focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-inset",
);

/** Fixed slot left of money inputs — chip, wand, or spacer — keeps Cost/Retail/Total aligned. */
export const LAB_MONEY_PREFIX = "flex w-9 shrink-0 items-center justify-center";

/**
 * Tekmetric-style service items grid — shared numeric tracks across labor + parts:
 * drag | type | name | description | qty/hrs | cost | rate/price | amount | discount | net | taxable | remove
 *
 * Type column fits full labels; money tracks fit $X,XXX.XX without clipping.
 */
export const LAB_LINE_GRID =
  "grid grid-cols-[24px_128px_minmax(68px,0.45fr)_minmax(88px,0.95fr)_72px_84px_84px_96px_80px_96px_52px_28px] items-stretch gap-0";
export const LAB_LINE_GRID_HEAD =
  "grid grid-cols-[24px_128px_minmax(68px,0.45fr)_minmax(88px,0.95fr)_72px_84px_84px_96px_80px_96px_52px_28px] items-center gap-0";

/** Minimum width before horizontal scroll kicks in. */
export const LAB_LINE_GRID_MIN_W = "min-w-[1112px]";

/** Vertical column divider — shared between adjacent cells (not a full box). */
export const LAB_GRID_DIVIDER = "border-r border-border/50";

/** @deprecated Use LAB_GRID_DIVIDER — kept for import compatibility during grid flatten. */
export const LAB_GRID_BORDER = LAB_GRID_DIVIDER;

/** Wrap every grid cell so inputs truncate instead of blowing column width. */
export const LAB_GRID_CELL = "min-w-0 overflow-hidden";
/** Numeric cells: allow digit glyphs to paint fully (overflow-hidden clipped hours decimals). */
export const LAB_GRID_NUM = "min-w-0 overflow-visible text-right tabular-nums";

/** Flat grid cell — divider on right, tight padding, no inner input box. */
export const LAB_GRID_CELL_BORDERED = cn(
  LAB_GRID_CELL,
  LAB_GRID_DIVIDER,
  "flex min-h-7 items-center px-1 py-0.5",
);
export const LAB_GRID_NUM_BORDERED = cn(
  LAB_GRID_NUM,
  LAB_GRID_DIVIDER,
  "flex min-h-7 items-center justify-end px-1.5 py-0.5",
);

/** Last grid column — no right divider. */
export const LAB_GRID_CELL_END = cn(
  LAB_GRID_CELL,
  "flex min-h-7 items-center justify-center px-1 py-0.5",
);

/**
 * Description column — 2-row textarea (labor detail, part brand, add-row stub).
 * Edge-to-edge in cell; subtle focus ring only.
 */
export const LAB_DESCRIPTION_TEXTAREA_CLASS = cn(
  "min-h-7 max-h-16 min-w-0 w-full resize-none px-1 py-0.5 text-xs",
  "rounded-none border-0 bg-transparent shadow-none",
  "focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-inset",
);

/** Fee/discount description column selects — flat, matches description textarea. */
export const LAB_DESCRIPTION_SELECT_CLASS = cn(
  "h-7 w-full min-w-0 rounded-none border-0 bg-transparent px-1 py-0.5 text-[10px] shadow-none outline-none",
  "focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-inset",
);
