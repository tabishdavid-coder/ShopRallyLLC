"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type CustomerDataResult = { ok: true } | { ok: false; error: string };

/** Shop operator DSAR export — wire from customer detail, not settings. */
export async function exportCustomerData(
  customerId: string,
): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const shopId = await getShopId();
  const denied = await gates.customersExport(shopId);
  if (denied) return denied;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    include: {
      vehicles: true,
      consentRecords: { orderBy: { createdAt: "desc" }, take: 50 },
      repairOrders: {
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
        },
      },
      messages: { take: 100, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.DSAR_EXPORT,
    summary: `Exported customer data (${customer.firstName} ${customer.lastName})`.trim(),
    metadata: { customerId },
  });

  const { consentRecords, messages, repairOrders, ...profile } = customer;
  return {
    ok: true,
    json: JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        profile,
        vehicles: customer.vehicles,
        repairOrders,
        messages,
        consentRecords,
      },
      null,
      2,
    ),
  };
}

/** Soft-delete customer; retention job anonymizes after grace period. */
export async function scheduleCustomerDeletion(
  customerId: string,
): Promise<CustomerDataResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() },
  });

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.CUSTOMER_DELETED,
    summary: `Customer deletion scheduled (${customer.firstName} ${customer.lastName})`.trim(),
    metadata: { customerId },
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true };
}
