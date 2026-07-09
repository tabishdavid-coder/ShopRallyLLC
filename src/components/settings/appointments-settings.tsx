"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateAppointments } from "@/server/actions/shop";

const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function AppointmentsSettings({
  initial,
  timezone,
}: {
  initial: { apptDayStart: string; apptDayEnd: string; apptDefaultDurationMins: number };
  timezone: string;
}) {
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateAppointments(f);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <p className="text-sm text-muted-foreground">
          Set your shop hours and the default length for new appointments. These drive the scheduling grid.
          Shop timezone: <span className="font-mono text-xs">{timezone}</span> (from your shop address).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Day start">
          <input type="time" className={inputCls} value={f.apptDayStart} onChange={(e) => setF({ ...f, apptDayStart: e.target.value })} />
        </Field>
        <Field label="Day end">
          <input type="time" className={inputCls} value={f.apptDayEnd} onChange={(e) => setF({ ...f, apptDayEnd: e.target.value })} />
        </Field>
        <Field label="Default duration (min)">
          <input type="number" min={5} step={5} className={inputCls} value={f.apptDefaultDurationMins} onChange={(e) => setF({ ...f, apptDefaultDurationMins: Number(e.target.value) })} />
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
