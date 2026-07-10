"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, GripVertical, Loader2, Megaphone, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveLeadSources } from "@/server/actions/marketing";
import { SettingsHero, SettingsEmptyState } from "@/components/settings/settings-hero";

const inputCls = "flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

export function MarketingSettings({ initial }: { initial: string[] }) {
  const [rows, setRows] = useState<string[]>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (i: number, v: string) => setRows((rs) => rs.map((r, idx) => (idx === i ? v : r)));
  const add = () => setRows((rs) => [...rs, ""]);
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveLeadSources(rows);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <SettingsHero
        icon={Megaphone}
        title="Lead Sources"
        description={`The marketing-source options shown when creating a repair order. ${rows.length} source${rows.length === 1 ? "" : "s"} configured.`}
      />

      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Marketing sources</h3>
            <p className="text-sm text-muted-foreground">
              Drag to reorder — changes flow straight to the Create-RO &ldquo;Marketing Source&rdquo; dropdown.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={add} className="shrink-0 gap-1.5">
            <Plus className="size-4" /> Add source
          </Button>
        </div>

        {rows.length === 0 ? (
          <SettingsEmptyState
            icon={Megaphone}
            title="No lead sources yet"
            description="Add sources like Google, Referral, or Walk-in to track where your customers come from."
          />
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <GripVertical className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
                <input
                  className={inputCls}
                  value={r}
                  onChange={(e) => set(i, e.target.value)}
                  placeholder="Lead source name"
                />
                <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-30">
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down" className="rounded p-1 hover:bg-accent hover:text-foreground disabled:opacity-30">
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(i)} aria-label="Remove" className="rounded p-1 hover:bg-destructive/10 hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
          {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
          {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
          <Button size="sm" onClick={save} disabled={pending} className={cn(pending && "opacity-80")}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>
    </div>
  );
}
