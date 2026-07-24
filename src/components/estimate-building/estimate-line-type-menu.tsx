"use client";

import { BookOpen, ChevronDown, ListTree, Package, PenLine, Search, Sparkles, Wrench } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LAB_INPUT_FLAT } from "@/components/estimate-building/estimate-lab-job-card-shell";
import { TABISH_FRIDAY_LABOR_TITLE } from "@/lib/tabish-friday-labor";
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

/** Labor Type column — Labor Book lives in the actions section. */
export const LABOR_LINE_TYPES: InlineLineType[] = ["labor"];

/**
 * Full service-items Type list — Labor → Part family.
 * Used on every Type button so the menu stays consistent.
 * Fee/Discount are handled by the dedicated adjustments UI, not line-type swaps.
 */
export const SERVICE_LINE_TYPE_OPTIONS: InlineLineType[] = [
  "labor",
  "part",
  "tire",
  "sublet",
  "hazardous",
  "other",
];

export type EstimateLineTypeMenuScope = "labor" | "part" | "all";

export type EstimateLineTypeMenuHandlers = {
  onLaborFromGuide?: () => void;
  /** Opens parts catalog lookup — labor guide has no part SKUs yet. */
  onPartFromGuide?: () => void;
  onCustomLabor?: () => void;
  onCustomPart?: () => void;
  /** Pick tire from shop stock inventory. */
  onTireFromStock?: () => void;
  /** Blank editable tire line without stock link. */
  onCustomTire?: () => void;
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
  if (menuScope === "part") return PART_FAMILY_LINE_TYPES;
  return SERVICE_LINE_TYPE_OPTIONS;
}

function triggerIcon(value: InlineLineType) {
  if (value === "labor") return <Wrench className="size-3 shrink-0" aria-hidden />;
  if (
    value === "part" ||
    value === "tire" ||
    value === "sublet" ||
    value === "hazardous" ||
    value === "other"
  ) {
    return <Package className="size-3 shrink-0" aria-hidden />;
  }
  return null;
}

/** Tekmetric-style TYPE column — always same menu shape when handlers are provided. */
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
  /** Subset of line types shown under "Line type". Defaults to full service list when handlers exist. */
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

  const openLaborGuide = h.onLaborFromGuide ?? h.onLaborFromCatalog;
  /** Actions are always available when handlers exist — not gated by current type. */
  const showLaborGuide = motorLaborOk && Boolean(openLaborGuide);
  const showLaborCustom = Boolean(h.onCustomLabor);
  const showPartGuide = partsTechOk && Boolean(h.onPartFromGuide);
  const showPartCustom = Boolean(h.onCustomPart);
  const showTireStock = Boolean(h.onTireFromStock);
  const showTireCustom = Boolean(h.onCustomTire);

  const hasGuideMenu = Boolean(
    showLaborGuide || showLaborCustom || showPartGuide || showPartCustom || showTireStock || showTireCustom,
  );

  const resolvedTypeOptions: InlineLineType[] =
    typeOptions ??
    (hasGuideMenu ? SERVICE_LINE_TYPE_OPTIONS : defaultTypeOptions(menuScope));

  /** Labor, Part, Fee, and Discount share the compact navy Type trigger. */
  const useMatchedTypeTrigger = true;

  if (!editing) {
    return (
      <span className="text-[11px] font-semibold text-brand-navy">{label}</span>
    );
  }

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

  const ariaLabel = "Line type, labor, and parts";

  if (!hasGuideMenu) {
    return (
      <div className={cn("flex min-w-0 items-center gap-1", size === "table" && "w-full")}>
        {showWrenchIcon ? (
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

  return (
    <div className={cn("flex min-w-0 items-center gap-1 w-full")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={triggerClass} aria-label={ariaLabel} title={label}>
            {triggerIcon(value)}
            <span className="min-w-0 flex-1 whitespace-nowrap text-left">{label}</span>
            <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
            Labor type
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
              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                Labor
              </DropdownMenuLabel>
              {showLaborGuide && openLaborGuide ? (
                <>
                  <DropdownMenuItem className="gap-2 text-xs" onSelect={openLaborGuide}>
                    <ListTree className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                    Add labor from {TABISH_FRIDAY_LABOR_TITLE}
                  </DropdownMenuItem>
                </>
              ) : null}
              {showLaborCustom ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomLabor}>
                  <Sparkles className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
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
                  <Sparkles className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
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

          {showTireStock || showTireCustom ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground">
                Tires
              </DropdownMenuLabel>
              {showTireStock ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onTireFromStock}>
                  <Search className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  From tire inventory
                </DropdownMenuItem>
              ) : null}
              {showTireCustom ? (
                <DropdownMenuItem className="gap-2 text-xs" onSelect={h.onCustomTire}>
                  <PenLine className="size-3.5 shrink-0 text-brand-navy" aria-hidden />
                  Manual tire
                </DropdownMenuItem>
              ) : null}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
