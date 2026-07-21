import { CustomerFeeRows } from "@/components/customer/customer-fee-rows";
import { formatCents } from "@/lib/format";
import type { NamedFeeLine } from "@/lib/ro-totals";

export type ApprovalTotals = {
  laborSubtotalCents: number;
  partsSubtotalCents: number;
  shopSuppliesCents: number;
  feeLines: NamedFeeLine[];
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/** Labor/parts/fees/tax breakdown for public estimate approval pages. */
export function ApprovalTotalsBlock({
  totals,
  estimateTotals,
  alreadyApproved,
  isPartialApproval,
  className = "",
}: {
  totals: ApprovalTotals;
  estimateTotals?: ApprovalTotals | null;
  alreadyApproved?: boolean;
  isPartialApproval?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 text-sm ${className}`}>
      <Row label="Labor" value={formatCents(totals.laborSubtotalCents)} />
      <Row label="Parts" value={formatCents(totals.partsSubtotalCents)} />
      {totals.shopSuppliesCents > 0 ? (
        <Row label="Shop supplies" value={formatCents(totals.shopSuppliesCents)} />
      ) : null}
      <CustomerFeeRows fees={totals.feeLines} Row={Row} />
      {totals.discountCents > 0 ? (
        <Row label="Discounts" value={formatCents(-totals.discountCents)} />
      ) : null}
      <Row label="Tax" value={formatCents(totals.taxCents)} />
      <div className="flex justify-between border-t border-brand-navy/10 pt-2 text-base font-bold text-brand-navy">
        <span>{alreadyApproved ? "Authorized total" : "Total"}</span>
        <span className="tabular-nums">{formatCents(totals.totalCents)}</span>
      </div>
      {isPartialApproval && estimateTotals ? (
        <p className="pt-1 text-xs text-muted-foreground">
          Full estimate was {formatCents(estimateTotals.totalCents)} — declined jobs are excluded from
          your authorized total.
        </p>
      ) : null}
    </div>
  );
}
