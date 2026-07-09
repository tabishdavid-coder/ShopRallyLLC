"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateTransparency } from "@/server/actions/shop";
import { TRANSPARENCY_FIELDS, type DocTransparency, type Transparency } from "@/lib/transparency";

export function TransparencySettings({
  initial,
  showHeading = true,
}: {
  initial: Transparency;
  showHeading?: boolean;
}) {
  const [t, setT] = useState<Transparency>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (doc: keyof Transparency, key: keyof DocTransparency) =>
    setT((p) => ({ ...p, [doc]: { ...p[doc], [key]: !p[doc][key] } }));

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateTransparency(t);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="max-w-2xl">
      {showHeading ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Estimate &amp; Invoice Transparency</h2>
          <p className="text-sm text-muted-foreground">
            Choose which line-item details the customer sees on the printed estimate vs. the invoice.
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Choose which line-item details the customer sees on the printed estimate vs. the invoice.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-4 py-2">Show on customer documents</th>
              <th className="w-28 px-3 py-2 text-center">Estimate</th>
              <th className="w-28 px-3 py-2 text-center">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {TRANSPARENCY_FIELDS.map((f) => (
              <tr key={f.key} className="border-b last:border-0">
                <td className="px-4 py-2.5">{f.label}</td>
                <td className="px-3 py-2.5 text-center">
                  <input type="checkbox" checked={t.estimate[f.key]} onChange={() => toggle("estimate", f.key)} className="size-4 accent-primary" />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input type="checkbox" checked={t.invoice[f.key]} onChange={() => toggle("invoice", f.key)} className="size-4 accent-primary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Turning off &ldquo;Itemized line prices&rdquo; shows a single job total instead of each line&rsquo;s price.
      </p>

      <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
        {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
        {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
        </Button>
      </div>
    </div>
  );
}
