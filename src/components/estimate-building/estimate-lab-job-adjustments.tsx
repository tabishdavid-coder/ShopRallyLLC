"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  deleteDiscount,
  deleteFee,
  updateDiscount,
  updateFee,
} from "@/server/actions/adjustments";
import { LAB_INPUT, LAB_TABLE_HEAD } from "@/components/estimate-building/estimate-lab-job-card-shell";

type Method = "PERCENT" | "FIXED";
type Base = "LABOR" | "PARTS" | "LABOR_PARTS";

export type JobAdjustment = {
  id: string;
  name: string;
  method: Method;
  base: Base;
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

const SELECT_CLASS = cn(LAB_INPUT, "w-full rounded-md border border-input bg-background");

function isDecimalInput(s: string): boolean {
  return /^-?\d*\.?\d*$/.test(s);
}

function toAmountStr(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function parseAmount(s: string): number | null {
  const t = s.trim();
  if (t === "" || t === "." || t === "-") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function calc(a: JobAdjustment, laborCents: number, partsCents: number): number {
  const base = a.base === "LABOR" ? laborCents : a.base === "PARTS" ? partsCents : laborCents + partsCents;
  let v = a.method === "PERCENT" ? Math.round((base * a.amount) / 10000) : a.amount;
  if (a.capCents != null) v = Math.min(v, a.capCents);
  return Math.max(0, v);
}

/** One directly-editable Fee/Discount line — no dialog; every field saves on blur/change. */
function AdjustmentRow({
  item,
  kind,
  laborCents,
  partsCents,
  canEdit,
  onSaved,
}: {
  item: JobAdjustment;
  kind: "fee" | "discount";
  laborCents: number;
  partsCents: number;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const isFee = kind === "fee";
  const [name, setName] = useState(item.name);
  const [method, setMethod] = useState<Method>(item.method);
  const [base, setBase] = useState<Base>(item.base);
  const [amountStr, setAmountStr] = useState(toAmountStr(item.amount));
  const [taxable, setTaxable] = useState(Boolean(item.taxable));
  const [pending, start] = useTransition();

  function commit(patch: Partial<{ name: string; method: Method; base: Base; amount: number; taxable: boolean }>) {
    const nextName = (patch.name ?? name).trim();
    if (!nextName) {
      setName(item.name);
      return;
    }
    const nextAmount = patch.amount ?? parseAmount(amountStr) ?? item.amount;
    const nextMethod = patch.method ?? method;
    const nextBase = patch.base ?? base;
    const nextTaxable = patch.taxable ?? taxable;
    start(async () => {
      const res = isFee
        ? await updateFee(item.id, {
            name: nextName,
            method: nextMethod,
            base: nextBase,
            amount: nextAmount,
            capCents: item.capCents ?? null,
            taxable: nextTaxable,
          })
        : await updateDiscount(item.id, { name: nextName, method: nextMethod, base: nextBase, amount: nextAmount });
      if (res.ok) onSaved();
    });
  }

  function remove() {
    start(async () => {
      const res = isFee ? await deleteFee(item.id) : await deleteDiscount(item.id);
      if (res.ok) onSaved();
    });
  }

  const previewAmount = parseAmount(amountStr) ?? item.amount;
  const total = calc({ ...item, method, base, amount: previewAmount }, laborCents, partsCents);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-2 py-1">
        <Input
          value={name}
          readOnly={!canEdit}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => commit({ name })}
          placeholder={isFee ? "Fee name" : "Discount name"}
          className={cn(LAB_INPUT, "min-w-0")}
        />
      </td>
      <td className="px-2 py-1">
        <select
          value={method}
          disabled={!canEdit}
          onChange={(e) => {
            const next = e.target.value as Method;
            setMethod(next);
            commit({ method: next });
          }}
          className={SELECT_CLASS}
          aria-label={`${isFee ? "Fee" : "Discount"} method`}
        >
          <option value="FIXED">Fixed $</option>
          <option value="PERCENT">Percent %</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <select
          value={base}
          disabled={!canEdit}
          onChange={(e) => {
            const next = e.target.value as Base;
            setBase(next);
            commit({ base: next });
          }}
          className={SELECT_CLASS}
          aria-label={`${isFee ? "Fee" : "Discount"} calculate on`}
        >
          <option value="LABOR_PARTS">Labor + Parts</option>
          <option value="LABOR">Labor</option>
          <option value="PARTS">Parts</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-0.5">
          <span className="w-3 shrink-0 text-[10px] text-muted-foreground">{method === "PERCENT" ? "%" : "$"}</span>
          <Input
            type="text"
            inputMode="decimal"
            readOnly={!canEdit}
            value={amountStr}
            onChange={(e) => {
              if (!isDecimalInput(e.target.value)) return;
              setAmountStr(e.target.value);
            }}
            onBlur={() => commit({ amount: parseAmount(amountStr) ?? 0 })}
            className={cn(LAB_INPUT, "w-16 text-right")}
          />
        </div>
      </td>
      {isFee ? (
        <td className="px-2 py-1 text-center">
          <Checkbox
            checked={taxable}
            disabled={!canEdit}
            onCheckedChange={(v) => {
              const next = v === true;
              setTaxable(next);
              commit({ taxable: next });
            }}
            className="size-3.5"
            aria-label="Taxable"
          />
        </td>
      ) : null}
      <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{formatCents(total)}</td>
      <td className="px-1 py-1">
        {canEdit ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Remove ${isFee ? "fee" : "discount"}`}
            className="flex size-6 items-center justify-center"
          >
            <X className="size-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        ) : null}
      </td>
    </tr>
  );
}

/** Job-level Fees/Discounts — directly-editable rows, no add/edit dialog (AutoLeap-style). */
export function EstimateLabJobAdjustments({
  kind,
  items,
  laborCents,
  partsCents,
  canEdit,
}: {
  kind: "fee" | "discount";
  items: JobAdjustment[];
  laborCents: number;
  partsCents: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const isFee = kind === "fee";
  const label = isFee ? "Fee" : "Discount";

  if (items.length === 0) return null;

  return (
    <div className="border-t border-border/70">
      <table className="w-full text-xs">
          <thead>
            <tr className={LAB_TABLE_HEAD}>
              <th className="px-2 py-1 text-left font-medium">{label} name</th>
              <th className="px-2 py-1 text-left font-medium">Method</th>
              <th className="px-2 py-1 text-left font-medium">Calculate on</th>
              <th className="px-2 py-1 text-right font-medium">Amount</th>
              {isFee ? <th className="px-2 py-1 text-center font-medium">Taxable</th> : null}
              <th className="px-2 py-1 text-right font-medium">Total</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <AdjustmentRow
                key={item.id}
                item={item}
                kind={kind}
                laborCents={laborCents}
                partsCents={partsCents}
                canEdit={canEdit}
                onSaved={() => router.refresh()}
              />
            ))}
          </tbody>
      </table>
    </div>
  );
}
