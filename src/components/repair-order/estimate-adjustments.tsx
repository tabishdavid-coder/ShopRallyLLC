"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  addFee,
  updateFee,
  deleteFee,
  addDiscount,
  updateDiscount,
  deleteDiscount,
} from "@/server/actions/adjustments";

type Method = "PERCENT" | "FIXED";
type Base = "LABOR" | "PARTS" | "LABOR_PARTS";
type Adj = {
  id: string;
  name: string;
  method: Method;
  base: Base;
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};
type DiscountTemplate = { name: string; method: Method; base: Base; amount: number };
type FeeTemplate = DiscountTemplate & { capCents?: number | null; taxable?: boolean };

const BASE_LABEL: Record<Base, string> = {
  LABOR: "Labor",
  PARTS: "Parts",
  LABOR_PARTS: "Labor, Parts",
};

function calc(a: Adj, labor: number, parts: number): number {
  const b = a.base === "LABOR" ? labor : a.base === "PARTS" ? parts : labor + parts;
  let v = a.method === "PERCENT" ? Math.round((b * a.amount) / 10000) : a.amount;
  if (a.capCents != null) v = Math.min(v, a.capCents);
  return Math.max(0, v);
}

type Draft = { name: string; method: Method; base: Base; amountStr: string; capStr: string; taxable: boolean };

const emptyDraft: Draft = { name: "", method: "PERCENT", base: "LABOR_PARTS", amountStr: "", capStr: "", taxable: false };

function toDraft(a: Adj): Draft {
  return {
    name: a.name,
    method: a.method,
    base: a.base,
    amountStr: a.method === "PERCENT" ? String(a.amount / 100) : String(a.amount / 100),
    capStr: a.capCents != null ? String(a.capCents / 100) : "",
    taxable: a.taxable ?? false,
  };
}

/** Fees & Discounts editor for the estimate — RO-level, or a single job when jobId is set. */
export function EstimateAdjustments({
  roId,
  jobId,
  fees,
  discounts,
  laborCents,
  partsCents,
  feeTitle = "RO Fees",
  discountTitle = "Discounts",
  discountTemplates = [],
  feeTemplates = [],
  layout = "default",
  jobCount,
}: {
  roId: string;
  jobId?: string;
  fees: Adj[];
  discounts: Adj[];
  laborCents: number;
  partsCents: number;
  feeTitle?: string;
  discountTitle?: string;
  discountTemplates?: DiscountTemplate[];
  feeTemplates?: FeeTemplate[];
  layout?: "default" | "job-card" | "estimate-ro";
  jobCount?: number;
}) {
  if (layout === "estimate-ro") {
    return (
      <div className="space-y-3 border-t border-[#DDE5EF] bg-white px-3 py-3">
        <Section
          kind="fee"
          title="Fees"
          roId={roId}
          jobId={jobId}
          items={fees}
          laborCents={laborCents}
          partsCents={partsCents}
          templates={feeTemplates}
          layout="estimate-ro"
          jobCount={jobCount}
        />
      </div>
    );
  }

  const gridClass = layout === "job-card" ? "grid gap-3" : "grid gap-3 md:grid-cols-2";
  return (
    <div className={gridClass}>
      <Section
        kind="fee"
        title={feeTitle}
        roId={roId}
        jobId={jobId}
        items={fees}
        laborCents={laborCents}
        partsCents={partsCents}
        templates={feeTemplates}
        layout={layout}
      />
      <Section
        kind="discount"
        title={discountTitle}
        roId={roId}
        jobId={jobId}
        items={discounts}
        laborCents={laborCents}
        partsCents={partsCents}
        templates={discountTemplates}
        layout={layout}
      />
    </div>
  );
}

