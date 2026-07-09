"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addDiscount } from "@/server/actions/adjustments";

type Method = "PERCENT" | "FIXED";
type Base = "LABOR" | "PARTS" | "LABOR_PARTS";

export function ApplyDiscountButton({
  repairOrderId,
  disabled,
  compact = false,
}: {
  repairOrderId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [method, setMethod] = useState<Method>("FIXED");
  const [base, setBase] = useState<Base>("LABOR_PARTS");
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setMethod("FIXED");
    setBase("LABOR_PARTS");
    setAmountStr("");
    setError(null);
  }

  function apply() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a discount name.");
      return;
    }
    const n = Number.parseFloat(amountStr.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid discount amount.");
      return;
    }

    const amount =
      method === "PERCENT" ? Math.round(n * 100) : Math.round(n * 100);

    setError(null);
    start(async () => {
      const res = await addDiscount(repairOrderId, { name: trimmed, method, base, amount });
      if (res.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-brand-navy/30 px-2 text-[11px] font-semibold text-brand-navy hover:bg-brand-light/15 disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex w-full items-center justify-center gap-2 rounded-md border border-brand-navy/30 px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-light/15 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <BadgePercent className={compact ? "size-3.5" : "size-4"} aria-hidden />
        {compact ? "Discount" : "Apply Discount"}
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer discount" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Type</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as Method)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="FIXED">Fixed ($)</option>
                  <option value="PERCENT">Percent (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Apply to</label>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value as Base)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="LABOR_PARTS">Labor + Parts</option>
                  <option value="LABOR">Labor only</option>
                  <option value="PARTS">Parts only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">
                {method === "PERCENT" ? "Percent" : "Amount"}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {method === "PERCENT" ? "%" : "$"}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="pl-7 tabular-nums"
                  placeholder={method === "PERCENT" ? "10" : "25.00"}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button className="bg-brand-navy hover:bg-brand-navy/90" onClick={apply} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Apply discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
