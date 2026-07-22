"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Disc3, DollarSign, Hash, Loader2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  TIRE_CONDITION_LABELS,
  TIRE_CONDITIONS,
} from "@/lib/tire-stock";
import { cn } from "@/lib/utils";
import {
  createTireStock,
  updateTireStock,
  type CreateTireStockInput,
} from "@/server/actions/tire-stock";
import type { TireStockDetail } from "@/server/tire-stock";
import type { TireCondition } from "@/generated/prisma";

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
  stockNumber: string;
  brand: string;
  model: string;
  size: string;
  loadSpeed: string;
  condition: TireCondition;
  quantityOnHand: string;
  reorderPoint: string;
  reorderQty: string;
  cost: string;
  retail: string;
  binLocation: string;
  dotCode: string;
  treadDepth32nds: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    stockNumber: "",
    brand: "",
    model: "",
    size: "",
    loadSpeed: "",
    condition: "NEW",
    quantityOnHand: "0",
    reorderPoint: "0",
    reorderQty: "0",
    cost: "0.00",
    retail: "0.00",
    binLocation: "",
    dotCode: "",
    treadDepth32nds: "",
    notes: "",
  };
}

function fromTire(tire: TireStockDetail): FormState {
  return {
    stockNumber: tire.stockNumber,
    brand: tire.brand,
    model: tire.model,
    size: tire.size,
    loadSpeed: tire.loadSpeed ?? "",
    condition: tire.condition,
    quantityOnHand: String(tire.quantityOnHand),
    reorderPoint: String(tire.reorderPoint),
    reorderQty: String(tire.reorderQty),
    cost: centsToInput(tire.costCents),
    retail: centsToInput(tire.retailCents),
    binLocation: tire.binLocation ?? "",
    dotCode: tire.dotCode ?? "",
    treadDepth32nds: tire.treadDepth32nds != null ? String(tire.treadDepth32nds) : "",
    notes: tire.notes ?? "",
  };
}

function toPayload(form: FormState): CreateTireStockInput {
  return {
    stockNumber: form.stockNumber,
    brand: form.brand,
    model: form.model,
    size: form.size,
    loadSpeed: form.loadSpeed || undefined,
    condition: form.condition,
    quantityOnHand: parseInt(form.quantityOnHand, 10) || 0,
    reorderPoint: parseInt(form.reorderPoint, 10) || 0,
    reorderQty: parseInt(form.reorderQty, 10) || 0,
    costCents: dollarsToCents(form.cost),
    retailCents: dollarsToCents(form.retail),
    binLocation: form.binLocation || undefined,
    dotCode: form.dotCode || undefined,
    treadDepth32nds: form.treadDepth32nds ? parseInt(form.treadDepth32nds, 10) : undefined,
    notes: form.notes || undefined,
  };
}

function parseNonNegInt(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

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
          <Minus className="size-3.5" />
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
          <Plus className="size-3.5" />
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
          <DollarSign className="size-3.5" />
        </span>
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(centsToInput(dollarsToCents(value)))}
          required={required}
          className={cn(fieldClass, "pl-8 font-semibold tabular-nums")}
        />
      </div>
    </Field>
  );
}

