"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronDown, Droplets, Package, ShieldCheck, Wrench, X } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CANNED_JOB_CATEGORY_SELECT_OPTIONS,
  deriveCategoryUi,
  resolveCategoryFromUi,
  type SaveCannedJobInput,
} from "@/lib/canned-job-schemas";
import { formatCents } from "@/lib/format";
import type { CannedJobDetail } from "@/lib/canned-job-types";
import { cn } from "@/lib/utils";

export type LaborRow = {
  id?: string;
  description: string;
  hours: number;
  flatAmountCents?: number | null;
};
export type PartRow = {
  id?: string;
  brand: string;
  description: string;
  partNumber: string;
  costCents: number;
  quantity: number;
};

export type CannedJobFormState = {
  name: string;
  description: string;
  category: string;
  labor: LaborRow[];
  parts: PartRow[];
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (s: string) => Math.round((parseFloat(s.replace(/[^0-9.]/g, "")) || 0) * 100);
const DECIMAL_INPUT_RE = /^\d*\.?\d*$/;

/** Committed hours display — trim trailing zeros, keep partial decimals readable. */
function formatHours(hours: number): string {
  if (hours === 0) return "";
  return String(parseFloat(hours.toFixed(3)));
}

export const DEFAULT_CANNED_JOB_LABOR_RATE_CENTS = 15000;

/** Decimal hours field — keeps raw string while typing; commits on blur. */
function HoursInput({
  hours,
  onCommit,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "onFocus"> & {
  hours: number;
  onCommit: (hours: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? formatHours(hours);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !DECIMAL_INPUT_RE.test(raw)) return;
        setDraft(raw);
      }}
      onFocus={(e) => {
        setDraft(formatHours(hours));
        e.target.select();
      }}
      onBlur={() => {
        if (draft === null) return;
        const parsed = draft === "" || draft === "." ? 0 : parseFloat(draft) || 0;
        onCommit(Math.max(0, parsed));
        setDraft(null);
      }}
      className={className}
      {...props}
    />
  );
}

/** Dollar field backed by cents — raw string while typing; commits on blur. */
function DollarsInput({
  cents,
  onCommit,
  skipCommitIfUnchanged = false,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "onFocus"> & {
  cents: number;
  onCommit: (cents: number) => void;
  /** When true, blur without edits does not call onCommit (for derived display values). */
  skipCommitIfUnchanged?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? (cents === 0 ? "" : dollars(cents));

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !DECIMAL_INPUT_RE.test(raw)) return;
        setDraft(raw);
      }}
      onFocus={(e) => {
        setDraft(cents === 0 ? "" : dollars(cents));
        e.target.select();
      }}
      onBlur={() => {
        if (draft === null) return;
        const nextCents = draft === "" || draft === "." ? 0 : toCents(draft);
        setDraft(null);
        if (skipCommitIfUnchanged && nextCents === cents) return;
        onCommit(nextCents);
      }}
      className={className}
      {...props}
    />
  );
}

