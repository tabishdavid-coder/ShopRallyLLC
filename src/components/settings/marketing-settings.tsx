"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check, Loader2, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveLeadSources } from "@/server/actions/marketing";

const inputCls = "flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function MarketingSettings({ initial }: { initial: string[] }) {
  const [rows, setRows] = useState<string[]>(initial.length ? initial : [""]);
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
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Lead Sources</h2>
        <p className="text-sm text-muted-foreground">
          The marketing-source options shown when creating a repair order. Changes flow straight to the
          Create-RO &ldquo;Marketing Source&rdquo; dropdown.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col text-muted-foreground">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="leading-none disabled:opacity-30" aria-label="Move up">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="leading-none disabled:opacity-30" aria-label="Move down">▼</button>
            </div>
            <GripVertical className="size-4 text-muted-foreground/50" />
            <input className={inputCls} value={r} onChange={(e) => set(i, e.target.value)} placeholder="Lead source name" />
            <button onClick={() => remove(i)} aria-label="Remove" className="rounded-md p-1 text-muted-foreground hover:text-destructive">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
        <Button variant="outline" size="sm" onClick={add}><Plus className="size-4" /> Add Lead Source</Button>
        <Button size="sm" onClick={save} disabled={pending} className={cn(pending && "opacity-80")}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  );
}
