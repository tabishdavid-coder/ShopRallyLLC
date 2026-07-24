"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";

import { DollarsInput, HoursInput } from "@/components/canned-jobs/canned-job-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ShopLaborRateEditorRow = {
  id?: string;
  name: string;
  rate: number;
  defaultHours: number;
  isActive: boolean;
  isDefault: boolean;
};

const emptyRow = (rate = 0, isDefault = false): ShopLaborRateEditorRow => ({
  name: "",
  rate,
  defaultHours: 1,
  isActive: true,
  isDefault,
});

function ActiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active ? "bg-brand-navy" : "bg-muted-foreground/25",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          active ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

const input =
  "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

/** Shared labor list editor — RO Settings and canned-job catalog use the same rows. */
export function ShopLaborRatesEditor({
  initialRows,
  shopDefaultRateCents,
  onSave,
  saveLabel = "Save labor list",
  addLabel = "Add labor rate",
  compact = false,
}: {
  initialRows: ShopLaborRateEditorRow[];
  shopDefaultRateCents: number;
  onSave: (rows: ShopLaborRateEditorRow[]) => Promise<{ ok: true } | { ok: false; error: string }>;
  saveLabel?: string;
  addLabel?: string;
  /** Tighter table for dialog embedding. */
  compact?: boolean;
}) {
  const [rows, setRows] = useState<ShopLaborRateEditorRow[]>(initialRows);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (i: number, patch: Partial<ShopLaborRateEditorRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const setDefault = (i: number) =>
    setRows((rs) => rs.map((r, idx) => ({ ...r, isDefault: idx === i })));

  const add = () => {
    const fallbackRate = shopDefaultRateCents / 100;
    setRows((rs) => [...rs, emptyRow(fallbackRate, rs.length === 0)]);
  };

  const remove = (i: number) => {
    setRows((rs) => {
      const next = rs.filter((_, idx) => idx !== i);
      if (next.length && !next.some((r) => r.isDefault)) next[0]!.isDefault = true;
      return next;
    });
  };

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await onSave(rows);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  const th = compact
    ? "text-[10px] font-semibold uppercase tracking-[0.06em]"
    : "text-xs font-semibold uppercase tracking-wide text-subtle-foreground";

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className={cn("border-b bg-muted/40 text-left", compact && "bg-muted/30")}>
              <th className={cn("w-14 px-3 py-2.5 font-medium", th)}>Default</th>
              <th className={cn("py-2.5 font-medium", th, compact ? "pl-2" : "px-4")}>Name</th>
              <th className={cn("w-28 py-2.5 text-right font-medium", th)}>Rate / hr</th>
              <th className={cn("w-24 py-2.5 text-right font-medium", th)}>Default hrs</th>
              <th className={cn("w-20 py-2.5 text-center font-medium", th)}>Active</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? `new-${i}`} className="border-b align-middle last:border-0">
                <td className={cn("py-2", compact ? "px-3" : "px-4")}>
                  <input
                    type="radio"
                    name="shop-labor-default"
                    checked={r.isDefault}
                    onChange={() => setDefault(i)}
                    className="size-4 accent-primary"
                    aria-label={`Set ${r.name || "labor rate"} as shop default`}
                  />
                </td>
                <td className={cn("py-2 pr-2", compact ? "pl-2" : "")}>
                  <Input
                    value={r.name}
                    onChange={(e) => set(i, { name: e.target.value })}
                    placeholder="e.g. Maintenance Labor"
                    className={cn(compact ? "h-8 text-xs" : input, "w-full min-w-[8rem]")}
                  />
                </td>
                <td className="py-2 pr-2">
                  {compact ? (
                    <DollarsInput
                      cents={Math.round(r.rate * 100)}
                      onCommit={(rateCents) => set(i, { rate: rateCents / 100 })}
                      placeholder={(shopDefaultRateCents / 100).toFixed(2)}
                      className="h-8 w-full text-right text-xs tabular-nums"
                    />
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn(input, "w-28 text-right tabular-nums")}
                        value={r.rate}
                        onChange={(e) => set(i, { rate: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </td>
                <td className="py-2 pr-2">
                  {compact ? (
                    <HoursInput
                      hours={r.defaultHours}
                      onCommit={(defaultHours) => set(i, { defaultHours })}
                      placeholder="1.0"
                      className="h-8 w-full text-right text-xs tabular-nums"
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      className={cn(input, "w-full text-right tabular-nums")}
                      value={r.defaultHours}
                      onChange={(e) => set(i, { defaultHours: Number(e.target.value) })}
                    />
                  )}
                </td>
                <td className="py-2 text-center">
                  <ActiveToggle
                    active={r.isActive}
                    onChange={(isActive) => set(i, { isActive })}
                    disabled={pending}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label="Remove"
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                  No labor rates yet. Add one below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? (
          <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
            <Check className="size-3.5" /> Saved
          </span>
        ) : null}
        <p className="mr-auto hidden text-xs text-muted-foreground lg:block">
          Default rate:{" "}
          <span className="font-medium tabular-nums text-brand-navy">
            {formatCents(
              Math.round((rows.find((r) => r.isDefault)?.rate ?? shopDefaultRateCents / 100) * 100),
            )}
            /hr
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={add} disabled={pending}>
          <Plus className="size-4" /> {addLabel}
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} {saveLabel}
        </Button>
      </div>
    </div>
  );
}
