"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { PurchaseOrderStatus, ROStatus } from "@/generated/prisma";
import { gates } from "@/server/permission-gates";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function assertPoAccess(poId: string, shopId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id: poId, shopId },
    select: { id: true, repairOrderId: true, status: true, archivedAt: true },
  });
}

/** Archive a single purchase order (read-only after archive). */
export async function archivePurchaseOrder(poId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return denied;

  const po = await assertPoAccess(poId, shopId);
  if (!po) return { ok: false, error: "Purchase order not found." };
  if (po.status === PurchaseOrderStatus.ARCHIVED || po.archivedAt) {
    return { ok: false, error: "Purchase order is already archived." };
  }

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: PurchaseOrderStatus.ARCHIVED, archivedAt: new Date() },
  });

  revalidatePath(`/repair-orders/${po.repairOrderId}`);
  return { ok: true };
}

/** Restore an archived purchase order to ORDERED status. */
export async function unarchivePurchaseOrder(poId: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return denied;

  const po = await assertPoAccess(poId, shopId);
  if (!po) return { ok: false, error: "Purchase order not found." };
  if (po.status !== PurchaseOrderStatus.ARCHIVED && !po.archivedAt) {
    return { ok: false, error: "Purchase order is not archived." };
  }

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: PurchaseOrderStatus.ORDERED, archivedAt: null },
  });

  revalidatePath(`/repair-orders/${po.repairOrderId}`);
  return { ok: true };
}

const RoIdInput = z.object({ roId: z.string().min(1) });

/** Archive all open purchase orders linked to a repair order. */
export async function archiveAllPurchaseOrdersForRo(raw: z.infer<typeof RoIdInput>): Promise<ActionResult> {
  const parsed = RoIdInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid repair order." };
  const { roId } = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return denied;

  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { id: true, status: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (ro.status !== ROStatus.COMPLETED && ro.status !== ROStatus.INVOICED) {
    return { ok: false, error: "Archive purchase orders after work is completed." };
  }

  const result = await prisma.purchaseOrder.updateMany({
    where: {
      shopId,
      repairOrderId: roId,
      archivedAt: null,
      status: { not: PurchaseOrderStatus.ARCHIVED },
    },
    data: { status: PurchaseOrderStatus.ARCHIVED, archivedAt: new Date() },
  });

  if (result.count === 0) {
    return { ok: false, error: "No open purchase orders to archive." };
  }

  revalidatePath(`/repair-orders/${roId}`);
  return { ok: true };
}
