"use client";

import { useEffect, useState, useTransition } from "react";

import { useRoMileageSave } from "@/components/repair-order/ro-sidebar-field-dialogs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function fmtMiles(n: number) {
  return `${n.toLocaleString("en-US")} mi`;
}

function parseMiles(text: string): number | null | "invalid" {
  if (!text.trim()) return null;
  const n = Number(text.replace(/\D/g, ""));
  if (!Number.isInteger(n) || n < 0) return "invalid";
  return n;
}

/** Inline odometer in/out — compact header control or full-width strip. */
export function EstimateLabOdometerBar({
  roId,
  mileageIn,
  mileageOut,
  odometerNotWorking,
  canEdit,
  reqOdometer = false,
  compact = false,
  className,
}: {
  roId: string;
  mileageIn: number | null;
  mileageOut: number | null;
  odometerNotWorking: boolean;
  canEdit: boolean;
  reqOdometer?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const save = useRoMileageSave(roId);
  const [inText, setInText] = useState(mileageIn != null ? String(mileageIn) : "");
  const [outText, setOutText] = useState(mileageOut != null ? String(mileageOut) : "");
  const [notWorking, setNotWorking] = useState(odometerNotWorking);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setInText(mileageIn != null ? String(mileageIn) : "");
    setOutText(mileageOut != null ? String(mileageOut) : "");
    setNotWorking(odometerNotWorking);
  }, [mileageIn, mileageOut, odometerNotWorking]);

  function saveIn() {
    if (!canEdit || pending) return;
    setError(null);

    if (notWorking) return;

    const parsed = parseMiles(inText);
    if (parsed === "invalid") {
      setError("Enter a valid odometer reading.");
      return;
    }
    if (reqOdometer && parsed == null) {
      setError("Odometer in is required.");
      return;
    }
    if (parsed === mileageIn) return;

    startTransition(async () => {
      const res = await save({ mileageIn: parsed, odometerNotWorking: notWorking });
      if (!res.ok) setError(res.error ?? "Could not save odometer in.");
    });
  }

  function saveOut() {
    if (!canEdit || pending) return;
    setError(null);

    const parsed = parseMiles(outText);
    if (parsed === "invalid") {
      setError("Enter a valid odometer reading.");
      return;
    }
    if (parsed === mileageOut) return;

    startTransition(async () => {
      const res = await save({ mileageOut: parsed });
      if (!res.ok) setError(res.error ?? "Could not save odometer out.");
    });
  }

  function onNotWorkingChange(checked: boolean) {
    if (!canEdit || pending) return;
    setError(null);
    setNotWorking(checked);
    if (checked) setInText("");

    startTransition(async () => {
      let nextIn: number | null = null;
      if (!checked) {
        const parsed = parseMiles(inText);
        nextIn = parsed === "invalid" ? null : parsed;
      }
      const res = await save({
        odometerNotWorking: checked,
        mileageIn: nextIn,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not update odometer.");
        setNotWorking(odometerNotWorking);
      }
    });
  }

  const inDisplay = notWorking
    ? "Odometer N/W"
    : mileageIn != null
      ? fmtMiles(mileageIn)
      : "—";

  const outDisplay = mileageOut != null ? fmtMiles(mileageOut) : "—";

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-white/90 px-1.5 py-1 shadow-sm",
          className,
        )}
      >
        <label className="inline-flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>In{reqOdometer && !notWorking ? "*" : ""}</span>
          {canEdit ? (
            <Input
              id="lab-odometer-in"
              value={notWorking ? "" : inText}
              onChange={(e) => setInText(e.target.value.replace(/\D/g, ""))}
              onBlur={saveIn}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder={notWorking ? "N/W" : "Miles"}
              disabled={notWorking || pending}
              inputMode="numeric"
              aria-label="Odometer in"
              className={cn(
                "h-7 w-[4.75rem] px-1.5 text-xs font-medium tabular-nums",
                notWorking && "bg-muted/40 text-muted-foreground",
              )}
            />
          ) : (
            <span className="text-xs font-medium tabular-nums text-foreground">{inDisplay}</span>
          )}
        </label>

        <label className="inline-flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Out</span>
          {canEdit ? (
            <Input
              id="lab-odometer-out"
              value={outText}
              onChange={(e) => setOutText(e.target.value.replace(/\D/g, ""))}
              onBlur={saveOut}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="Miles"
              disabled={pending}
              inputMode="numeric"
              aria-label="Odometer out"
              className="h-7 w-[4.75rem] px-1.5 text-xs font-medium tabular-nums"
            />
          ) : (
            <span className="text-xs font-medium tabular-nums text-foreground">{outDisplay}</span>
          )}
        </label>

        {canEdit ? (
          <label
            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            title="Odometer not working"
          >
            <Checkbox
              checked={notWorking}
              onCheckedChange={(v) => onNotWorkingChange(!!v)}
              disabled={pending}
              aria-label="Odometer not working"
              className="size-3.5"
            />
            N/W
          </label>
        ) : null}

        {error ? <span className="text-[10px] font-medium text-brand-red">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 border-b border-border bg-slate-50/70 px-4 py-2", className)}>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <div className="min-w-[9.5rem] space-y-1">
          <Label
            htmlFor="lab-odometer-in"
            className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            Odometer in{reqOdometer && !notWorking ? " *" : ""}
          </Label>
          {canEdit ? (
            <div className="flex items-center gap-1.5">
              <Input
                id="lab-odometer-in"
                value={notWorking ? "" : inText}
                onChange={(e) => setInText(e.target.value.replace(/\D/g, ""))}
                onBlur={saveIn}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder={notWorking ? "N/W" : "Enter miles"}
                disabled={notWorking || pending}
                inputMode="numeric"
                className={cn(
                  "h-8 max-w-[9rem] tabular-nums text-sm",
                  notWorking && "bg-muted/40 text-muted-foreground",
                )}
              />
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">{inDisplay}</p>
          )}
        </div>

        <div className="min-w-[9.5rem] space-y-1">
          <Label
            htmlFor="lab-odometer-out"
            className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            Odometer out
          </Label>
          {canEdit ? (
            <div className="flex items-center gap-1.5">
              <Input
                id="lab-odometer-out"
                value={outText}
                onChange={(e) => setOutText(e.target.value.replace(/\D/g, ""))}
                onBlur={saveOut}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                placeholder="Enter miles"
                disabled={pending}
                inputMode="numeric"
                className="h-8 max-w-[9rem] tabular-nums text-sm"
              />
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">{outDisplay}</p>
          )}
        </div>

        {canEdit ? (
          <label className="flex cursor-pointer items-center gap-2 pb-1 text-xs text-muted-foreground">
            <Checkbox
              checked={notWorking}
              onCheckedChange={(v) => onNotWorkingChange(!!v)}
              disabled={pending}
            />
            Odometer not working
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-brand-red">{error}</p> : null}
    </div>
  );
}
