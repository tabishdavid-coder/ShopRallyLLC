"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Check, X, Package, Wrench, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { markupPct } from "@/lib/matrix";
import {
  addPartTier,
  updatePartTier,
  deletePartTier,
  addLaborTier,
  updateLaborTier,
  deleteLaborTier,
} from "@/server/actions/matrix";

export type PartTierRow = { id: string; minCents: number; maxCents: number | null; multiplier: number };
export type LaborTierRow = { id: string; minHours: number; maxHours: number | null; multiplier: number };

type Draft = { min: string; max: string; multiplier: string };

const num = (s: string) => (s.trim() === "" ? null : parseFloat(s));

export function PartsMatrixEditor({ tiers }: { tiers: PartTierRow[] }) {
  return (
    <MatrixTable
      icon={Package}
      title="Parts Matrix"
      caption="Auto-applied when adding parts to estimates. Retail = cost × multiplier for the matching cost range."
      unit="$"
      showMarkup
      rows={tiers.map((t) => ({
        id: t.id,
        min: (t.minCents / 100).toString(),
        max: t.maxCents == null ? "" : (t.maxCents / 100).toString(),
        multiplier: t.multiplier,
      }))}
      onAdd={(d) =>
        addPartTier({
          minCents: Math.round((num(d.min) ?? 0) * 100),
          maxCents: num(d.max) == null ? null : Math.round((num(d.max) as number) * 100),
          multiplier: num(d.multiplier) ?? 1,
        })
      }
      onUpdate={(id, d) =>
        updatePartTier(id, {
          minCents: Math.round((num(d.min) ?? 0) * 100),
          maxCents: num(d.max) == null ? null : Math.round((num(d.max) as number) * 100),
          multiplier: num(d.multiplier) ?? 1,
        })
      }
      onDelete={deletePartTier}
    />
  );
}

export function LaborMatrixEditor({ tiers }: { tiers: LaborTierRow[] }) {
  return (
    <MatrixTable
      icon={Wrench}
      title="Labor Matrix"
      caption="Applied to Labor Book hours when imported. Rate = base rate × multiplier for the matching hours range."
      unit="hrs"
      rows={tiers.map((t) => ({
        id: t.id,
        min: t.minHours.toString(),
        max: t.maxHours == null ? "" : t.maxHours.toString(),
        multiplier: t.multiplier,
      }))}
      onAdd={(d) =>
        addLaborTier({ minHours: num(d.min) ?? 0, maxHours: num(d.max), multiplier: num(d.multiplier) ?? 1 })
      }
      onUpdate={(id, d) =>
        updateLaborTier(id, { minHours: num(d.min) ?? 0, maxHours: num(d.max), multiplier: num(d.multiplier) ?? 1 })
      }
      onDelete={deleteLaborTier}
    />
  );
}

type Row = { id: string; min: string; max: string; multiplier: number };

function MatrixTable({
  icon: Icon,
  title,
  caption,
  unit,
  showMarkup = false,
  rows,
  onAdd,
  onUpdate,
  onDelete,
}: {
  icon?: LucideIcon;
  title: string;
  caption: string;
  unit: string;
  showMarkup?: boolean;
  rows: Row[];
  onAdd: (d: Draft) => Promise<{ ok: boolean; error?: string }>;
  onUpdate: (id: string, d: Draft) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>({ min: "", max: "", multiplier: "" });
  const [error, setError] = useState<string | null>(null);

  function begin(d?: Draft, id?: string) {
    setDraft(d ?? { min: "", max: "", multiplier: "" });
    setEditId(id ?? null);
    setAdding(!id);
    setError(null);
  }
  function cancel() {
    setEditId(null);
    setAdding(false);
    setError(null);
  }
  function commit() {
    setError(null);
    start(async () => {
      const res = editId ? await onUpdate(editId, draft) : await onAdd(draft);
      if (res.ok) {
        cancel();
        router.refresh();
      } else {
        setError(res.error ?? "Could not save tier.");
      }
    });
  }
  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await onDelete(id);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not delete tier.");
    });
  }

  const prefix = unit === "$" ? "$" : "";
  const suffix = unit === "$" ? "" : ` ${unit}`;
  const fmt = (s: string, openEnded = false) =>
    s === "" ? (openEnded ? "Maximum" : "—") : `${prefix}${s}${suffix}`;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            <th className="px-4 py-2 text-left font-medium">
              {unit === "$" ? "Cost from ($)" : "Hours from"}
            </th>
            <th className="px-4 py-2 text-left font-medium">
              {unit === "$" ? "Cost to ($)" : "Hours to"}
            </th>
            <th className="px-4 py-2 text-right font-medium">Multiplier</th>
            {showMarkup ? (
              <th className="px-4 py-2 text-right font-medium">Markup %</th>
            ) : null}
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            editId === r.id ? (
              <EditRow
                key={r.id}
                unit={unit}
                showMarkup={showMarkup}
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                onSave={commit}
                onCancel={cancel}
              />
            ) : (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2 tabular-nums">{fmt(r.min)}</td>
                <td className="px-4 py-2 tabular-nums">{fmt(r.max, true)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.multiplier.toFixed(2)}</td>
                {showMarkup ? (
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                    {markupPct(r.multiplier)}
                  </td>
                ) : null}
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1 text-muted-foreground">
                    <button
                      onClick={() => begin({ min: r.min, max: r.max, multiplier: String(r.multiplier) }, r.id)}
                      aria-label="Edit tier"
                      className="rounded p-1 hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={pending}
                      aria-label="Delete tier"
                      className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ),
          )}
          {adding ? (
            <EditRow
              unit={unit}
              showMarkup={showMarkup}
              draft={draft}
              setDraft={setDraft}
              pending={pending}
              onSave={commit}
              onCancel={cancel}
            />
          ) : null}
        </tbody>
      </table>
      {error ? <p className="border-t px-4 py-2 text-xs text-destructive">{error}</p> : null}
      {!adding && !editId ? (
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" onClick={() => begin()} className="gap-1.5 text-primary">
            <Plus className="size-4" /> Add tier
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EditRow({
  unit,
  showMarkup,
  draft,
  setDraft,
  pending,
  onSave,
  onCancel,
}: {
  unit: string;
  showMarkup?: boolean;
  draft: Draft;
  setDraft: (d: Draft) => void;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const draftMult = parseFloat(draft.multiplier) || 0;

  return (
    <tr className="border-b bg-muted/30 last:border-0">
      <td className="px-4 py-2">
        <Input
          type="number"
          step="0.01"
          value={draft.min}
          onChange={(e) => setDraft({ ...draft, min: e.target.value })}
          className="h-8 w-24"
          placeholder={unit === "$" ? "0.00" : "0"}
        />
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          step="0.01"
          value={draft.max}
          onChange={(e) => setDraft({ ...draft, max: e.target.value })}
          className="h-8 w-24"
          placeholder="Maximum"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          step="0.01"
          value={draft.multiplier}
          onChange={(e) => setDraft({ ...draft, multiplier: e.target.value })}
          className="h-8 w-20 text-right"
          placeholder="4.00"
        />
      </td>
      {showMarkup ? (
        <td className="px-4 py-2 text-right text-xs text-muted-foreground">
          {draftMult > 0 ? markupPct(draftMult) : ""}
        </td>
      ) : null}
      <td className="px-4 py-2">
        <div className="flex justify-end gap-1">
          <button
            onClick={onSave}
            disabled={pending}
            aria-label="Save tier"
            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </button>
          <button
            onClick={onCancel}
            disabled={pending}
            aria-label="Cancel"
            className="rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
