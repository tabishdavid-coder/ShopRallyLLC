/** Shared payment status labels for RO / invoice UI. */
export type PaymentDisplayStatus = "unpaid" | "partial" | "paid";

export function paymentDisplayStatus(
  paidCents: number,
  totalCents: number,
): PaymentDisplayStatus {
  if (totalCents > 0 && paidCents >= totalCents) return "paid";
  if (paidCents > 0) return "partial";
  return "unpaid";
}

export function paymentStatusBadge(paidCents: number, totalCents: number) {
  const status = paymentDisplayStatus(paidCents, totalCents);
  if (status === "paid") {
    return { status, label: "Paid", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800" };
  }
  if (status === "partial") {
    return { status, label: "Partial paid", className: "border-amber-500/40 bg-amber-500/15 text-amber-900" };
  }
  return { status, label: "Unpaid", className: "border-brand-red/45 bg-brand-red/10 text-brand-red" };
}
