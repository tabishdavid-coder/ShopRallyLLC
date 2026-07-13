"use client";

import { BookOpen, ChevronDown, ListTree, Package, Wrench } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LAB_INPUT_FLAT } from "@/components/estimate-building/estimate-lab-job-card-shell";
import { useMotorLaborUiEnabled, usePartsTechUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

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
  const motorLaborOk = useMotorLaborUiEnabled();
  const partsTechOk = usePartsTechUiEnabled();
  const laborScope = menuScope === "labor" || menuScope === "all";
  const partScope = menuScope === "part" || menuScope === "all";
  /** Parts actions also appear on labor Type so advisors can add parts without leaving the row. */
  const showPartActionsOnLabor = menuScope === "labor" && Boolean(h.onPartFromGuide || h.onCustomPart);
  const showLaborGuide = laborScope && motorLaborOk;
  const showLaborCustom = laborScope && Boolean(h.onCustomLabor);
  const showPartGuide = (partScope || showPartActionsOnLabor) && partsTechOk && Boolean(h.onPartFromGuide);
  const showPartCustom = (partScope || showPartActionsOnLabor) && Boolean(h.onCustomPart);

  const hasGuideMenu = Boolean(
    (showLaborGuide && (h.onLaborFromGuide || h.onLaborFromCatalog)) ||
      showLaborCustom ||
      showPartGuide ||
      showPartCustom,
  );

  const resolvedTypeOptions: InlineLineType[] = typeOptions ?? defaultTypeOptions(menuScope);
  /** Labor, Part, Fee, and Discount share the compact navy Type trigger. */
  const useMatchedTypeTrigger =
    menuScope === "labor" ||
    menuScope === "part" ||
    value === "fee" ||
    value === "discount" ||
    menuScope === "all";

  if (!editing) {
    return (
      <span className="text-[11px] font-semibold text-brand-navy">{label}</span>
    );
  }

  /** Labor Book / Part type — matched size; normal case so labels stay readable in the Type column. */
  const triggerClass = useMatchedTypeTrigger
    ? cn(
        "inline-flex h-7 w-full min-w-0 items-center gap-1 rounded-md border border-brand-navy/15 bg-brand-navy/[0.03] px-1.5 text-[11px] font-semibold text-brand-navy",
        "hover:border-brand-navy/25 hover:bg-brand-light/10 hover:text-brand-navy",
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
      <div className={cn("flex min-w-0 items-center gap-1", size === "table" && "w-full")}>
        {!useMatchedTypeTrigger && showWrenchIcon ? (
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
    <div className={cn("flex min-w-0 items-center gap-1", (size === "table" || useMatchedTypeTrigger) && "w-full")}>
      {!useMatchedTypeTrigger && showWrenchIcon ? (
        <Wrench className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerClass} aria-label={ariaLabel} title={label}>
            {menuScope === "labor" ? (
              <>
                <Wrench className="size-3 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 whitespace-nowrap text-left">{label}</span>
                <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
              </>
            ) : menuScope === "part" ? (
              <>
                <Package className="size-3 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 whitespace-nowrap text-left">{label}</span>
                <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 whitespace-nowrap text-left">{label}</span>
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

          {showLaborGuide || showLaborCustom ? (
            <>
              <DropdownMenuSeparator />
              {showLaborGuide ? (
                <>
                  <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                    Labor Book
                  </DropdownMenuLabel>
                  {openLaborGuide ? (
                    <>
                      <DropdownMenuItem className="gap-2 text-xs" onSelect={openLaborGuide}>
                        <ListTree className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                        Add labor from catalog
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-xs" onSelect={openLaborGuide}>
                        <ListTree className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                        Add labor from Labor Book
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              ) : null}
              {showLaborCustom ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomLabor}>
                  <Wrench className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add custom labor
                </DropdownMenuItem>
              ) : null}
              {showLaborGuide ? (
                <DropdownMenuItem disabled className="gap-2 text-xs opacity-60">
                  <Package className="size-3.5 shrink-0" aria-hidden />
                  Add labor from kit
                  <span className="ml-auto text-[9px]">Soon</span>
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}

          {showPartGuide || showPartCustom ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                Parts
              </DropdownMenuLabel>
              {showPartGuide ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onPartFromGuide}>
                  <BookOpen className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add part from catalog
                </DropdownMenuItem>
              ) : null}
              {showPartCustom ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomPart}>
                  <Wrench className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Add custom part
                </DropdownMenuItem>
              ) : null}
              {showPartGuide ? (
                <p className="px-2 py-1 text-[9px] leading-snug text-muted-foreground">
                  Part lines use catalog lookup until MOTOR parts bridge ships.
                </p>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
