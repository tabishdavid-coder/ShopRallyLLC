"use client";

import { BookOpen, ChevronDown, Package, Wrench } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { LAB_INPUT_FLAT } from "@/components/estimate-building/estimate-lab-job-card-shell";

export type InlineLineType =
  | "labor"
  | "part"
  | "tire"
  | "sublet"
  | "hazardous"
  | "other"
  | "fee"
  | "discount";

export const INLINE_LINE_TYPE_OPTIONS: { value: InlineLineType; label: string }[] = [
  { value: "labor", label: "Labor" },
  { value: "part", label: "Part" },
  { value: "tire", label: "Tire" },
  { value: "sublet", label: "Sublet" },
  { value: "hazardous", label: "Hazardous" },
  { value: "other", label: "Other" },
  { value: "fee", label: "Fee" },
  { value: "discount", label: "Discount" },
];

/** Part-family types for the Type column on part rows (no Labor). */
export const PART_FAMILY_LINE_TYPES: InlineLineType[] = [
  "part",
  "tire",
  "sublet",
  "hazardous",
  "other",
];

/** Labor Type column — labor + fee/discount (Labor Book lives in the actions section). */
export const LABOR_LINE_TYPES: InlineLineType[] = ["labor", "fee", "discount"];

export type EstimateLineTypeMenuScope = "labor" | "part" | "all";

export type EstimateLineTypeMenuHandlers = {
  onLaborFromGuide?: () => void;
  /** Opens parts catalog lookup — labor guide has no part SKUs yet. */
  onPartFromGuide?: () => void;
  onCustomLabor?: () => void;
  onCustomPart?: () => void;
  /** Tekmetric parity — opens labor guide browse (same dialog as guide search). */
  onLaborFromCatalog?: () => void;
};

function resolveScope(
  value: InlineLineType,
  scope?: EstimateLineTypeMenuScope,
): EstimateLineTypeMenuScope {
  if (scope) return scope;
  if (value === "labor") return "labor";
  if (value === "fee" || value === "discount") return "all";
  return "part";
}

function defaultTypeOptions(menuScope: EstimateLineTypeMenuScope): InlineLineType[] {
  if (menuScope === "labor") return LABOR_LINE_TYPES;
  if (menuScope === "part") return [...PART_FAMILY_LINE_TYPES, "fee", "discount"];
  return INLINE_LINE_TYPE_OPTIONS.map((o) => o.value);
}

