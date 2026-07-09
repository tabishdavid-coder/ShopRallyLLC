import "server-only";

import { prisma } from "@/db/client";
import { customerDisplayName } from "@/lib/format";
import type { PaymentRow } from "@/lib/payment-display";

export type CustomerPaymentHistory = {
  payments: PaymentRow[];
  /** Reserved for Stripe decline / failed attempt records when modeled. */
  failedPayments: PaymentRow[];
};

/** All shop-scoped payments on repair orders belonging to a customer. */
export async function getCustomerPaymentHistory(
  shopId: string,
  customerId: string,
): Promise<CustomerPaymentHistory> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { firstName: true, lastName: true, company: true },
  });
  if (!customer) return { payments: [], failedPayments: [] };

  const customerName = customerDisplayName(customer);

  const rows = await prisma.payment.findMany({
    where: {
      shopId,
      invoice: {
        repairOrder: { customerId },
      },
    },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      method: true,
      amountCents: true,
      paidAt: true,
      reference: true,
      stripePaymentIntentId: true,
      invoice: {
        select: {
          repairOrder: {
            select: { id: true, number: true },
          },
        },
      },
    },
  });

  const payments: PaymentRow[] = rows.map((p) => ({
    id: p.id,
    method: p.method,
    amountCents: p.amountCents,
    paidAt: p.paidAt.toISOString(),
    reference: p.reference,
    stripePaymentIntentId: p.stripePaymentIntentId,
    customerName,
    repairOrderId: p.invoice.repairOrder.id,
    roNumber: p.invoice.repairOrder.number,
    status: "succeeded",
  }));

  return { payments, failedPayments: [] };
}
