import { formatCents } from "@/lib/format";
import {
  computePricingMetrics,
  formatPctOneDecimal,
} from "@/lib/pricing-display";
import { cn } from "@/lib/utils";

type PricingGpSummaryProps = {
  costCents: number;
  retailCents: number;
  className?: string;
};

/** Read-only GP / margin / markup strip for inventory and tire pricing forms. */
export function PricingGpSummary({
  costCents,
  retailCents,
  className,
}: PricingGpSummaryProps) {
  const { gpCents, marginPct, markupPct } = computePricingMetrics(
    costCents,
    retailCents,
  );

  return (
    <div
      className={cn(
        "flex min-h-9 flex-col justify-center rounded-md border border-brand-light/60 bg-brand-light/20 px-2.5 py-1",
        className,
      )}
      title={
        marginPct != null
          ? `Gross profit ${formatCents(gpCents)} · Margin ${formatPctOneDecimal(marginPct)}% on retail${
              markupPct != null
                ? ` · Markup ${formatPctOneDecimal(markupPct)}% on cost`
                : ""
            }`
          : undefined
      }
    >
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          gpCents < 0 ? "text-brand-red" : "text-brand-navy",
        )}
      >
        {formatCents(gpCents)}
      </span>
      {marginPct != null ? (
        <span className="text-[10px] font-medium leading-tight text-muted-foreground">
          Margin {formatPctOneDecimal(marginPct)}% on retail
          {markupPct != null
            ? ` · Markup ${formatPctOneDecimal(markupPct)}% on cost`
            : null}
        </span>
      ) : null}
    </div>
  );
}
