import "server-only";

import { DepositRequestStatus, PaymentMethod } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { isDepositAppliedInPayments } from "@/lib/payment-status";
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

/**
 * Backfill invoice Payment rows for PAID deposits that were never applied
 * (e.g. deposit taken before invoice existed, or apply failed best-effort).
 */
export async function reconcileOrphanDepositsForRo(opts: {
  shopId: string;
  repairOrderId: string;
  auditActor?: { userId: string; email: string } | null;
}): Promise<void> {
  const deposits = await prisma.depositRequest.findMany({
    where: {
      shopId: opts.shopId,
      repairOrderId: opts.repairOrderId,
      status: DepositRequestStatus.PAID,
    },
    select: {
      id: true,
      amountCents: true,
      paidMethod: true,
      stripePaymentIntentId: true,
    },
  });
  if (deposits.length === 0) return;

  const invoice = await prisma.invoice.findFirst({
    where: { shopId: opts.shopId, repairOrderId: opts.repairOrderId },
    select: {
      payments: { select: { amountCents: true, reference: true } },
    },
  });

  for (const dep of deposits) {
    if (
      isDepositAppliedInPayments(
        { id: dep.id, status: DepositRequestStatus.PAID, amountCents: dep.amountCents },
        invoice?.payments ?? [],
      )
    ) {
      continue;
    }

    const applied = await applyDepositTowardInvoice({
      shopId: opts.shopId,
      repairOrderId: opts.repairOrderId,
      amountCents: dep.amountCents,
      method: dep.paidMethod ?? PaymentMethod.OTHER,
      depositRequestId: dep.id,
      reference: `Deposit ${dep.id}`,
      stripePaymentIntentId: dep.stripePaymentIntentId,
      auditActor: opts.auditActor ?? null,
    });
    if (!applied.ok) {
      console.error("[deposit] reconcile orphan failed", dep.id, applied.error);
    }
  }
}
