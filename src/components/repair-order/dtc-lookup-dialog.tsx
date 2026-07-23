"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";
import { lookupCarMdDtc } from "@/server/actions/carmd";
import type { CarMdDtcLookupResult } from "@/lib/carmd-types";

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase outline-none focus:ring-1 focus:ring-ring";

type Props = {
  roId: string;
  /** Shown in helper text — no API call until user clicks Look up. */
  vehicleLabel?: string | null;
  mileage?: number | null;
  compact?: boolean;
};

export function DtcLookupDialog({ roId, vehicleLabel, mileage, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CarMdDtcLookupResult | null>(null);
  const [mode, setMode] = useState<"live" | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setResult(null);
    setMode(null);
    setError(null);
  }

  function lookup() {
    reset();
    start(async () => {
      const res = await lookupCarMdDtc({ roId, code });
      if (res.ok) {
        setResult(res.data);
        setMode(res.mode);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCode("");
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={compact ? "h-7 gap-1 px-2 text-xs" : "h-8 gap-1.5"}
        >
          <ScanSearch className={compact ? "size-3" : "size-3.5"} />
          DTC lookup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-brand-navy">CarMD DTC lookup</DialogTitle>
          <DialogDescription>
            Look up a check-engine or ABS code for plain-English context and repair hints. Runs only when you
            click Look up — not on page load.
            {vehicleLabel ? (
              <>
                {" "}
                Vehicle: <span className="font-medium text-foreground">{vehicleLabel}</span>
                {mileage != null ? ` · ${mileage.toLocaleString()} mi` : ""}.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Diagnostic trouble code</label>
            <input
              className={inputCls}
              value={code}
              placeholder="P0420"
              maxLength={12}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {result ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <div className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-navy">
                  {result.code}
                  {mode === "mock" ? (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      Mock
                    </span>
                  ) : null}
                </div>
                {result.title ? <p className="mt-1 font-medium text-foreground">{result.title}</p> : null}
                {result.definition ? (
                  <p className="mt-1 text-muted-foreground">{result.definition}</p>
                ) : null}
              </div>

              {result.repairs.length ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Likely repairs
                  </p>
                  {result.repairs.map((r, i) => (
                    <div key={i} className="rounded-md border bg-card p-2.5">
                      <p className="font-medium">{r.description}</p>
                      {r.urgencyDescription ? (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-800">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                          {r.urgencyDescription}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {r.laborHours != null ? <span>{r.laborHours} hr labor</span> : null}
                        {r.totalCostCents != null ? (
                          <span className="font-medium text-foreground">
                            Est. {formatCents(r.totalCostCents)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={lookup} disabled={pending || code.trim().length < 4}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Look up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
