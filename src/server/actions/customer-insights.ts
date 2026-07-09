"use server";

import { revalidatePath } from "next/cache";

import { getShopId } from "@/lib/shop";
import { loadCustomerInsights, type CustomerInsightsView } from "@/server/customer-insights";
import { gates } from "@/server/permission-gates";

export type CustomerInsightsActionResult =
  | { ok: true; data: CustomerInsightsView }
  | { ok: false; error: string };

export async function getCustomerInsights(
  customerId: string,
): Promise<CustomerInsightsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const data = await loadCustomerInsights(shopId, customerId);
  return { ok: true, data };
}

export async function refreshCustomerInsights(
  customerId: string,
): Promise<CustomerInsightsActionResult> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;

  const data = await loadCustomerInsights(shopId, customerId, { forceRefresh: true });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, data };
}
