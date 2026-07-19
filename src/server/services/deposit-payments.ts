import "server-only";

import { PaymentMethod } from "@/generated/prisma";
import { ensureInvoiceForRepairOrder } from "@/server/invoice";
import { recordInvoicePayment } from "@/server/services/invoice-payments";

/**
 * Apply a paid deposit toward the RO invoice balance (creates invoice if needed).
 * Best-effort — deposit status is already PAID; callers keep deposit UX even if this fails.
 */
export async function applyDepositTowardInvoice(opts: {
  shopId: string;
  repairOrderId: string;
  amountCents: number;
  method: PaymentMethod;
  depositRequestId: string;
  reference?: string | null;
  stripePaymentIntentId?: string | null;
  auditActor?: { userId: string; email: string } | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const invoice = await ensureInvoiceForRepairOrder(opts.repairOrderId, opts.shopId, {
    forPaymentCollection: true,
  });
  if (!invoice) {
    return { ok: false, error: "Could not create invoice for deposit." };
  }

  const res = await recordInvoicePayment({
    invoiceId: invoice.id,
    shopId: opts.shopId,
    amountCents: opts.amountCents,
    method: opts.method,
    reference: opts.reference ?? `Deposit ${opts.depositRequestId}`,
    stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
    auditActor: opts.auditActor,
  });

  if (!res.ok) return res;
  return { ok: true };
}