function ConditionChips({
  value,
  onChange,
}: {
  value: TireCondition;
  onChange: (next: TireCondition) => void;
}) {
  return (
    <Field label="Condition" required>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tire condition">
        {TIRE_CONDITIONS.map((c) => {
          const active = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "rounded px-2.5 py-1 text-[11px] font-semibold transition-[background-color,color,border-color]",
                active
                  ? c === "NEW"
                    ? "bg-brand-navy text-white"
                    : "bg-amber-600 text-white"
                  : "border border-border bg-white text-muted-foreground hover:border-brand-light hover:bg-brand-light/20 hover:text-brand-navy",
              )}
            >
              {TIRE_CONDITION_LABELS[c]}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function TireStockForm({
  tire,
  mode = "create",
}: {
  tire?: TireStockDetail;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(tire ? fromTire(tire) : emptyForm());
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent, addAnother = false) {
    e.preventDefault();
    setError(null);
    if (!form.stockNumber.trim() || !form.brand.trim() || !form.model.trim() || !form.size.trim()) {
      setError("Stock #, brand, model, and size are required.");
      return;
    }
    startTransition(async () => {
      const payload = toPayload(form);
      const result =
        mode === "edit" && tire
          ? await updateTireStock({ ...payload, id: tire.id })
          : await createTireStock(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (addAnother) {
        setForm(emptyForm());
        router.refresh();
        return;
      }
      router.push(mode === "edit" ? `/tires/${result.id}` : "/tires");
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
      <div className="relative flex items-center gap-3 border-b border-border bg-gradient-to-r from-slate-50 via-white to-brand-light/10 px-4 py-3 sm:px-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-navy" aria-hidden />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy text-white">
          <Disc3 className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-brand-navy">
            {mode === "edit" ? "Edit tire" : "Add tire"}
          </h2>
          <p className="text-xs text-muted-foreground">Identity → stock → pricing → notes</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-3 border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <StripLabel>Identity</StripLabel>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
            <Field label="Stock #" required htmlFor="stockNumber">
              <div className="relative">
                <Hash className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-brand-navy/50" />
                <Input
                  id="stockNumber"
                  value={form.stockNumber}
                  onChange={(e) => setField("stockNumber", e.target.value)}
                  required
                  className={cn(fieldClass, "pl-8 font-medium")}
                  placeholder="TR-MIC-2254517"
                />
              </div>
            </Field>
            <Field label="Size" required htmlFor="size">
              <Input
                id="size"
                value={form.size}
                onChange={(e) => setField("size", e.target.value)}
                required
                placeholder="225/45R17"
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Brand" required htmlFor="brand">
              <Input id="brand" value={form.brand} onChange={(e) => setField("brand", e.target.value)} required className={fieldClass} />
            </Field>
            <Field label="Model / line" required htmlFor="model">
              <Input id="model" value={form.model} onChange={(e) => setField("model", e.target.value)} required className={fieldClass} />
            </Field>
            <Field label="Load / speed" htmlFor="loadSpeed">
              <Input id="loadSpeed" value={form.loadSpeed} onChange={(e) => setField("loadSpeed", e.target.value)} placeholder="91H" className={fieldClass} />
            </Field>
            <Field label="Bin" htmlFor="binLocation">
              <Input id="binLocation" value={form.binLocation} onChange={(e) => setField("binLocation", e.target.value)} placeholder="T1-A3" className={fieldClass} />
            </Field>
          </div>
          <ConditionChips value={form.condition} onChange={(c) => setField("condition", c)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="DOT (week-year)" htmlFor="dotCode">
              <Input id="dotCode" value={form.dotCode} onChange={(e) => setField("dotCode", e.target.value)} placeholder="2423" className={fieldClass} />
            </Field>
            {form.condition === "USED" ? (
              <Field label="Tread (32nds)" htmlFor="treadDepth32nds">
                <Input
                  id="treadDepth32nds"
                  type="number"
                  min={0}
                  max={32}
                  value={form.treadDepth32nds}
                  onChange={(e) => setField("treadDepth32nds", e.target.value)}
                  className={fieldClass}
                />
              </Field>
            ) : null}
          </div>
        </section>

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
              <QtyStepper id="reorderPoint" label="Min stock" value={form.reorderPoint} onChange={(v) => setField("reorderPoint", v)} />
              <QtyStepper id="reorderQty" label="Reorder qty" value={form.reorderQty} onChange={(v) => setField("reorderQty", v)} />
            </div>
          </div>
          <div>
            <StripLabel>Pricing</StripLabel>
            <div className="grid grid-cols-3 gap-3">
              <MoneyInput id="cost" label="Unit cost" value={form.cost} onChange={(v) => setField("cost", v)} required />
              <MoneyInput id="retail" label="Retail" value={form.retail} onChange={(v) => setField("retail", v)} required />
              <Field label="Margin">
                <div
                  className={cn(
                    "flex h-9 items-center rounded-md border border-brand-light/60 bg-brand-light/20 px-2.5 text-sm font-semibold tabular-nums",
                    marginCents < 0 ? "text-brand-red" : "text-brand-navy",
                  )}
                >
                  ${(marginCents / 100).toFixed(2)}
                  {marginPct != null ? (
                    <span className="ml-1 text-[11px] font-medium text-muted-foreground">({marginPct}%)</span>
                  ) : null}
                </div>
              </Field>
            </div>
          </div>
        </section>
      </div>

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
            placeholder="Season, fitment notes, rack remarks…"
            className={cn(
              "min-h-[2.75rem] flex-1 resize-y border-border bg-white py-2 text-sm shadow-none",
              "focus-visible:border-brand-navy/40 focus-visible:ring-2 focus-visible:ring-brand-navy/15",
            )}
          />
        </div>
      </section>

      {error ? (
        <p className="border-t border-brand-red/20 bg-brand-red/5 px-4 py-2.5 text-sm text-brand-red sm:px-5">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-4 py-3 sm:px-5">
        <Button type="button" variant="outline" asChild className={cn(actionBtnClass, "border-border")}>
          <Link href={mode === "edit" && tire ? `/tires/${tire.id}` : "/tires"}>Cancel</Link>
        </Button>
        {mode === "create" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={(e) => handleSubmit(e, true)}
            className={cn(actionBtnClass, "border-brand-navy/25 text-brand-navy hover:bg-brand-light/20")}
          >
            Save &amp; add another
          </Button>
        ) : null}
        <Button type="submit" disabled={pending} className={cn(actionBtnClass, "bg-brand-navy text-white hover:bg-brand-navy/90")}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}