function Section({
  kind,
  title,
  roId,
  jobId,
  items,
  laborCents,
  partsCents,
  templates = [],
  layout = "default",
  jobCount,
}: {
  kind: "fee" | "discount";
  title: string;
  roId: string;
  jobId?: string;
  items: Adj[];
  laborCents: number;
  partsCents: number;
  templates?: (DiscountTemplate | FeeTemplate)[];
  layout?: "default" | "job-card" | "estimate-ro";
  jobCount?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const isFee = kind === "fee";
  /** Palette C job-card chrome for the estimate RO fees block (visual only). */
  const roCard = layout === "estimate-ro";

  const total = items.reduce((s, a) => s + calc(a, laborCents, partsCents), 0);

  function beginAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }
  function beginEdit(a: Adj) {
    setDraft(toDraft(a));
    setAdding(false);
    setEditingId(a.id);
    setError(null);
  }
  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function payload() {
    const amount = Math.round((parseFloat(draft.amountStr) || 0) * 100); // % → bps, $ → cents (both ×100)
    const cap = draft.capStr.trim() ? Math.round(parseFloat(draft.capStr) * 100) : null;
    return isFee
      ? { name: draft.name, method: draft.method, base: draft.base, amount, capCents: cap, taxable: draft.taxable }
      : { name: draft.name, method: draft.method, base: draft.base, amount };
  }

  function applyTemplate(t: DiscountTemplate | FeeTemplate) {
    setDraft({
      name: t.name,
      method: t.method,
      base: t.base,
      amountStr: t.method === "PERCENT" ? String(t.amount / 100) : String(t.amount / 100),
      capStr: "capCents" in t && t.capCents != null ? String(t.capCents / 100) : "",
      taxable: "taxable" in t ? Boolean(t.taxable) : false,
    });
    setAdding(true);
    setEditingId(null);
    setError(null);
  }

  function quickAddTemplate(t: FeeTemplate) {
    setError(null);
    start(async () => {
      const res = await addFee(
        roId,
        {
          name: t.name,
          method: t.method,
          base: t.base,
          amount: t.amount,
          capCents: t.capCents ?? null,
          taxable: t.taxable ?? false,
        },
        jobId,
      );
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const availableFeeTemplates = isFee
    ? (templates as FeeTemplate[]).filter(
        (t) => !items.some((i) => i.name.trim().toLowerCase() === t.name.trim().toLowerCase()),
      )
    : [];

  function submit() {
    setError(null);
    start(async () => {
      const body = payload();
      const res = editingId
        ? isFee
          ? await updateFee(editingId, body)
          : await updateDiscount(editingId, body)
        : isFee
          ? await addFee(roId, body, jobId)
          : await addDiscount(roId, body, jobId);
      if (res.ok) {
        cancel();
        router.refresh();
      } else setError(res.error);
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = isFee ? await deleteFee(id) : await deleteDiscount(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div
      className={
        roCard
          ? "overflow-hidden rounded-none border border-[#B9C8DC] bg-white shadow-sm"
          : "rounded-lg border bg-card"
      }
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-3 py-2",
          roCard && "border-[#CBD8E7] bg-[#E7F1FD]",
        )}
      >
        <span
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            roCard && "font-bold text-[#0B1F3B]",
          )}
        >
          {title}
        </span>
        <div className="flex items-center gap-3">
          {roCard && isFee && jobCount != null && jobCount > 0 ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5B7295]">
              Applied to: {jobCount} / {jobCount}
            </span>
          ) : null}
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              roCard ? "text-[#5B7295]" : "text-muted-foreground",
            )}
          >
            {isFee && roCard ? "RO fees total " : isFee ? "Total " : ""}
            <span className={cn("text-sm tabular-nums", roCard ? "font-bold text-[#0B1F3B]" : "text-foreground")}>
              {isFee ? "" : total > 0 ? "-" : ""}
              {formatCents(total)}
            </span>
          </span>
        </div>
      </div>

      {items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr
              className={cn(
                "border-b text-xs text-muted-foreground",
                roCard &&
                  "border-[#DDE5EF] bg-[#F3F8FE] text-[11px] font-semibold uppercase tracking-wide text-[#5B7295]",
              )}
            >
              {layout === "job-card" ? (
                <>
                  <th className="px-3 py-1.5 text-left font-medium">Method</th>
                  <th className="px-3 py-1.5 text-left font-medium">Calculate on</th>
                  <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                  {isFee ? <th className="px-3 py-1.5 text-right font-medium">Cap</th> : null}
                </>
              ) : layout === "estimate-ro" ? (
                <>
                  <th className="px-3 py-1.5 text-left font-medium">Name</th>
                  <th className="px-3 py-1.5 text-left font-medium">Method</th>
                  <th className="px-3 py-1.5 text-left font-medium">Calculate on</th>
                  <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                  <th className="px-3 py-1.5 text-right font-medium">Total</th>
                  <th className="w-16 px-2 py-1.5 text-right font-medium"> </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-1.5 text-left font-medium">Name</th>
                  <th className="px-3 py-1.5 text-left font-medium">Method</th>
                  <th className="px-3 py-1.5 text-left font-medium">Calculate on</th>
                  <th className="px-3 py-1.5 text-right font-medium">Amount</th>
                </>
              )}
              {layout !== "estimate-ro" && layout !== "job-card" ? <th className="w-16" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className={cn("border-b last:border-0", roCard && "border-[#DDE5EF]")}>
                {layout === "job-card" ? (
                  <>
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{a.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        ({a.method === "PERCENT" ? `${a.amount / 100}%` : formatCents(a.amount)})
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{BASE_LABEL[a.base]}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCents(calc(a, laborCents, partsCents))}</td>
                    {isFee ? (
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                        {a.capCents != null ? formatCents(a.capCents) : "—"}
                      </td>
                    ) : null}
                  </>
                ) : layout === "estimate-ro" ? (
                  <>
                    <td className="px-3 py-1.5 font-medium text-[#0B1F3B]">{a.name}</td>
                    <td className="px-3 py-1.5 text-[#5B7295]">
                      {a.method === "PERCENT" ? "Percentage" : "Fixed"}
                    </td>
                    <td className="px-3 py-1.5 text-[#5B7295]">{BASE_LABEL[a.base]}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[#5B7295]">
                      {a.method === "PERCENT" ? `${a.amount / 100}%` : formatCents(a.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium text-[#0B1F3B]">
                      {formatCents(calc(a, laborCents, partsCents))}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex justify-end gap-1 text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => beginEdit(a)}
                          aria-label={`Edit ${a.name}`}
                          className="rounded p-1 hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(a.id)}
                          disabled={pending}
                          aria-label={`Delete ${a.name}`}
                          className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-1.5">{a.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {a.method === "PERCENT" ? `${a.amount / 100}%` : formatCents(a.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{BASE_LABEL[a.base]}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatCents(calc(a, laborCents, partsCents))}</td>
                  </>
                )}
                {layout === "default" ? (
                <td className="px-2 py-1.5">
                  <div className="flex justify-end gap-1 text-muted-foreground">
                    <button type="button" onClick={() => beginEdit(a)} aria-label="Edit" className="rounded p-1 hover:bg-accent hover:text-foreground">
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(a.id)} disabled={pending} aria-label="Delete" className="rounded p-1 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={cn("px-3 py-3 text-sm", roCard ? "text-[#5B7295]" : "text-muted-foreground")}>
          No {isFee ? "fees" : "discounts"} added
        </p>
      )}

      {error ? <p className="px-3 pt-2 text-sm text-destructive">{error}</p> : null}

      {adding || editingId ? (
        <div className={cn("space-y-2 border-t p-3", roCard ? "border-[#CBD8E7] bg-[#F3F8FE]" : "bg-muted/30")}>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={isFee ? "Fee name (e.g. Card Fee)" : "Discount name"}
              className="h-8 w-40"
            />
            <select
              value={draft.method}
              onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as Method }))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="PERCENT">Percent %</option>
              <option value="FIXED">Fixed $</option>
            </select>
            <Input
              type="number"
              step="0.01"
              value={draft.amountStr}
              onChange={(e) => setDraft((d) => ({ ...d, amountStr: e.target.value }))}
              placeholder={draft.method === "PERCENT" ? "3" : "0.00"}
              className="h-8 w-20"
            />
            <span className="text-xs text-muted-foreground">on</span>
            <select
              value={draft.base}
              onChange={(e) => setDraft((d) => ({ ...d, base: e.target.value as Base }))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="LABOR_PARTS">Labor, Parts</option>
              <option value="LABOR">Labor</option>
              <option value="PARTS">Parts</option>
            </select>
            {isFee ? (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={draft.taxable}
                  onChange={(e) => setDraft((d) => ({ ...d, taxable: e.target.checked }))}
                />
                Taxable
              </label>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cancel} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn("border-t p-2 space-y-2", roCard && "border-[#CBD8E7] bg-[#F3F8FE]")}>
          {isFee && availableFeeTemplates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 px-1">
              {availableFeeTemplates.map((t) => (
                <Button
                  key={t.name}
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => quickAddTemplate(t)}
                  className="h-7 text-xs"
                >
                  + {t.name}
                </Button>
              ))}
            </div>
          ) : null}
          {!isFee && templates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 px-1">
              {templates.map((t) => (
                <Button key={t.name} variant="outline" size="sm" onClick={() => applyTemplate(t)} className="h-7 text-xs">
                  {t.name}
                </Button>
              ))}
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={beginAdd}
            className={cn(
              "gap-1.5 uppercase tracking-wide",
              roCard
                ? "font-semibold text-[#E86A10] hover:bg-[#E86A10]/10 hover:text-[#E86A10]"
                : "text-primary",
            )}
          >
            <Plus className="size-4" /> Add {isFee ? "Fee" : "Discount"}
          </Button>
        </div>
      )}
    </div>
  );
}
