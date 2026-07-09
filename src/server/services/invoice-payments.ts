import "server-only";

import { prisma } from "@/db/client";
import { InvoiceStatus, PaymentMethod, ROStatus, ShopAuditEventType } from "@/generated/prisma";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type RecordPaymentResult =
  | {
      ok: true;
      paymentId: string;
      repairOrderId: string;
      invoiceId: string;
      amountCents: number;
      method: PaymentMethod;
      created: boolean;
    }
  | { ok: false; error: string };

/** Record a payment against an invoice and update balance / status. */
export async function recordInvoicePayment(opts: {
  invoiceId: string;
  shopId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string | null;
  stripePaymentIntentId?: string | null;
  /** Pass `null` for Stripe webhooks / customer-initiated flows (no staff actor). */
  auditActor?: { userId: string; email: string } | null;
}): Promise<RecordPaymentResult> {
  if (opts.amountCents <= 0) {
    return { ok: false, error: "Payment amount must be greater than zero." };
  }

  if (opts.stripePaymentIntentId) {
    const existing = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: opts.stripePaymentIntentId },
      select: {
        id: true,
        invoiceId: true,
        amountCents: true,
        method: true,
        invoice: { select: { repairOrderId: true } },
      },
    });
    if (existing) {
      return {
        ok: true,
        paymentId: existing.id,
        repairOrderId: existing.invoice.repairOrderId,
        invoiceId: existing.invoiceId,
        amountCents: existing.amountCents,
        method: existing.method,
        created: false,
      };
    }
  }

  let paymentId: string | undefined;
  let repairOrderId: string | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({
        where: { id: opts.invoiceId, shopId: opts.shopId },
        select: { id: true, balanceCents: true, repairOrderId: true, status: true },
      });
      if (!inv) throw new Error("Invoice not found.");
      if (inv.balanceCents <= 0 || inv.status === InvoiceStatus.PAID) {
        throw new Error("This invoice is already paid in full.");
      }
      if (opts.amountCents > inv.balanceCents) {
        throw new Error("Payment exceeds balance due.");
      }

      const payment = await tx.payment.create({
        data: {
          shopId: opts.shopId,
          invoiceId: inv.id,
          amountCents: opts.amountCents,
          method: opts.method,
          reference: opts.reference ?? null,
          stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
          paidAt: new Date(),
        },
        select: { id: true },
      });
      paymentId = payment.id;
      repairOrderId = inv.repairOrderId;

      const newBalance = Math.max(0, inv.balanceCents - opts.amountCents);
      const status = newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL;

      await tx.invoice.update({
        where: { id: inv.id },
        data: { balanceCents: newBalance, status },
      });

      if (newBalance <= 0) {
        await tx.repairOrder.update({
          where: { id: inv.repairOrderId },
          data: { status: ROStatus.INVOICED },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not record payment.";
    return { ok: false, error: msg };
  }

  if (!paymentId || !repairOrderId) {
    return { ok: false, error: "Could not record payment." };
  }

  const methodLabel = opts.method.toLowerCase();
    await recordShopAuditEventSafe({
      shopId: opts.shopId,
      eventType: ShopAuditEventType.PAYMENT_RECORDED,
      repairOrderId,
      invoiceId: opts.invoiceId,
      paymentId,
      summary: `Recorded ${formatUsd(opts.amountCents)} ${methodLabel} payment`,
      metadata: {
        amountCents: opts.amountCents,
        method: opts.method,
        reference: opts.reference ?? null,
        stripePaymentIntentId: opts.stripePaymentIntentId ?? null,
      },
      actor: opts.auditActor,
    });

  return {
    ok: true,
    paymentId,
    repairOrderId,
    invoiceId: opts.invoiceId,
    amountCents: opts.amountCents,
    method: opts.method,
    created: true,
  };
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
