"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  DollarSign,
  Hash,
  Loader2,
  Minus,
  Package,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INVENTORY_CATEGORIES } from "@/lib/inventory-categories";
import { cn } from "@/lib/utils";
import {
  createInventoryPart,
  updateInventoryPart,
  type CreateInventoryPartInput,
} from "@/server/actions/inventory";
import type { InventoryPartDetail } from "@/server/inventory";

const CATEGORIES = [...INVENTORY_CATEGORIES];

const fieldClass = cn(
  "h-9 border-border bg-white shadow-none transition-[border-color,box-shadow]",
  "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
);

function dollarsToCents(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

type FormState = {
  partNumber: string;
  description: string;
  brand: string;
  category: string;
  vendorName: string;
  vendorPartNumber: string;
  quantityOnHand: string;
  reorderPoint: string;
  reorderQty: string;
  cost: string;
  retail: string;
  binLocation: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    partNumber: "",
    description: "",
    brand: "",
    category: "",
    vendorName: "",
    vendorPartNumber: "",
    quantityOnHand: "0",
    reorderPoint: "0",
    reorderQty: "0",
    cost: "0.00",
    retail: "0.00",
    binLocation: "",
    notes: "",
  };
}

function fromPart(part: InventoryPartDetail): FormState {
  return {
    partNumber: part.partNumber,
    description: part.description,
    brand: part.brand ?? "",
    category: part.category ?? "",
    vendorName: part.vendorName ?? "",
    vendorPartNumber: part.vendorPartNumber ?? "",
    quantityOnHand: String(part.quantityOnHand),
    reorderPoint: String(part.reorderPoint),
    reorderQty: String(part.reorderQty),
    cost: centsToInput(part.costCents),
    retail: centsToInput(part.retailCents),
    binLocation: part.binLocation ?? "",
    notes: part.notes ?? "",
  };
}

function toPayload(form: FormState): CreateInventoryPartInput {
  return {
    partNumber: form.partNumber,
    description: form.description,
    brand: form.brand || undefined,
    category: form.category || undefined,
    vendorName: form.vendorName || undefined,
    vendorPartNumber: form.vendorPartNumber || undefined,
    quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
    reorderPoint: parseInt(form.reorderPoint, 10) || 0,
    reorderQty: parseInt(form.reorderQty, 10) || 0,
    costCents: dollarsToCents(form.cost),
    retailCents: dollarsToCents(form.retail),
    binLocation: form.binLocation || undefined,
    notes: form.notes || undefined,
  };
}

function parseNonNegInt(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Small uppercase strip label — no card chrome */
function StripLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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

function QtyStepper({
  id,
  label,
  value,
  onChange,
  required,
  min = 0,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  min?: number;
  className?: string;
}) {
  const n = parseNonNegInt(value);

  function bump(delta: number) {
    onChange(String(Math.max(min, n + delta)));
  }

  return (
    <Field label={label} required={required} htmlFor={id} className={className}>
      <div className="inline-flex h-9 w-full items-stretch overflow-hidden rounded-md border border-border bg-white">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="flex w-8 shrink-0 items-center justify-center border-r border-border text-brand-navy transition-colors hover:bg-brand-light/25 disabled:opacity-40"
          disabled={n <= min}
          onClick={() => bump(-1)}
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <Input
          id={id}
          type="number"
          min={min}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            fieldClass,
            "h-full flex-1 rounded-none border-0 px-1 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0",
          )}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="flex w-8 shrink-0 items-center justify-center border-l border-border text-brand-navy transition-colors hover:bg-brand-light/25"
          onClick={() => bump(1)}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </Field>
  );
}

function MoneyInput({
  id,
  label,
  value,
  onChange,
  required,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field label={label} required={required} htmlFor={id} className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-brand-navy/70">
          <DollarSign className="size-3.5" aria-hidden />
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const cents = dollarsToCents(value);
            onChange(centsToInput(cents));
          }}
          required={required}
          className={cn(fieldClass, "pl-8 font-semibold tabular-nums")}
        />
      </div>
    </Field>
  );
}

function CategoryChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const trimmed = value.trim();
  const isStandard = CATEGORIES.some((c) => c === trimmed);
  const showCustom = trimmed.length > 0 && !isStandard;

  return (
    <Field label="Category">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Part category">
        {CATEGORIES.map((cat) => {
          const active = trimmed === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(active ? "" : cat)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-semibold transition-[background-color,color,border-color]",
                active
                  ? "bg-brand-navy text-white"
                  : "border border-border bg-white text-muted-foreground hover:border-brand-light hover:bg-brand-light/20 hover:text-brand-navy",
              )}
            >
              {cat}
            </button>
          );
        })}
        <Input
          value={showCustom || !isStandard ? value : ""}
          placeholder="Custom…"
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldClass, "h-7 w-28 text-xs")}
          aria-label="Custom category"
        />
      </div>
    </Field>
  );
}

