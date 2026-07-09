"use client";

import { PLANS, annualSavingsPercent } from "@/lib/plans";
import { cn } from "@/lib/utils";

type PricingBillingToggleProps = {
  annual: boolean;
  onAnnualChange: (annual: boolean) => void;
  className?: string;
  /** Show savings badge (uses the best annual discount across plans). */
  showSavings?: boolean;
};

export function PricingBillingToggle({
  annual,
  onAnnualChange,
  className,
  showSavings = true,
}: PricingBillingToggleProps) {
  const savingsPct = Math.max(
    ...Object.values(PLANS).map((plan) => annualSavingsPercent(plan)),
  );

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="group"
      aria-label="Billing interval"
    >
      <div className="inline-flex items-center gap-1 rounded-full border border-brand-navy/15 bg-white p-1 shadow-sm">
        <button
          type="button"
          aria-pressed={!annual}
          onClick={() => onAnnualChange(false)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            !annual ? "bg-brand-navy text-white shadow-sm" : "text-slate-500 hover:text-brand-navy",
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={annual}
          onClick={() => onAnnualChange(true)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            annual ? "bg-brand-navy text-white shadow-sm" : "text-slate-500 hover:text-brand-navy",
          )}
        >
          Annual
        </button>
      </div>
      {showSavings ? (
        <p className="text-xs font-medium text-slate-600">
          {annual ? (
            <>
              <span className="text-brand-red">Save up to {savingsPct}%</span> · billed annually per location
            </>
          ) : (
            <>Month-to-month · cancel anytime</>
          )}
        </p>
      ) : null}
    </div>
  );
}
