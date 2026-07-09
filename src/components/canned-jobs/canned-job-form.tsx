"use client";

import { useMemo, useState, type ComponentProps } from "react";
import { ChevronDown, ClipboardList, Droplets, Package, ShieldCheck, Wrench, X } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CANNED_JOB_CATEGORIES, type SaveCannedJobInput } from "@/lib/canned-job-schemas";
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

const compactNumericInput =
  "h-9 min-h-9 w-full min-w-[4rem] text-right text-xs tabular-nums";
const fullNumericInput = "h-9 min-h-9 w-full min-w-[4.5rem] text-right tabular-nums";

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
  return {
    id: jobId,
    name: form.name,
    description: form.description || null,
    category: form.category || null,
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

function SectionHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: typeof Wrench;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10">
        <Icon className="size-4 text-brand-navy" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
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
    <aside
      className={cn(
        "flex flex-col rounded-xl border-2 border-brand-navy/15 bg-gradient-to-b from-slate-50 to-white text-sm",
        className,
      )}
    >
      <div className="border-b border-brand-navy/10 bg-brand-navy/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">Live preview</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <p className="text-lg font-semibold leading-tight text-slate-900">
            {form.name.trim() || "Untitled job"}
          </p>
          {form.category ? (
            <span className="mt-2 inline-flex rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-medium text-brand-navy">
              {form.category}
            </span>
          ) : (
            <span className="mt-2 inline-flex rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs text-slate-400">
              No category
            </span>
          )}
          {form.description.trim() ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{form.description}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-900">
                <Wrench className="size-3.5" />
                <span className="text-xs font-semibold">Labor</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold tabular-nums text-amber-950">
                  {formatCents(summary.laborCostCents)}
                </span>
                <span className="ml-1.5 text-xs tabular-nums text-amber-800/90">
                  ({summary.laborHours.toFixed(1)}h)
                </span>
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-800/80">
              {summary.laborLineCount} line{summary.laborLineCount === 1 ? "" : "s"}
            </p>
            {laborLines.length > 0 ? (
              <ul className="mt-2 space-y-0.5 border-t border-amber-200/60 pt-2 text-[11px] text-amber-950/90">
                {laborLines.slice(0, 4).map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="min-w-0 break-words" title={l.description}>
                      {l.description}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatCents(laborLineAmountCents(l, laborRateCents))}
                      <span className="text-amber-800/70"> · {formatHours(l.hours) || "0"}h</span>
                    </span>
                  </li>
                ))}
                {laborLines.length > 4 ? (
                  <li className="text-amber-800/70">+{laborLines.length - 4} more</li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-emerald-900">
                <Package className="size-3.5" />
                <span className="text-xs font-semibold">Parts</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-emerald-950">
                {formatCents(summary.partsCostCents)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-800/80">
              {summary.partLineCount} line{summary.partLineCount === 1 ? "" : "s"} at cost
            </p>
            {partLines.length > 0 ? (
              <ul className="mt-2 space-y-0.5 border-t border-emerald-200/60 pt-2 text-[11px] text-emerald-950/90">
                {partLines.slice(0, 4).map((p, i) => (
                  <li key={i} className="break-words" title={p.description}>
                    {p.description}
                    {p.quantity > 1 ? ` ×${p.quantity}` : ""}
                  </li>
                ))}
                {partLines.length > 4 ? (
                  <li className="text-emerald-800/70">+{partLines.length - 4} more</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>

        <p className="mt-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
          When added to an estimate, labor rate and part retail are calculated from your shop
          settings and markup matrices.
        </p>
      </div>
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

function QuickTemplateCards({
  onApply,
  disabled,
}: {
  onApply: (template: QuickTemplate) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
        Quick start
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {CANNED_JOB_QUICK_TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              type="button"
              disabled={disabled}
              onClick={() => onApply(t)}
              className="group rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition-all hover:border-brand-navy hover:shadow-md disabled:opacity-50"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy transition-colors group-hover:bg-brand-navy group-hover:text-white">
                <Icon className="size-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{t.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {t.form.name}
              </p>
            </button>
          );
        })}
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
}) {
  const [partsOpen, setPartsOpen] = useState(false);
  const categoryOptions = [
    ...new Set([...categories, ...CANNED_JOB_CATEGORIES, form.category].filter(Boolean)),
  ].sort();

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
    return <CannedJobFormSummary form={form} laborRateCents={laborRateCents} className="shadow-sm" />;
  }

  const basicsSection = compact ? (
    <section className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
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
        <div className="space-y-1 sm:min-w-[140px]">
          <Label className="text-xs">Category</Label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Category"
          >
            <option value="">None</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
    <section className="rounded-xl border-2 border-brand-navy/15 bg-white p-5 shadow-sm">
      <SectionHeader
        icon={ClipboardList}
        title="Job details"
        description="Name and category shown in your canned jobs library."
        className="mb-4"
      />

      {showQuickTemplates && showBasics ? (
        <div className="mb-5 border-b border-slate-100 pb-5">
          <QuickTemplateCards onApply={applyTemplate} />
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`} className="text-slate-900">
            Job name <span className="text-brand-red">*</span>
          </Label>
          <Input
            id={`${idPrefix}-name`}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Synthetic oil & filter change"
            className="h-11 border-2 border-slate-300 bg-white text-base"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-900">Category</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, category: "" }))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                !form.category
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-slate-300 bg-slate-50 text-slate-700 hover:border-brand-navy/40",
              )}
            >
              None
            </button>
            {categoryOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c }))}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  form.category === c
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-slate-300 bg-slate-50 text-slate-700 hover:border-brand-navy/40",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-desc`} className="text-slate-900">
            Description (optional)
          </Label>
          <Textarea
            id={`${idPrefix}-desc`}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Notes visible when applied to an estimate"
            rows={3}
            className="min-h-[88px] resize-y border-2 border-slate-300 bg-white"
          />
        </div>
      </div>
    </section>
  );

  const laborSection = compact ? (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Labor</p>
        <AddLineButton label="Add labor" onClick={addLabor} />
      </div>
      <div className="rounded-md border border-border">
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
    </section>
  ) : (
    <section className="rounded-xl border-2 border-amber-200/80 bg-amber-50/20 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              icon={Wrench}
              title="Labor"
              description="Operations and billable hours for this template."
            />
            <AddLineButton label="Add labor" onClick={addLabor} />
          </div>

          <div className="rounded-lg border-2 border-amber-200 bg-white">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-[5.5rem]" />
                <col className="w-[6.5rem]" />
                <col className="w-12" />
              </colgroup>
              <thead>
                <tr className="border-b border-amber-100 bg-amber-100/60 text-[11px] font-semibold uppercase tracking-wide text-amber-900/80">
                  <th className="px-4 py-2.5 text-left font-medium">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-4 py-2.5 text-right font-medium">Labor ($)</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {form.labor.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-amber-900/60">
                      No labor lines yet — click &ldquo;Add labor&rdquo; to start.
                    </td>
                  </tr>
                ) : (
                  form.labor.map((l, i) => (
                    <tr key={l.id ?? `labor-${i}`} className="border-b border-border/70 last:border-0">
                      <td className="px-3 py-2">
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
                          className="h-9 min-h-9"
                          aria-label="Labor description"
                        />
                      </td>
                      <td className="px-3 py-2">
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
                          className={fullNumericInput}
                          aria-label="Hours"
                        />
                      </td>
                      <td className="px-3 py-2">
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
                          className={fullNumericInput}
                          aria-label="Labor dollars"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setForm((f) => ({ ...f, labor: f.labor.filter((_, j) => j !== i) }))
                          }
                          aria-label="Remove labor line"
                          tabIndex={0}
                        >
                          <X className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-amber-900/70">
            Enter hours or a flat labor amount — each field is independent. Flat $ overrides
            rate-based pricing at ${(laborRateCents / 100).toFixed(0)}/hr when applied to an estimate.
          </p>
        </section>
  );

  const partsTableBody = compact ? (
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
  ) : (
    <div className="rounded-lg border-2 border-emerald-200 bg-white">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col />
          <col className="w-[5rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[7rem]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-emerald-100 bg-emerald-100/60 text-[11px] font-semibold uppercase tracking-wide text-emerald-900/80">
            <th className="px-4 py-2.5 text-left font-medium">Description</th>
            <th className="px-3 py-2.5 text-right font-medium">Qty</th>
            <th className="px-3 py-2.5 text-right font-medium">Cost ($)</th>
            <th className="px-3 py-2.5 text-left font-medium">Part #</th>
            <th className="px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {form.parts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-emerald-900/60">
                No parts — labor-only jobs are fine.
              </td>
            </tr>
          ) : (
            form.parts.map((p, i) => (
              <tr key={p.id ?? `part-${i}`} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-2">
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
                    className="h-9 min-h-9"
                    aria-label="Part description"
                  />
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
                    className="mt-1.5 h-8 text-xs"
                    tabIndex={-1}
                    aria-label="Brand optional"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
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
                    className={fullNumericInput}
                    aria-label="Quantity"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
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
                    className={fullNumericInput}
                    aria-label="Cost"
                  />
                </td>
                <td className="px-3 py-2 align-middle">
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
                <td className="px-2 py-2 align-middle">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setForm((f) => ({ ...f, parts: f.parts.filter((_, j) => j !== i) }))
                    }
                    aria-label="Remove part line"
                    tabIndex={0}
                  >
                    <X className="size-4" />
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
        <section className="rounded-xl border-2 border-emerald-200/80 bg-emerald-50/20 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              icon={Package}
              title="Parts"
              description="Part cost and quantity — retail markup applies on the estimate."
            />
            <AddLineButton label="Add part" onClick={addPart} />
          </div>

          {partsTableBody}
        </section>
  );

  if (isStepped || hideInlineSummary) {
    return (
      <div className={cn("min-w-0", compact ? "space-y-2" : "space-y-4")}>
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
