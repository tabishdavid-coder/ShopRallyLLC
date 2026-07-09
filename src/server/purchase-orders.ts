import { prisma } from "@/db/client";
import { PurchaseOrderStatus } from "@/generated/prisma";

export type PurchaseOrderRow = {
  id: string;
  number: number;
  vendor: string | null;
  invoiceNumber: string | null;
  totalCents: number;
  status: PurchaseOrderStatus;
  archivedAt: Date | null;
  createdAt: Date;
};

/** List purchase orders for a repair order (shop-scoped). */
export async function getPurchaseOrdersForRo(
  shopId: string,
  repairOrderId: string,
): Promise<PurchaseOrderRow[]> {
  return prisma.purchaseOrder.findMany({
    where: { shopId, repairOrderId },
    orderBy: [{ archivedAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      vendor: true,
      invoiceNumber: true,
      totalCents: true,
      status: true,
      archivedAt: true,
      createdAt: true,
    },
  });
}

/** Next sequential PO number for a shop. */
export async function nextPurchaseOrderNumber(shopId: string): Promise<number> {
  const last = await prisma.purchaseOrder.findFirst({
    where: { shopId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 1000) + 1;
}

function vendorKey(vendor: string | null | undefined): string {
  return vendor?.trim() || "Unknown Supplier";
}

/**
 * Upsert non-archived POs from ORDERED part lines on an RO, grouped by vendor.
 * Called when parts are marked ordered so POs stay in sync.
 */
export async function syncPurchaseOrdersFromParts(
  shopId: string,
  repairOrderId: string,
): Promise<void> {
  const parts = await prisma.partLine.findMany({
    where: {
      shopId,
      status: "ORDERED",
      job: { repairOrderId },
    },
    select: { vendor: true, costCents: true, quantity: true },
  });
  if (!parts.length) return;

  const byVendor = new Map<string, number>();
  for (const p of parts) {
    const key = vendorKey(p.vendor);
    byVendor.set(key, (byVendor.get(key) ?? 0) + p.costCents * p.quantity);
  }

  for (const [vendor, totalCents] of byVendor) {
    const existing = await prisma.purchaseOrder.findFirst({
      where: {
        shopId,
        repairOrderId,
        vendor,
        archivedAt: null,
        status: { not: PurchaseOrderStatus.ARCHIVED },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.purchaseOrder.update({
        where: { id: existing.id },
        data: { totalCents, status: PurchaseOrderStatus.ORDERED },
      });
    } else {
      const number = await nextPurchaseOrderNumber(shopId);
      await prisma.purchaseOrder.create({
        data: {
          shopId,
          repairOrderId,
          number,
          vendor,
          totalCents,
          status: PurchaseOrderStatus.ORDERED,
        },
      });
    }
  }
}
