import "server-only";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getGrossVolumeCents } from "@/server/services/stripe-payments";
import { getShopStripeStatus } from "@/server/services/stripe-connect";
import { StripeConnectStatus } from "@/generated/prisma";

export type PaymentRow = {
  id: string;
  paidAt: Date;
  amountCents: number;
  method: string;
  reference: string | null;
  source: string;
  invoiceNumber: number;
  roNumber: number;
};

export type PaymentsOverview = {
  stripeStatus: Awaited<ReturnType<typeof getShopStripeStatus>>;
  actionRequired: string | null;
  recentPayments: PaymentRow[];
  totalCount: number;
  grossVolumeCents: number;
};

export async function getPaymentsOverview(): Promise<PaymentsOverview> {
  const shopId = await getShopId();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stripeStatus, payments, totalCount, grossVolumeCents] = await Promise.all([
    getShopStripeStatus(shopId),
    prisma.payment.findMany({
      where: { shopId },
      orderBy: { paidAt: "desc" },
      take: 10,
      select: {
        id: true,
        paidAt: true,
        amountCents: true,
        method: true,
        reference: true,
        stripePaymentIntentId: true,
        invoice: { select: { number: true, repairOrder: { select: { number: true } } } },
      },
    }),
    prisma.payment.count({ where: { shopId } }),
    getGrossVolumeCents(shopId, thirtyDaysAgo),
  ]);

  let actionRequired: string | null = null;
  if (stripeStatus.connectStatus === StripeConnectStatus.RESTRICTED) {
    actionRequired =
      "Stripe needs additional information to keep your account active. Open Account → Complete onboarding.";
  } else if (stripeStatus.connectStatus === StripeConnectStatus.PENDING && stripeStatus.accountId) {
    actionRequired = "Finish Stripe onboarding to start accepting online payments.";
  } else if (stripeStatus.connectStatus === StripeConnectStatus.NOT_STARTED) {
    actionRequired = "Connect your Stripe account to accept online invoice payments.";
  }

  const recentPayments: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    paidAt: p.paidAt,
    amountCents: p.amountCents,
    method: p.method,
    reference: p.reference,
    source: p.stripePaymentIntentId ? "ShopRally Payments" : "Manual",
    invoiceNumber: p.invoice.number,
    roNumber: p.invoice.repairOrder.number,
  }));

  return {
    stripeStatus,
    actionRequired,
    recentPayments,
    totalCount,
    grossVolumeCents,
  };
}
