"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, Percent } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { addDiscount, addFee } from "@/server/actions/adjustments";
import { cn } from "@/lib/utils";

const HERO_BTN =
  "ro-hero-action-btn h-7 gap-1.5 rounded-md border-brand-navy/20 bg-white px-2.5 text-xs font-semibold text-brand-navy shadow-sm hover:border-brand-light/60 hover:bg-brand-light/15";

type Method = "PERCENT" | "FIXED";
type Base = "LABOR" | "PARTS" | "LABOR_PARTS";

export function RoAdjustmentToolbarButton({
  kind,
  roId,
  jobId,
  variant = "default",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: {
  kind: "fee" | "discount";
  roId: string;
  /** When set, adjustment applies to this job instead of the whole RO. */
  jobId?: string;
  variant?: "default" | "hero" | "outline-action";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("FIXED");
  const [base, setBase] = useState<Base>("LABOR_PARTS");
  const [amountStr, setAmountStr] = useState("");
  const [taxable, setTaxable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isFee = kind === "fee";
  const Icon = isFee ? DollarSign : Percent;
  const label = isFee ? "Fee" : "Discount";
  const scopeLabel = jobId ? "Job" : "RO";

  function reset() {
    setName("");
    setMethod("FIXED");
    setBase("LABOR_PARTS");
    setAmountStr("");
    setTaxable(false);
    setError(null);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`Enter a ${label.toLowerCase()} name.`);
      return;
    }
    const n = Number.parseFloat(amountStr.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const amount = method === "PERCENT" ? Math.round(n * 100) : Math.round(n * 100);
    setError(null);
    start(async () => {
      const body = { name: trimmed, method, base, amount };
      const res = isFee
        ? await addFee(roId, { ...body, taxable }, jobId)
        : await addDiscount(roId, body, jobId);
      if (res.ok) {
        setOpen(false);
        reset();
        toast("success", `${label} added`);
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
      }
    });
  }

  return (
    <>
      {!hideTrigger ? (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          variant === "hero"
            ? HERO_BTN
            : variant === "outline-action"
              ? "h-8 gap-1 border-2 border-brand-navy/35 bg-white px-2.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy shadow-none hover:bg-brand-light/15"
              : "h-9 gap-1.5 border-brand-navy/20 text-brand-navy hover:bg-brand-light/20",
        )}
        onClick={() => setOpen(true)}
      >
        <Icon className={cn("size-4", variant === "hero" && "size-3.5 text-brand-light")} />
        {kind === "discount" && variant === "hero" ? "Discount" : label}
      </Button>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {scopeLabel} {label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor={`${kind}-name`}>Name</Label>
              <Input
                id={`${kind}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isFee ? "Shop supplies fee" : "Customer discount"}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`${kind}-method`}>Type</Label>
                <select
                  id={`${kind}-method`}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="FIXED">Fixed ($)</option>
                  <option value="PERCENT">Percent (%)</option>
                </select>
              </div>
              <div>
                <Label htmlFor={`${kind}-base`}>Apply to</Label>
                <select
                  id={`${kind}-base`}
                  value={base}
                  onChange={(e) => setBase(e.target.value as Base)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="LABOR_PARTS">Labor + Parts</option>
                  <option value="LABOR">Labor only</option>
                  <option value="PARTS">Parts only</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor={`${kind}-amount`}>{method === "PERCENT" ? "Percent" : "Amount"}</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {method === "PERCENT" ? "%" : "$"}
                </span>
                <Input
                  id={`${kind}-amount`}
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="pl-7 tabular-nums"
                  placeholder={method === "PERCENT" ? "10" : "25.00"}
                />
              </div>
            </div>
            {isFee ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taxable}
                  onChange={(e) => setTaxable(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                Taxable fee
              </label>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button className="bg-brand-navy hover:bg-brand-navy/90" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Add {label.toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
