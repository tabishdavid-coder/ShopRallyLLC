import type { ReactNode } from "react";

import { formatCents } from "@/lib/format";
import type { NamedFeeLine } from "@/lib/ro-totals";

type RowProps = { label: string; value: string; accent?: boolean };

/** Customer-facing fee breakdown — one named line, or each fee listed separately. */
export function CustomerFeeRows({
  fees,
  Row,
}: {
  fees: NamedFeeLine[];
  Row: (props: RowProps) => ReactNode;
}) {
  if (fees.length === 0) return null;

  if (fees.length === 1) {
    return <Row label={`Fees · ${fees[0].name}`} value={formatCents(fees[0].amountCents)} />;
  }

  return (
    <>
      {fees.map((fee, i) => (
        <Row key={`${fee.name}-${i}`} label={fee.name} value={formatCents(fee.amountCents)} />
      ))}
    </>
  );
}
