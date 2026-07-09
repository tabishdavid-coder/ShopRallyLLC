"use server";

import { getShopId } from "@/lib/shop";
import type { PaymentRow } from "@/lib/payment-display";
import { requireAnyPermission } from "@/server/permissions";
import { getCustomerPaymentHistory } from "@/server/customer-payment-history";

export async function fetchCustomerPaymentHistory(
  customerId: string,
): Promise<
  | { ok: true; payments: PaymentRow[]; failedPayments: PaymentRow[] }
  | { ok: false; error: string }
> {
  try {
    const shopId = await getShopId();
    const perm = await requireAnyPermission(shopId, ["customers.view"]);
    if (!perm.ok) return perm;

    const history = await getCustomerPaymentHistory(shopId, customerId);
    return {
      ok: true,
      payments: history.payments,
      failedPayments: history.failedPayments,
    };
  } catch (err) {
    console.error("[fetchCustomerPaymentHistory]", err);
    return { ok: false, error: "Could not load payment history. Try again." };
  }
}