/** Tekmetric-style TYPE column — scoped line type + guide actions. */
export function EstimateLineTypeMenu({
  value,
  onChange,
  editing,
  typeOptions,
  scope,
  size = "grid",
  showWrenchIcon = false,
  handlers,
}: {
  value: InlineLineType;
  onChange: (value: InlineLineType) => void;
  editing: boolean;
  /** Subset of line types shown under "Line type". */
  typeOptions?: InlineLineType[];
  /** Defaults from `value`: labor → labor, part-family → part, fee/discount → all. */
  scope?: EstimateLineTypeMenuScope;
  size?: "grid" | "table";
  showWrenchIcon?: boolean;
  handlers?: EstimateLineTypeMenuHandlers;
}) {
  const label = INLINE_LINE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  const h = handlers ?? {};
  const menuScope = resolveScope(value, scope);
  const showLaborActions = menuScope === "labor" || menuScope === "all";
  const showPartActions = menuScope === "part" || menuScope === "all";

  const hasGuideMenu = Boolean(
    (showLaborActions &&
      (h.onLaborFromGuide || h.onCustomLabor || h.onLaborFromCatalog)) ||
      (showPartActions && (h.onPartFromGuide || h.onCustomPart)),
  );

  const resolvedTypeOptions: InlineLineType[] = typeOptions ?? defaultTypeOptions(menuScope);
  const isLaborBookTrigger = menuScope === "labor";

  if (!editing) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-navy">{label}</span>
    );
  }

  /** Part / all — bordered select. Labor — ghost Labor Book (matches EstimateJobCard footer). */
  const triggerClass = isLaborBookTrigger
    ? cn(
        "inline-flex items-center gap-1.5 rounded-md border border-transparent bg-transparent px-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy",
        "hover:bg-brand-light/10 hover:text-brand-navy",
        size === "table" ? "h-7" : "h-7 w-full justify-start",
      )
    : size === "table"
      ? "flex h-8 w-full min-w-16 items-center justify-between gap-0.5 rounded-md border border-input bg-background px-1.5 text-xs font-medium text-brand-navy hover:bg-muted/40"
      : cn(
          LAB_INPUT_FLAT,
          "flex w-full items-center justify-between gap-0.5 px-1 text-[10px] font-medium text-brand-navy hover:bg-muted/40",
        );

  const ariaLabel =
    menuScope === "labor"
      ? "Labor type and Labor Book"
      : menuScope === "part"
        ? "Part type"
        : "Line type and Labor Book";

  if (!hasGuideMenu) {
    return (
      <div className={cn("flex items-center gap-1", size === "table" && "w-full")}>
        {!isLaborBookTrigger && showWrenchIcon ? (
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <select
          className={cn(triggerClass, "appearance-auto")}
          value={value}
          onChange={(e) => onChange(e.target.value as InlineLineType)}
          aria-label={ariaLabel}
        >
          {resolvedTypeOptions.map((lineType) => {
            const opt = INLINE_LINE_TYPE_OPTIONS.find((x) => x.value === lineType);
            if (!opt) return null;
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  const openLaborGuide = h.onLaborFromGuide ?? h.onLaborFromCatalog;

  return (
    <div className={cn("flex items-center gap-1", size === "table" && "w-full min-w-0")}>
      {!isLaborBookTrigger && showWrenchIcon ? (
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerClass} aria-label={ariaLabel}>
            {isLaborBookTrigger ? (
              <>
                <BookOpen className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">Labor Book</span>
                <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
              </>
            ) : (
              <>
                <span className="truncate">{label}</span>
                <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
            {menuScope === "labor" ? "Labor type" : menuScope === "part" ? "Part type" : "Line type"}
          </DropdownMenuLabel>
          {resolvedTypeOptions.map((lineType) => {
            const opt = INLINE_LINE_TYPE_OPTIONS.find((x) => x.value === lineType);
            if (!opt) return null;
            return (
              <DropdownMenuItem key={opt.value} className="text-xs" onSelect={() => onChange(opt.value)}>
                {opt.label}
                {opt.value === value ? (
                  <span className="ml-auto text-[10px] text-muted-foreground">Current</span>
                ) : null}
              </DropdownMenuItem>
            );
          })}

          {showLaborActions ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                Labor Book
              </DropdownMenuLabel>
              {openLaborGuide ? (
                <>
                  <DropdownMenuItem className="gap-2 text-xs" onSelect={openLaborGuide}>
                    <BookOpen className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                    Add labor from catalog
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-xs" onSelect={openLaborGuide}>
                    <BookOpen className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                    Add labor from Labor Book
                  </DropdownMenuItem>
                </>
              ) : null}
              {h.onCustomLabor ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomLabor}>
                  <Wrench className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add custom labor
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem disabled className="gap-2 text-xs opacity-60">
                <Package className="size-3.5 shrink-0" aria-hidden />
                Add labor from kit
                <span className="ml-auto text-[9px]">Soon</span>
              </DropdownMenuItem>
            </>
          ) : null}

          {showPartActions ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                Parts
              </DropdownMenuLabel>
              {h.onPartFromGuide ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onPartFromGuide}>
                  <BookOpen className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add part from catalog
                </DropdownMenuItem>
              ) : null}
              {h.onCustomPart ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomPart}>
                  <Wrench className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add custom part
                </DropdownMenuItem>
              ) : null}
              <p className="px-2 py-1 text-[9px] leading-snug text-muted-foreground">
                Part lines use catalog lookup until MOTOR parts bridge ships.
              </p>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
