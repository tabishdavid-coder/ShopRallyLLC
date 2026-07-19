/** Shared payment status labels for RO / invoice UI. */
export type PaymentDisplayStatus = "unpaid" | "partial" | "paid";

export type PaidDepositInput = {
  id?: string;
  status: string;
  amountCents: number;
  paidAt?: Date | string | null;
  paidMethod?: string | null;
};

export type InvoicePaymentInput = {
  amountCents: number;
  reference?: string | null;
};

/** True when a PAID deposit already has a matching invoice Payment row. */
export function isDepositAppliedInPayments(
  deposit: PaidDepositInput | null | undefined,
  payments: InvoicePaymentInput[] | null | undefined,
): boolean {
  if (!deposit || deposit.status !== "PAID") return false;
  const rows = payments ?? [];
  if (deposit.id) {
    const needle = deposit.id;
    if (rows.some((p) => p.reference?.includes(needle))) return true;
  }
  return rows.some(
    (p) =>
      p.reference?.toLowerCase().includes("deposit") === true &&
      p.amountCents === deposit.amountCents,
  );
}

/**
 * Paid-to-date for MoneyCard / estimate rail / Record payment panel.
 * Sums invoice Payment rows and adds any PAID deposit not yet applied to the invoice.
 */
export function sumPaidCents(opts: {
  payments?: InvoicePaymentInput[] | null;
  deposit?: PaidDepositInput | null;
}): number {
  const fromPayments = opts.payments?.reduce((s, p) => s + p.amountCents, 0) ?? 0;
  const deposit = opts.deposit;
  if (!deposit || deposit.status !== "PAID") return fromPayments;
  if (isDepositAppliedInPayments(deposit, opts.payments)) return fromPayments;
  return fromPayments + deposit.amountCents;
}

/**
 * Balance due for payment UI — prefer invoice.balance when in sync;
 * when a paid deposit is orphaned (not on the invoice), derive from total − paid.
 */
export function balanceDueCents(opts: {
  totalCents: number;
  payments?: InvoicePaymentInput[] | null;
  deposit?: PaidDepositInput | null;
  invoiceBalanceCents?: number | null;
}): number {
  const paidCents = sumPaidCents(opts);
  const computed = Math.max(0, opts.totalCents - paidCents);
  const fromPaymentsOnly = opts.payments?.reduce((s, p) => s + p.amountCents, 0) ?? 0;
  const orphanDeposit = paidCents > fromPaymentsOnly;

  if (orphanDeposit) return computed;
  if (opts.invoiceBalanceCents != null && (opts.payments?.length ?? 0) > 0) {
    return Math.max(0, opts.invoiceBalanceCents);
  }
  return computed;
}

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