/** Labor $ display: flat override when set, otherwise hours × shop rate. */
function LaborDollarsInput({
  labor,
  laborRateCents,
  onCommitFlat,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "onFocus"> & {
  labor: LaborRow;
  laborRateCents: number;
  onCommitFlat: (flatAmountCents: number | null) => void;
}) {
  const hasFlat = labor.flatAmountCents != null && labor.flatAmountCents > 0;
  const computedCents =
    !hasFlat && labor.hours > 0 ? Math.round(labor.hours * laborRateCents) : 0;
  const cents = hasFlat ? labor.flatAmountCents! : computedCents;

  return (
    <DollarsInput
      cents={cents}
      skipCommitIfUnchanged={!hasFlat}
      onCommit={(nextCents) => {
        if (nextCents <= 0) {
          onCommitFlat(null);
          return;
        }
        onCommitFlat(nextCents);
      }}
      className={className}
      {...props}
    />
  );
}

const fieldClass = cn(
  "h-9 border-border bg-white shadow-none transition-[border-color,box-shadow]",
  "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
);

const compactNumericInput =
  "h-9 min-h-9 w-full min-w-[4rem] text-right text-xs tabular-nums";

function StripLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
      >
        {label}
        {required ? <span className="text-brand-red"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function CategorySelectField({
  category,
  onCategoryChange,
  idPrefix,
  variant = "dense",
}: {
  category: string;
  onCategoryChange: (category: string) => void;
  idPrefix: string;
  variant?: "dense" | "compact" | "chips";
}) {
  const initialUi = deriveCategoryUi(category);
  const [selectPreset, setSelectPreset] = useState(initialUi.select);
  const [customText, setCustomText] = useState(initialUi.custom);
  const skipParentSyncRef = useRef(false);
  const isOther = selectPreset === "Other";
  const selectId = `${idPrefix}-category`;
  const customInputRef = useRef<HTMLInputElement>(null);
  const prevSelectRef = useRef<string | null>(null);

  useEffect(() => {
    if (skipParentSyncRef.current) {
      skipParentSyncRef.current = false;
      return;
    }
    const nextUi = deriveCategoryUi(category);
    setSelectPreset(nextUi.select);
    setCustomText(nextUi.custom);
  }, [category]);

  useEffect(() => {
    if (isOther && prevSelectRef.current !== null && prevSelectRef.current !== "Other") {
      customInputRef.current?.focus();
    }
    prevSelectRef.current = selectPreset;
  }, [isOther, selectPreset]);

  const emitCategoryChange = (nextCategory: string) => {
    skipParentSyncRef.current = true;
    onCategoryChange(nextCategory);
  };

  const handleSelectChange = (nextSelect: string) => {
    setSelectPreset(nextSelect);
    if (!nextSelect) {
      setCustomText("");
      emitCategoryChange("");
      return;
    }
    if (nextSelect === "Other") {
      emitCategoryChange(resolveCategoryFromUi("Other", customText));
      return;
    }
    setCustomText("");
    emitCategoryChange(nextSelect);
  };

  const handleCustomChange = (nextCustom: string) => {
    setSelectPreset("Other");
    setCustomText(nextCustom);
    emitCategoryChange(resolveCategoryFromUi("Other", nextCustom));
  };

  const selectClass = cn(
    fieldClass,
    "w-full rounded-md border px-2 text-sm",
    variant === "compact" && "h-8",
  );

  const customInput = (
    <Input
      ref={customInputRef}
      id={`${idPrefix}-category-custom`}
      value={customText}
      onChange={(e) => handleCustomChange(e.target.value)}
      placeholder="Custom category"
      className={cn(fieldClass, variant === "compact" && "h-8 text-sm")}
      aria-label="Custom category name"
    />
  );

  if (variant === "chips") {
    const chipClass = (active: boolean) =>
      cn(
        "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "bg-brand-navy text-white"
          : "border border-border bg-white text-muted-foreground hover:border-brand-light hover:bg-brand-light/20 hover:text-brand-navy",
      );

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectChange("")}
            className={chipClass(!selectPreset)}
          >
            None
          </button>
          {CANNED_JOB_CATEGORY_SELECT_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleSelectChange(c)}
              className={chipClass(c === "Other" ? isOther : selectPreset === c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            isOther ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!isOther}
        >
          <div className="overflow-hidden pt-0.5">{customInput}</div>
        </div>
      </div>
    );
  }

  const selectEl = (
    <select
      id={selectId}
      value={selectPreset}
      onChange={(e) => handleSelectChange(e.target.value)}
      className={selectClass}
      aria-label="Category"
    >
      <option value="">None</option>
      {CANNED_JOB_CATEGORY_SELECT_OPTIONS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );

  if (variant === "dense" || variant === "compact") {
    return (
      <div className="space-y-2">
        <div className={cn("min-w-0", variant === "dense" && !isOther && "w-full max-w-[12rem]")}>
          {selectEl}
        </div>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            isOther ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!isOther}
        >
          <div className="min-w-0 overflow-hidden">
            {variant === "dense" ? (
              <div className="space-y-1 pt-0.5">
                <label
                  htmlFor={`${idPrefix}-category-custom`}
                  className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                >
                  Custom category
                </label>
                {customInput}
              </div>
            ) : (
              customInput
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      {selectEl}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          isOther ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!isOther}
      >
        <div className="min-w-0 overflow-hidden pt-0.5">{customInput}</div>
      </div>
    </div>
  );
}

function laborLineAmountCents(l: LaborRow, laborRateCents: number): number {
  if (l.flatAmountCents != null && l.flatAmountCents > 0) return l.flatAmountCents;
  return Math.round(l.hours * laborRateCents);
}

function qtyDisplay(qty: number) {
  return String(qty);
}

type QuickTemplate = {
  label: string;
  icon: typeof Wrench;
  form: Omit<CannedJobFormState, "name"> & { name: string };
};

export const CANNED_JOB_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: "Oil change",
    icon: Droplets,
    form: {
      name: "Synthetic oil & filter change",
      category: "Maintenance",
      description: "Drain and refill engine oil, replace oil filter, reset maintenance reminder.",
      labor: [{ description: "Oil & filter change", hours: 0.5 }],
      parts: [
        { brand: "", description: "Engine oil (5 qt)", partNumber: "", costCents: 3500, quantity: 1 },
        { brand: "", description: "Oil filter", partNumber: "", costCents: 800, quantity: 1 },
      ],
    },
  },
  {
    label: "Brake job",
    icon: Wrench,
    form: {
      name: "Front brake pad replacement",
      category: "Brakes",
      description: "Replace front brake pads, inspect rotors, road test.",
      labor: [
        { description: "Remove and replace front brake pads", hours: 1.0 },
        { description: "Brake system inspection & road test", hours: 0.3 },
      ],
      parts: [
        { brand: "", description: "Front brake pads (set)", partNumber: "", costCents: 6500, quantity: 1 },
        { brand: "", description: "Brake cleaner", partNumber: "", costCents: 400, quantity: 1 },
      ],
    },
  },
  {
    label: "Inspection",
    icon: ShieldCheck,
    form: {
      name: "Multi-point vehicle inspection",
      category: "Inspection",
      description: "Comprehensive safety and maintenance inspection with written report.",
      labor: [{ description: "Multi-point inspection", hours: 0.75 }],
      parts: [],
    },
  },
];

export function emptyCannedJobForm(): CannedJobFormState {
  return {
    name: "",
    description: "",
    category: "",
    labor: [],
    parts: [],
  };
}

export function cannedJobFormFromDetail(job: CannedJobDetail): CannedJobFormState {
  return {
    name: job.name,
    description: job.description ?? "",
    category: job.category ?? "",
    labor: job.laborLines.map((l) => ({
      id: l.id,
      description: l.description,
      hours: l.hours,
      flatAmountCents: l.flatAmountCents,
    })),
    parts: job.partLines.map((p) => ({
      id: p.id,
      brand: p.brand ?? "",
      description: p.description,
      partNumber: p.partNumber ?? "",
      costCents: p.costCents,
      quantity: p.quantity,
    })),
  };
}

export function cannedJobFormToPayload(
  form: CannedJobFormState,
  jobId?: string,
): SaveCannedJobInput {
  const category = form.category.trim() || null;
  return {
    id: jobId,
    name: form.name,
    description: form.description || null,
    category,
    isActive: true,
    laborLines: form.labor
      .filter((l) => l.description.trim())
      .map((l) => ({
        id: l.id,
        description: l.description.trim(),
        hours: l.hours,
        flatAmountCents: l.flatAmountCents ?? null,
      })),
    partLines: form.parts
      .filter((p) => p.description.trim())
      .map((p) => ({
        id: p.id,
        brand: p.brand.trim() || null,
        description: p.description.trim(),
        partNumber: p.partNumber.trim() || null,
        costCents: p.costCents,
        quantity: p.quantity,
      })),
  };
}

export function useCannedJobFormSummary(
  form: CannedJobFormState,
  laborRateCents = DEFAULT_CANNED_JOB_LABOR_RATE_CENTS,
) {
  return useMemo(() => {
    const laborLines = form.labor.filter((l) => l.description.trim());
    const partLines = form.parts.filter((p) => p.description.trim());
    const laborHours = laborLines.reduce((s, l) => s + l.hours, 0);
    const laborCostCents = laborLines.reduce(
      (s, l) => s + laborLineAmountCents(l, laborRateCents),
      0,
    );
    const partsCostCents = partLines.reduce((s, p) => s + p.costCents * p.quantity, 0);
    return {
      laborLineCount: laborLines.length,
      partLineCount: partLines.length,
      laborHours,
      laborCostCents,
      partsCostCents,
    };
  }, [form, laborRateCents]);
}

export function CannedJobFormSummary({
  form,
  className,
  laborRateCents = DEFAULT_CANNED_JOB_LABOR_RATE_CENTS,
  compact = false,
}: {
  form: CannedJobFormState;
  className?: string;
  laborRateCents?: number;
  /** Denser layout for split-panel picker preview. */
  compact?: boolean;
}) {
  const summary = useCannedJobFormSummary(form, laborRateCents);
  const laborLines = form.labor.filter((l) => l.description.trim());
  const partLines = form.parts.filter((p) => p.description.trim());

  if (compact) {
    return (
      <aside className={cn("text-sm", className)}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="font-semibold text-foreground">{form.name.trim() || "Untitled job"}</p>
          {form.category ? (
            <span className="rounded-full bg-brand-navy/10 px-1.5 py-px text-[10px] font-medium text-brand-navy">
              {form.category}
            </span>
          ) : null}
        </div>
        {form.description.trim() ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{form.description}</p>
        ) : null}

        {(laborLines.length > 0 || partLines.length > 0) && (
          <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full text-xs">
              <tbody>
                {laborLines.map((l, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1 text-muted-foreground">
                      <Wrench className="mr-1 inline size-3" aria-hidden />
                      Labor
                    </td>
                    <td className="px-2 py-1" title={l.description}>
                      <span className="line-clamp-2 break-words">{l.description}</span>
                    </td>
                    <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {formatHours(l.hours) || "0"}h
                    </td>
                  </tr>
                ))}
                {partLines.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1 text-muted-foreground">
                      <Package className="mr-1 inline size-3" aria-hidden />
                      Part
                    </td>
                    <td className="px-2 py-1" title={p.description}>
                      <span className="line-clamp-2 break-words">{p.description}</span>
                    </td>
                    <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
                      ×{p.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          Labor {formatCents(summary.laborCostCents)} · Parts {formatCents(summary.partsCostCents)} ·{" "}
          <span className="font-semibold text-brand-navy">
            Total {formatCents(summary.laborCostCents + summary.partsCostCents)}
          </span>
        </p>
      </aside>
    );
  }

  return (
    <aside className={cn("rounded-lg border border-border bg-white p-4 text-sm", className)}>
      <StripLabel>Live preview</StripLabel>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="font-semibold text-foreground">{form.name.trim() || "Untitled job"}</p>
        {form.category ? (
          <span className="rounded bg-brand-navy/10 px-1.5 py-px text-[10px] font-medium text-brand-navy">
            {form.category}
          </span>
        ) : null}
      </div>
      {form.description.trim() ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{form.description}</p>
      ) : null}

      {(laborLines.length > 0 || partLines.length > 0) && (
        <div className="mt-2 overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs">
            <tbody>
              {laborLines.map((l, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-1 text-muted-foreground">
                    <Wrench className="mr-1 inline size-3" aria-hidden />
                    Labor
                  </td>
                  <td className="px-2 py-1" title={l.description}>
                    <span className="line-clamp-2 break-words">{l.description}</span>
                  </td>
                  <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
                    {formatHours(l.hours) || "0"}h
                  </td>
                </tr>
              ))}
              {partLines.map((p, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-1 text-muted-foreground">
                    <Package className="mr-1 inline size-3" aria-hidden />
                    Part
                  </td>
                  <td className="px-2 py-1" title={p.description}>
                    <span className="line-clamp-2 break-words">{p.description}</span>
                  </td>
                  <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
                    ×{p.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs tabular-nums text-muted-foreground">
        Labor {formatCents(summary.laborCostCents)} · Parts {formatCents(summary.partsCostCents)} ·{" "}
        <span className="font-semibold text-brand-navy">
          Total {formatCents(summary.laborCostCents + summary.partsCostCents)}
        </span>
      </p>
    </aside>
  );
}

function AddLineButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 border-dashed border-brand-navy/30 text-brand-navy hover:bg-brand-navy/5"
      onClick={onClick}
    >
      <span className="text-base leading-none">+</span>
      {label}
    </Button>
  );
}

function QuickTemplateChips({
  onApply,
  disabled,
}: {
  onApply: (template: QuickTemplate) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <StripLabel>Quick start</StripLabel>
      <div className="flex flex-wrap gap-1.5">
        {CANNED_JOB_QUICK_TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              disabled={disabled}
              onClick={() => onApply(t)}
              title={t.form.name}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-[background-color,border-color,color] hover:border-brand-navy/35 hover:bg-brand-light/15 hover:text-brand-navy disabled:opacity-50"
            >
              <Icon className="size-3 shrink-0 text-brand-navy/80" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CannedJobReviewPanel({
  form,
  laborRateCents = DEFAULT_CANNED_JOB_LABOR_RATE_CENTS,
  className,
}: {
  form: CannedJobFormState;
  laborRateCents?: number;
  className?: string;
}) {
  const summary = useCannedJobFormSummary(form, laborRateCents);
  const laborLines = form.labor.filter((l) => l.description.trim());
  const partLines = form.parts.filter((p) => p.description.trim());
  const totalCents = summary.laborCostCents + summary.partsCostCents;

  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      <div className="space-y-3 rounded-lg border border-border p-4">
        <StripLabel>Job details</StripLabel>
        <div>
          <p className="text-base font-semibold text-foreground">
            {form.name.trim() || "Untitled job"}
          </p>
          {form.category ? (
            <span className="mt-1.5 inline-flex rounded bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
              {form.category}
            </span>
          ) : (
            <span className="mt-1.5 inline-flex text-[11px] text-muted-foreground">
              No category
            </span>
          )}
        </div>
        {form.description.trim() ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{form.description}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground/70">No description</p>
        )}
        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          When added to an estimate, labor rate and part retail are calculated from shop settings
          and markup matrices.
        </p>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <StripLabel className="mb-0">Labor</StripLabel>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {summary.laborLineCount} line{summary.laborLineCount === 1 ? "" : "s"} ·{" "}
              {summary.laborHours.toFixed(1)}h · {formatCents(summary.laborCostCents)}
            </span>
          </div>
          {laborLines.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No labor lines</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {laborLines.map((l, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatHours(l.hours) || "0"}h
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatCents(laborLineAmountCents(l, laborRateCents))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <StripLabel className="mb-0">Parts</StripLabel>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {summary.partLineCount} line{summary.partLineCount === 1 ? "" : "s"} ·{" "}
              {formatCents(summary.partsCostCents)} at cost
            </span>
          </div>
          {partLines.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No parts — labor-only is fine
            </p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {partLines.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="block">{p.description}</span>
                      {p.partNumber ? (
                        <span className="text-[10px] text-muted-foreground">#{p.partNumber}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      ×{p.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatCents(p.costCents * p.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-brand-navy/15 bg-brand-navy/5 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-navy">
            Template total (cost basis)
          </span>
          <span className="text-sm font-bold tabular-nums text-brand-navy">
            {formatCents(totalCents)}
          </span>
        </div>
      </div>
    </div>
  );
}

export type CannedJobIntakeStep = "basics" | "labor" | "parts" | "review";

export function CannedJobIntakeForm({
  form,
  setForm,
  categories,
  idPrefix = "cj",
  showQuickTemplates = true,
  laborRateCents = DEFAULT_CANNED_JOB_LABOR_RATE_CENTS,
  step = "all",
  hideInlineSummary = false,
  compact = false,
  dense = false,
}: {
  form: CannedJobFormState;
  setForm: React.Dispatch<React.SetStateAction<CannedJobFormState>>;
  categories: string[];
  idPrefix?: string;
  showQuickTemplates?: boolean;
  laborRateCents?: number;
  step?: CannedJobIntakeStep | "all";
  /** When true, stack sections only (no sticky side preview — caller provides preview). */
  hideInlineSummary?: boolean;
  /** Denser layout for split-panel picker — smaller inputs, collapsed parts by default. */
  compact?: boolean;
  /** Wizard dialog density — horizontal rows, compact chips, table sections. */
  dense?: boolean;
}) {
  const [partsOpen, setPartsOpen] = useState(false);
  const categoryUi = deriveCategoryUi(form.category);
  const isOtherCategory = categoryUi.select === "Other";

  const setCategory = (category: string) => setForm((f) => ({ ...f, category }));

  const addLabor = () =>
    setForm((f) => ({
      ...f,
      labor: [...f.labor, { description: "", hours: 0, flatAmountCents: null }],
    }));

  const addPart = () =>
    setForm((f) => ({
      ...f,
      parts: [...f.parts, { brand: "", description: "", partNumber: "", costCents: 0, quantity: 1 }],
    }));

  const handlePartEnter = (index: number, e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (index === form.parts.length - 1) addPart();
  };

  const applyTemplate = (template: QuickTemplate) => {
    setForm({ ...template.form, labor: [...template.form.labor], parts: [...template.form.parts] });
  };

  const showBasics = step === "basics" || step === "all";
  const showLabor = step === "labor" || step === "all";
  const showParts = step === "parts" || step === "all";
  const showReview = step === "review";
  const isStepped = step !== "all";

  if (showReview) {
    return (
      <CannedJobReviewPanel form={form} laborRateCents={laborRateCents} className="min-w-0" />
    );
  }

  const useDenseLayout = dense || compact;

  const basicsSection = dense ? (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <div className="min-w-0 space-y-3">
        {showQuickTemplates && showBasics ? (
          <QuickTemplateChips onApply={applyTemplate} />
        ) : null}

        <StripLabel>Job details</StripLabel>

        <div className="space-y-3">
          <Field label="Job name" required htmlFor={`${idPrefix}-name`}>
            <Input
              id={`${idPrefix}-name`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Synthetic oil & filter change"
              className={fieldClass}
            />
          </Field>
          <Field label="Category" htmlFor={`${idPrefix}-category`}>
            <CategorySelectField
              category={form.category}
              onCategoryChange={setCategory}
              idPrefix={idPrefix}
              variant="dense"
            />
          </Field>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <Field label="Description (optional)" htmlFor={`${idPrefix}-desc`}>
          <Textarea
            id={`${idPrefix}-desc`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Notes visible when applied to an estimate"
            rows={4}
            className={cn(fieldClass, "min-h-[7.5rem] resize-y py-2 lg:min-h-[9rem]")}
          />
        </Field>

        <div className="rounded-lg border border-border bg-slate-50/80 p-3">
          <StripLabel className="mb-1.5">Live preview</StripLabel>
          <CannedJobFormSummary
            form={form}
            compact
            laborRateCents={laborRateCents}
            className="text-sm"
          />
        </div>
      </div>
    </section>
  ) : compact ? (
    <section className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div
        className={cn(
          "grid gap-2 sm:items-end",
          isOtherCategory ? "sm:grid-cols-1" : "sm:grid-cols-[1fr_auto]",
        )}
      >
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs">
            Job name <span className="text-brand-red">*</span>
          </Label>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Synthetic oil & filter change"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1 sm:min-w-0">
          <Label className="text-xs" htmlFor={`${idPrefix}-category`}>
            Category
          </Label>
          <CategorySelectField
            category={form.category}
            onCategoryChange={setCategory}
            idPrefix={idPrefix}
            variant="compact"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-desc`} className="text-xs">
          Description (optional)
        </Label>
        <Textarea
          id={`${idPrefix}-desc`}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Notes visible when applied to an estimate"
          rows={1}
          className="min-h-8 resize-none text-sm"
        />
      </div>
    </section>
  ) : (
    <section className="space-y-3">
      {showQuickTemplates && showBasics ? (
        <QuickTemplateChips onApply={applyTemplate} />
      ) : null}

      <StripLabel>Job details</StripLabel>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field label="Job name" required htmlFor={`${idPrefix}-name`}>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Synthetic oil & filter change"
            className={fieldClass}
          />
        </Field>
        <Field label="Category" htmlFor={`${idPrefix}-category`}>
          <CategorySelectField
            category={form.category}
            onCategoryChange={setCategory}
            idPrefix={idPrefix}
            variant="chips"
          />
        </Field>
      </div>

      <Field label="Description (optional)" htmlFor={`${idPrefix}-desc`}>
        <Textarea
          id={`${idPrefix}-desc`}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Notes visible when applied to an estimate"
          rows={2}
          className={cn(fieldClass, "min-h-[4.5rem] resize-y py-2")}
        />
      </Field>
    </section>
  );

  const laborSection = (
    <section className={cn(useDenseLayout ? "space-y-2" : "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <StripLabel className="mb-0">Labor</StripLabel>
        <AddLineButton label="Add labor" onClick={addLabor} />
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col />
            <col className="w-[4.5rem]" />
            <col className="w-[5rem]" />
            <col className="w-9" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium">Description</th>
              <th className="px-2 py-1.5 text-right font-medium">Hrs</th>
              <th className="px-2 py-1.5 text-right font-medium">$</th>
              <th className="px-1 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {form.labor.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                  No labor lines — click Add labor.
                </td>
              </tr>
            ) : (
              form.labor.map((l, i) => (
                <tr key={l.id ?? `labor-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="px-1.5 py-1">
                    <Input
                      value={l.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          labor: f.labor.map((r, j) =>
                            j === i ? { ...r, description: e.target.value } : r,
                          ),
                        }))
                      }
                      placeholder="Labor description"
                      className="h-9 min-h-9 text-xs"
                      aria-label="Labor description"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <HoursInput
                      hours={l.hours}
                      onCommit={(hours) =>
                        setForm((f) => ({
                          ...f,
                          labor: f.labor.map((r, j) =>
                            j === i ? { ...r, hours, flatAmountCents: null } : r,
                          ),
                        }))
                      }
                      placeholder="1.5"
                      className={compactNumericInput}
                      aria-label="Hours"
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <LaborDollarsInput
                      labor={l}
                      laborRateCents={laborRateCents}
                      onCommitFlat={(flatAmountCents) =>
                        setForm((f) => ({
                          ...f,
                          labor: f.labor.map((r, j) =>
                            j === i ? { ...r, flatAmountCents } : r,
                          ),
                        }))
                      }
                      placeholder="0.00"
                      className={compactNumericInput}
                      aria-label="Labor dollars"
                    />
                  </td>
                  <td className="px-1 py-1 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setForm((f) => ({ ...f, labor: f.labor.filter((_, j) => j !== i) }))
                      }
                      aria-label="Remove labor line"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!compact ? (
        <p className="text-[11px] text-muted-foreground">
          Enter hours or flat labor $ — flat overrides rate-based pricing at $
          {(laborRateCents / 100).toFixed(0)}/hr on the estimate.
        </p>
      ) : null}
    </section>
  );

  const partsTableBody = (
    <div className="rounded-md border border-border">
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col />
          <col className="w-[3.5rem]" />
          <col className="w-[5rem]" />
          <col className="w-[5.5rem]" />
          <col className="w-9" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1.5 text-left font-medium">Description</th>
            <th className="px-2 py-1.5 text-right font-medium">Qty</th>
            <th className="px-2 py-1.5 text-right font-medium">Cost</th>
            <th className="px-2 py-1.5 text-left font-medium">Part #</th>
            <th className="px-1 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {form.parts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                No parts — labor-only jobs are fine.
              </td>
            </tr>
          ) : (
            form.parts.map((p, i) => (
              <tr key={p.id ?? `part-${i}`} className="border-b border-border/60 last:border-0">
                <td className="px-1.5 py-1">
                  <Input
                    value={p.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        parts: f.parts.map((r, j) =>
                          j === i ? { ...r, description: e.target.value } : r,
                        ),
                      }))
                    }
                    placeholder="Part description"
                    className="h-9 min-h-9 text-xs"
                    aria-label="Part description"
                  />
                  {!compact ? (
                    <Input
                      value={p.brand}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          parts: f.parts.map((r, j) =>
                            j === i ? { ...r, brand: e.target.value } : r,
                          ),
                        }))
                      }
                      placeholder="Brand (optional)"
                      className="mt-1 h-8 text-xs"
                      aria-label="Brand optional"
                    />
                  ) : null}
                </td>
                <td className="px-1.5 py-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={qtyDisplay(p.quantity)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw !== "" && !/^\d+$/.test(raw)) return;
                      setForm((f) => ({
                        ...f,
                        parts: f.parts.map((r, j) =>
                          j === i ? { ...r, quantity: raw === "" ? 1 : parseInt(raw, 10) || 1 } : r,
                        ),
                      }));
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handlePartEnter(i, e)}
                    className={compactNumericInput}
                    aria-label="Quantity"
                  />
                </td>
                <td className="px-1.5 py-1">
                  <DollarsInput
                    cents={p.costCents}
                    onCommit={(costCents) =>
                      setForm((f) => ({
                        ...f,
                        parts: f.parts.map((r, j) => (j === i ? { ...r, costCents } : r)),
                      }))
                    }
                    onKeyDown={(e) => handlePartEnter(i, e)}
                    placeholder="0.00"
                    className={compactNumericInput}
                    aria-label="Cost"
                  />
                </td>
                <td className="px-1.5 py-1">
                  <Input
                    value={p.partNumber}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        parts: f.parts.map((r, j) =>
                          j === i ? { ...r, partNumber: e.target.value } : r,
                        ),
                      }))
                    }
                    onKeyDown={(e) => handlePartEnter(i, e)}
                    placeholder="Part #"
                    className="h-9 min-h-9 text-xs"
                    aria-label="Part number"
                  />
                </td>
                <td className="px-1 py-1 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setForm((f) => ({ ...f, parts: f.parts.filter((_, j) => j !== i) }))
                    }
                    aria-label="Remove part line"
                  >
                    <X className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const partsSection = compact ? (
    <Collapsible open={partsOpen} onOpenChange={setPartsOpen}>
      <section className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                partsOpen && "rotate-180",
              )}
            />
            <p className="text-xs font-semibold text-foreground">
              Parts
              {form.parts.length > 0 ? (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({form.parts.length})
                </span>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-dashed border-brand-navy/30 px-2 text-xs text-brand-navy hover:bg-brand-navy/5"
            onClick={(e) => {
              e.stopPropagation();
              addPart();
              setPartsOpen(true);
            }}
          >
            <span className="text-sm leading-none">+</span>
            Add part
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-3 pb-3 pt-2">
          {partsTableBody}
        </CollapsibleContent>
      </section>
    </Collapsible>
  ) : (
    <section className={cn(useDenseLayout ? "space-y-2" : "space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <StripLabel className="mb-0">Parts</StripLabel>
        <AddLineButton label="Add part" onClick={addPart} />
      </div>
      {partsTableBody}
    </section>
  );

  if (isStepped || hideInlineSummary) {
    return (
      <div
        className={cn(
          "min-w-0",
          dense ? "space-y-3" : compact ? "space-y-2" : "space-y-4",
        )}
      >
        {showBasics ? basicsSection : null}
        {showLabor ? laborSection : null}
        {showParts ? partsSection : null}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="min-w-0 space-y-6">
        {basicsSection}
        <CannedJobFormSummary form={form} className="lg:hidden" laborRateCents={laborRateCents} />
        {laborSection}
        {partsSection}
      </div>

      <CannedJobFormSummary
        form={form}
        className="sticky top-0 hidden lg:flex lg:min-h-[420px]"
        laborRateCents={laborRateCents}
      />
    </div>
  );
}

/** @deprecated Use CannedJobIntakeForm — kept for any legacy imports */
export function CannedJobFormFields({
  form,
  setForm,
  categories,
  idPrefix = "cj",
  laborRateCents,
}: {
  form: CannedJobFormState;
  setForm: React.Dispatch<React.SetStateAction<CannedJobFormState>>;
  categories: string[];
  idPrefix?: string;
  laborRateCents?: number;
  section?: "basics" | "labor" | "parts" | "all";
}) {
  return (
    <CannedJobIntakeForm
      form={form}
      setForm={setForm}
      categories={categories}
      idPrefix={idPrefix}
      laborRateCents={laborRateCents}
    />
  );
}
