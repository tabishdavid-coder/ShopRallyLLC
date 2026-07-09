"use client";

import { useState, useTransition } from "react";
import { Check, CircleDashed, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveVendorIntegration, testVendorConnection } from "@/server/actions/vendor-integrations";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

type Props = {
  vendorKey: "partstech" | "weldon" | "carfax" | "vin-decoder";
  initial: Record<string, unknown>;
  fields: FieldDef[];
  extra?: React.ReactNode;
  roLink?: { label: string; href: string };
};

type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "password" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
};

export function VendorConnectForm({ vendorKey, initial, fields, extra, roLink }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, String(initial[f.name] ?? "")])),
  );
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function save() {
    setError(null);
    setSaved(false);
    setTestMsg(null);
    start(async () => {
      const payload: Record<string, string> = {};
      for (const f of fields) payload[f.name] = form[f.name] ?? "";
      const res = await saveVendorIntegration(vendorKey, payload);
      if (res.ok) {
        setSaved(true);
        if (res.message) setTestMsg(res.message);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  function testConnection() {
    setError(null);
    setTestMsg(null);
    start(async () => {
      const res = await testVendorConnection(vendorKey);
      if (res.ok) setTestMsg(res.message ?? "OK");
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h3 className="font-medium">Shop credentials</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.type === "select" ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-sm font-medium">{f.label}</label>
              {f.type === "select" ? (
                <select
                  className={inputCls}
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type ?? "text"}
                  className={inputCls}
                  value={form[f.name] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
              {f.hint ? <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p> : null}
            </div>
          ))}
        </div>
        {extra}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
          {saved ? (
            <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
              <Check className="size-3.5" /> Saved
            </span>
          ) : null}
          {testMsg && !error ? (
            <span className="mr-auto max-w-md text-xs text-muted-foreground">{testMsg}</span>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={testConnection} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CircleDashed className="size-4" />}
            Test connection
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </section>

      {roLink ? (
        <p className="text-sm text-muted-foreground">
          When connected, use{" "}
          <a href={roLink.href} className="font-medium text-brand-navy hover:underline">
            {roLink.label}
          </a>{" "}
          on repair orders.
        </p>
      ) : null}
    </div>
  );
}
