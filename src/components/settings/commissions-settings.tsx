"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateCommissions } from "@/server/actions/shop";
import type { Commissions } from "@/lib/commissions";

const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function CommissionsSettings({ initial }: { initial: Commissions }) {
  // Edit as whole percents; store as bps.
  const [laborPct, setLaborPct] = useState(initial.laborBps / 100);
  const [partsPct, setPartsPct] = useState(initial.partsBps / 100);
  const [basis, setBasis] = useState<Commissions["basis"]>(initial.basis);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateCommissions({
        laborBps: Math.round(laborPct * 100),
        partsBps: Math.round(partsPct * 100),
        basis,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Commissions</h2>
        <p className="text-sm text-muted-foreground">
          Default commission rates applied to labor and parts. These feed the technician/advisor commission report.
        </p>
      </div>

      <div className="mb-4 max-w-xs">
        <label className="mb-1 block text-sm font-medium">Calculate commission on</label>
        <select className={`${inputCls} w-full`} value={basis} onChange={(e) => setBasis(e.target.value as Commissions["basis"])}>
          <option value="GROSS_PROFIT">Gross profit</option>
          <option value="SALE">Sale price</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Labor commission">
          <div className="flex items-center gap-1">
            <input type="number" min={0} step="0.1" className={`${inputCls} w-full`} value={laborPct} onChange={(e) => setLaborPct(Number(e.target.value))} />
            <span className="text-muted-foreground">%</span>
          </div>
        </Field>
        <Field label="Parts commission">
          <div className="flex items-center gap-1">
            <input type="number" min={0} step="0.1" className={`${inputCls} w-full`} value={partsPct} onChange={(e) => setPartsPct(Number(e.target.value))} />
            <span className="text-muted-foreground">%</span>
          </div>
        </Field>
      </div>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
