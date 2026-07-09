"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  VEHICLE_CLASSES,
  VEHICLE_CLASS_LABELS,
  computeMonthlyFromPayInFull,
  planHasPricing,
  type MaintenancePlanPricingInput,
} from "@/lib/maintenance-programs";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import { updateMaintenancePlanPricing } from "@/server/actions/maintenance-programs";

type Props = {
  canEdit: boolean;
  planId: string;
  planName: string;
  initial: MaintenancePlanPricingInput & { active: boolean };
};

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function centsFromDollars(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function MaintenancePricingPanel({ canEdit, planId, planName, initial }: Props) {
  const [retail, setRetail] = useState(dollarsFromCents(initial.retailCents));
  const [payInFull, setPayInFull] = useState(
    dollarsFromCents(initial.payInFullCents ?? initial.annualCents),
  );
  const [monthly, setMonthly] = useState(dollarsFromCents(initial.monthlyCents));
  const [monthlyManual, setMonthlyManual] = useState(false);
  const [monthlyTerm, setMonthlyTerm] = useState(String(initial.monthlyTermMonths ?? 12));
  const [useClassPricing, setUseClassPricing] = useState(initial.useClassPricing);
  const [publish, setPublish] = useState(initial.active);
  const [classPrices, setClassPrices] = useState(initial.classPrices);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const termMonths = parseInt(monthlyTerm, 10) || 12;
  const payInFullCents = centsFromDollars(payInFull);

  const autoMonthlyCents = useMemo(() => {
    if (payInFullCents == null || payInFullCents <= 0) return null;
    return computeMonthlyFromPayInFull(payInFullCents, termMonths);
  }, [payInFullCents, termMonths]);

  useEffect(() => {
    if (!monthlyManual && autoMonthlyCents != null) {
      setMonthly(dollarsFromCents(autoMonthlyCents));
    }
  }, [autoMonthlyCents, monthlyManual]);

  function handlePayInFullChange(value: string) {
    setPayInFull(value);
    if (!monthlyManual) {
      const cents = centsFromDollars(value);
      if (cents != null && cents > 0) {
        setMonthly(dollarsFromCents(computeMonthlyFromPayInFull(cents, termMonths)));
      }
    }
  }

  function handleMonthlyTermChange(value: string) {
    setMonthlyTerm(value);
    if (!monthlyManual && payInFullCents != null && payInFullCents > 0) {
      const term = parseInt(value, 10) || 12;
      setMonthly(dollarsFromCents(computeMonthlyFromPayInFull(payInFullCents, term)));
    }
  }

  function recalculateMonthly() {
    if (autoMonthlyCents != null) {
      setMonthly(dollarsFromCents(autoMonthlyCents));
      setMonthlyManual(false);
    }
  }

  function save() {
    if (!canEdit) return;
    setError(null);
    setSaved(false);
    start(async () => {
      const payload: MaintenancePlanPricingInput = {
        retailCents: centsFromDollars(retail),
        payInFullCents: centsFromDollars(payInFull),
        monthlyCents: centsFromDollars(monthly),
        monthlyTermMonths: monthly.trim() ? termMonths : null,
        useClassPricing,
        classPrices: useClassPricing ? classPrices : [],
        publish,
      };

      if (!planHasPricing({
        payInFullCents: payload.payInFullCents ?? null,
        monthlyCents: payload.monthlyCents ?? null,
      })) {
        setError("Enter at least one price: pay in full or monthly.");
        return;
      }

      const res = await updateMaintenancePlanPricing(planId, payload);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error);
      }
    });
  }

  function updateSurcharge(vehicleClass: MaintenanceVehicleClass, dollars: string) {
    setClassPrices((rows) =>
      rows.map((r) =>
        r.vehicleClass === vehicleClass
          ? { ...r, surchargeCents: centsFromDollars(dollars) }
          : r,
      ),
    );
  }

  return (
    <section className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Customer pricing</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set what customers pay for <span className="font-medium text-foreground">{planName}</span>.
          Pay in full is the base price; monthly subscribers pay 15% more over the term.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Compare-at / retail ($)</Label>
          <Input
            value={retail}
            onChange={(e) => setRetail(e.target.value)}
            disabled={!canEdit}
            placeholder="Optional strikethrough price"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">Separate from the 15% pay-in-full savings.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Pay in full ($)</Label>
          <Input
            value={payInFull}
            onChange={(e) => handlePayInFullChange(e.target.value)}
            disabled={!canEdit}
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground">
            Full plan price upfront — customers save 15% vs monthly.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Monthly ($)</Label>
          <Input
            value={monthly}
            onChange={(e) => {
              setMonthly(e.target.value);
              setMonthlyManual(true);
            }}
            disabled={!canEdit}
            className={inputCls}
          />
          {autoMonthlyCents != null ? (
            <p className="text-xs text-muted-foreground">
              {monthlyManual ? (
                <>
                  Auto: ${(autoMonthlyCents / 100).toFixed(2)}/mo (15% premium vs pay in full).{" "}
                  {canEdit ? (
                    <button
                      type="button"
                      className="text-brand-navy underline"
                      onClick={recalculateMonthly}
                    >
                      Recalculate from pay in full
                    </button>
                  ) : null}
                </>
              ) : (
                <>Auto-calculated — monthly subscribers pay 15% more over the term.</>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Enter pay in full to auto-calculate monthly pricing.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Monthly term (months)</Label>
          <Input
            value={monthlyTerm}
            onChange={(e) => handleMonthlyTermChange(e.target.value)}
            disabled={!canEdit}
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={useClassPricing}
          onCheckedChange={(v) => setUseClassPricing(v === true)}
          disabled={!canEdit}
        />
        Vehicle-class surcharges (SUV, heavy duty, etc.)
      </label>

      {useClassPricing ? (
        <div className="rounded-md border overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Class</th>
                <th className="px-3 py-2 text-left font-medium">Surcharge ($)</th>
              </tr>
            </thead>
            <tbody>
              {(classPrices.length
                ? classPrices
                : VEHICLE_CLASSES.map((vehicleClass) => ({
                    vehicleClass,
                    surchargeCents: null,
                  }))
              ).map((row) => (
                <tr key={row.vehicleClass} className="border-t">
                  <td className="px-3 py-2">{VEHICLE_CLASS_LABELS[row.vehicleClass]}</td>
                  <td className="px-3 py-2">
                    <Input
                      value={dollarsFromCents(row.surchargeCents)}
                      onChange={(e) => updateSurcharge(row.vehicleClass, e.target.value)}
                      disabled={!canEdit}
                      className={inputCls}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm rounded-md border border-green-200 bg-green-50/80 p-3">
        <Checkbox
          checked={publish}
          onCheckedChange={(v) => setPublish(v === true)}
          disabled={!canEdit}
        />
        <span>
          <span className="font-medium">Publish on public plans page</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            Requires at least one customer price above.
          </span>
        </span>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-green-700">Pricing saved.</p> : null}

      {canEdit ? (
        <Button onClick={save} disabled={pending} className="bg-brand-navy">
          {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
          Save pricing
        </Button>
      ) : null}
    </section>
  );
}