export function InventoryPartForm({
  part,
  mode = "create",
}: {
  part?: InventoryPartDetail;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(part ? fromPart(part) : emptyForm());
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    setError(null);
    if (!form.partNumber.trim() || !form.description.trim()) {
      setError("Part number and description are required.");
      return;
    }
    startTransition(async () => {
      const payload = toPayload(form);
      const result =
        mode === "edit" && part
          ? await updateInventoryPart({ ...payload, id: part.id })
          : await createInventoryPart(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (addAnother) {
        setForm(emptyForm());
        router.refresh();
        return;
      }
      router.push(mode === "edit" ? `/inventory/${result.id}` : "/inventory");
      router.refresh();
    });
  }

  const costCents = dollarsToCents(form.cost);
  const retailCents = dollarsToCents(form.retail);
  const marginCents = retailCents - costCents;
  const marginPct =
    retailCents > 0 ? Math.round((marginCents / retailCents) * 1000) / 10 : null;

  const actionBtnClass = "h-9 min-w-[7rem] px-3.5";

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className="relative z-0 mx-auto max-w-6xl overflow-visible rounded-lg border border-border bg-white shadow-sm shadow-brand-navy/5"
    >
      {/* Slim header */}
      <div className="relative flex items-center gap-3 border-b border-border bg-gradient-to-r from-slate-50 via-white to-brand-light/10 px-4 py-3 sm:px-5">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-navy"
          aria-hidden
        />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
          <Package className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-brand-navy">
            {mode === "edit" ? "Edit part" : "Add part"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Identity → stock → pricing → notes
          </p>
        </div>
      </div>

      {/* Dense body: left identity | right stock+pricing */}
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* ── Identity (left) ── */}
        <section className="space-y-3 border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <StripLabel>Identity</StripLabel>

          {/* Row: part # | name */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <Field label="Part number" required htmlFor="partNumber">
              <div className="relative">
                <Hash className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-brand-navy/50" />
                <Input
                  id="partNumber"
                  value={form.partNumber}
                  onChange={(e) => setField("partNumber", e.target.value)}
                  required
                  className={cn(fieldClass, "pl-8 font-medium")}
                  placeholder="OEM / SKU"
                />
              </div>
            </Field>
            <Field label="Part name / description" required htmlFor="description">
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                required
                className={fieldClass}
                placeholder="Oil filter, brake pad set…"
              />
            </Field>
          </div>

          {/* Row: brand | vendor | vendor # | bin */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Brand" htmlFor="brand">
              <Input
                id="brand"
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Vendor" htmlFor="vendorName">
              <Input
                id="vendorName"
                value={form.vendorName}
                onChange={(e) => setField("vendorName", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Vendor part #" htmlFor="vendorPartNumber">
              <Input
                id="vendorPartNumber"
                value={form.vendorPartNumber}
                onChange={(e) => setField("vendorPartNumber", e.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Bin" htmlFor="binLocation">
              <Input
                id="binLocation"
                value={form.binLocation}
                onChange={(e) => setField("binLocation", e.target.value)}
                placeholder="A1-B2"
                className={fieldClass}
              />
            </Field>
          </div>

          {/* Compact category chip row */}
          <CategoryChips
            value={form.category}
            onChange={(next) => setField("category", next)}
          />
        </section>

        {/* ── Stock + Pricing (right) ── */}
        <section className="space-y-4 bg-slate-50/50 p-4 sm:p-5">
          <div>
            <StripLabel>Stock</StripLabel>
            <div className="grid grid-cols-3 gap-3">
              {mode === "create" ? (
                <QtyStepper
                  id="quantityOnHand"
                  label="In stock"
                  value={form.quantityOnHand}
                  onChange={(v) => setField("quantityOnHand", v)}
                  required
                />
              ) : (
                <Field label="In stock">
                  <p className="flex h-9 items-center rounded-md border border-dashed border-brand-navy/20 bg-white px-2.5 text-sm font-semibold tabular-nums text-brand-navy">
                    {form.quantityOnHand}
                    <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Adjust
                    </span>
                  </p>
                </Field>
              )}
              <QtyStepper
                id="reorderPoint"
                label="Min stock"
                value={form.reorderPoint}
                onChange={(v) => setField("reorderPoint", v)}
              />
              <QtyStepper
                id="reorderQty"
                label="Reorder qty"
                value={form.reorderQty}
                onChange={(v) => setField("reorderQty", v)}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Min triggers low-stock alerts · Reorder = suggested order qty
            </p>
          </div>

          <div>
            <StripLabel>Pricing</StripLabel>
            <div className="grid grid-cols-3 gap-3">
              <MoneyInput
                id="cost"
                label="Unit cost"
                value={form.cost}
                onChange={(v) => setField("cost", v)}
                required
              />
              <MoneyInput
                id="retail"
                label="Retail"
                value={form.retail}
                onChange={(v) => setField("retail", v)}
                required
              />
              <Field label="Margin">
                <div
                  className={cn(
                    "flex h-9 items-center rounded-md border border-brand-light/60 bg-brand-light/20 px-2.5 text-sm font-semibold tabular-nums",
                    marginCents < 0 ? "text-brand-red" : "text-brand-navy",
                  )}
                >
                  ${(marginCents / 100).toFixed(2)}
                  {marginPct != null ? (
                    <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                      ({marginPct}%)
                    </span>
                  ) : null}
                </div>
              </Field>
            </div>
          </div>
        </section>
      </div>

      {/* Notes — short full-width strip */}
      <section className="border-t border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:w-14">
            Notes
          </p>
          <Textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Fitment, supersessions, shelf remarks…"
            className={cn(
              "min-h-[2.75rem] flex-1 resize-y border-border bg-white py-2 text-sm shadow-none",
              "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
            )}
            aria-label="Notes"
          />
        </div>
      </section>

      {error ? (
        <p className="border-t border-brand-red/20 bg-brand-red/5 px-4 py-2.5 text-sm text-brand-red sm:px-5">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="outline"
          asChild
          className={cn(actionBtnClass, "border-border")}
        >
          <Link href={mode === "edit" && part ? `/inventory/${part.id}` : "/inventory"}>
            Cancel
          </Link>
        </Button>
        {mode === "create" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={(e) => handleSubmit(e, true)}
            className={cn(
              actionBtnClass,
              "border-brand-navy/25 text-brand-navy hover:bg-brand-light/20 hover:text-brand-navy",
            )}
          >
            Save &amp; add another
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={pending}
          className={cn(actionBtnClass, "bg-brand-navy text-white hover:bg-brand-navy/90")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}
