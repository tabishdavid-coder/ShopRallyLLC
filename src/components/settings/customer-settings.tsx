"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Tag, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveCustomerTags, updateCustomerDefaults } from "@/server/actions/customer-settings";
import { SettingsHero, SettingsEmptyState } from "@/components/settings/settings-hero";

const inputCls = "flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

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
    <div className="space-y-5">
      <SettingsHero
        icon={Users}
        title="Customers"
        description="Customer tags and defaults that apply across the CRM — tags appear when adding a customer."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
                <Tag className="size-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold">Customer tags</h3>
                <p className="text-sm text-muted-foreground">Label customers for filtering and reporting.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={addTag} className="shrink-0 gap-1.5">
              <Plus className="size-4" /> Add tag
            </Button>
          </div>

          {tags.length === 0 ? (
            <SettingsEmptyState
              icon={Tag}
              title="No tags yet"
              description="Add tags like VIP or Fleet to segment customers when adding or editing them."
            />
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border">
              {tags.map((t, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <input
                    className={inputCls}
                    value={t}
                    onChange={(e) => setTag(i, e.target.value)}
                    placeholder="Tag name (e.g. VIP, Fleet)"
                  />
                  <button
                    onClick={() => removeTag(i)}
                    aria-label="Remove"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Defaults</h2>
          <label className="mt-3 flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              New customers default to marketing opt-in
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Applies to SMS &amp; email campaigns unless overridden per customer.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 rounded-lg border bg-card px-4 py-3">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
        </Button>
      </div>
    </div>
  );
}
