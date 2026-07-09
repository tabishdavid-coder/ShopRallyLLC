"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveCustomerTags, updateCustomerDefaults } from "@/server/actions/customer-settings";

const inputCls = "flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function CustomerSettings({
  initialTags,
  initialDefaultOptIn,
}: {
  initialTags: string[];
  initialDefaultOptIn: boolean;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [optIn, setOptIn] = useState(initialDefaultOptIn);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setTag = (i: number, v: string) => setTags((t) => t.map((x, idx) => (idx === i ? v : x)));
  const addTag = () => setTags((t) => [...t, ""]);
  const removeTag = (i: number) => setTags((t) => t.filter((_, idx) => idx !== i));

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const [a, b] = await Promise.all([saveCustomerTags(tags), updateCustomerDefaults({ defaultMarketingOptIn: optIn })]);
      if (a.ok && b.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError((!a.ok && a.error) || (!b.ok && b.error) || "Save failed.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">Customer tags and defaults. Tags appear when adding a customer.</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Customer Tags</h3>
        <div className="space-y-2">
          {tags.length === 0 ? <p className="text-sm text-muted-foreground">No tags yet.</p> : null}
          {tags.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={inputCls} value={t} onChange={(e) => setTag(i, e.target.value)} placeholder="Tag name (e.g. VIP, Fleet)" />
              <button onClick={() => removeTag(i)} aria-label="Remove" className="rounded-md p-1 text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addTag} className="mt-2"><Plus className="size-4" /> Add Tag</Button>
      </section>

      <section className="border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold">Defaults</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="size-4 accent-primary" />
          New customers default to marketing opt-in
        </label>
      </section>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  );
}
