"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { withShopTransaction } from "@/db/tenant-context";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { resolveAdvanced } from "@/lib/ro-settings";
import { ROStatus } from "@/generated/prisma";
import { gates } from "@/server/permission-gates";
import { ensureAutoApplyFees } from "@/server/ro-fees";
import { getLeadSourceNames } from "@/server/actions/marketing";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { recordRoCreatedAudit } from "@/server/shop-audit";

const CreateROInput = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().min(1),
  mileageIn: z.number().int().nonnegative().optional().nullable(),
  odometerNotWorking: z.boolean().optional().default(false),
  appointmentOption: z.string().max(60).optional().nullable(),
  laborRateCents: z.number().int().optional().nullable(),
  marketingSource: z.string().max(60).optional().nullable(),
  concerns: z.array(z.string().trim().max(300)).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateROInput = z.infer<typeof CreateROInput>;
export type CreateROResult =
  | { ok: true; id: string; number: number }
  | { ok: false; error: string };

/** Create a new repair order (Estimate) and return it for redirect. */
export async function createRepairOrder(
  raw: CreateROInput,
): Promise<CreateROResult> {
  const parsed = CreateROInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Missing required fields." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const [shop, allowedSources, currentUser] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId }, select: { roAdvanced: true } }),
    getLeadSourceNames(),
    getCurrentUser(),
  ]);
  const advanced = resolveAdvanced(shop?.roAdvanced);

  if (
    advanced.reqOdometer &&
    !d.odometerNotWorking &&
    (d.mileageIn == null || d.mileageIn <= 0)
  ) {
    return { ok: false, error: "Odometer in is required." };
  }
  if (advanced.reqMarketingSource && !d.marketingSource?.trim()) {
    return { ok: false, error: "Marketing source is required." };
  }
  if (d.marketingSource?.trim() && !allowedSources.includes(d.marketingSource.trim())) {
    return { ok: false, error: "Invalid marketing source for this shop." };
  }

  // Validate customer + vehicle belong to this shop and to each other.
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: d.vehicleId, shopId, customerId: d.customerId },
    select: { id: true },
  });
  if (!vehicle) {
    return { ok: false, error: "Vehicle not found for this customer." };
  }

  const ro = await withShopTransaction(shopId, async (tx) => {
    const last = await tx.repairOrder.findFirst({
      where: { shopId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 1000) + 1;

    let serviceWriterId: string | null = null;
    if (currentUser.id !== "stub-platform-admin") {
      const membership = await tx.membership.findFirst({
        where: { shopId, userId: currentUser.id, active: true },
        select: { userId: true },
      });
      if (membership) serviceWriterId = currentUser.id;
    }
    if (!serviceWriterId) {
      const writer = await tx.membership.findFirst({
        where: {
          shopId,
          active: true,
          role: { in: ["SERVICE_WRITER", "OWNER", "MANAGER"] },
        },
        orderBy: { role: "asc" },
        select: { userId: true },
      });
      serviceWriterId = writer?.userId ?? null;
    }

    const created = await tx.repairOrder.create({
      data: {
        shopId,
        number,
        customerId: d.customerId,
        vehicleId: d.vehicleId,
        status: "ESTIMATE",
        serviceWriterId,
        mileageIn: d.mileageIn ?? null,
        odometerNotWorking: d.odometerNotWorking ?? false,
        laborRateCents: d.laborRateCents ?? null,
        appointmentOption: d.appointmentOption ?? null,
        marketingSource: d.marketingSource ?? null,
        notes: d.notes?.trim() || null,
        concerns: d.concerns ?? [],
        vehicleConcerns: d.concerns?.length
          ? {
              create: d.concerns.map((text, i) => ({
                shopId,
                kind: "CUSTOMER" as const,
                text,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      select: { id: true, number: true },
    });

    if (d.mileageIn) {
      await tx.mileageRecord.create({
        data: { shopId, vehicleId: d.vehicleId, miles: d.mileageIn, source: "RO" },
      });
    }

    return created;
  });

  // Auto-apply shop fee templates (RO Settings → Shop Fees).
  await ensureAutoApplyFees(shopId, ro.id);

  await recordRoCreatedAudit({
    shopId,
    repairOrderId: ro.id,
    roNumber: ro.number,
    source: "manual",
  });

  for (const path of revalidateEstimatePaths(ro.id)) {
    revalidatePath(path);
  }
  return { ok: true, id: ro.id, number: ro.number };
}

export type UpdateRoSidebarResult = { ok: true } | { ok: false; error: string };

const UpdateRoSidebarInput = z.object({
  roId: z.string().min(1),
  serviceWriterId: z.string().nullable().optional(),
  technicianId: z.string().nullable().optional(),
  laborRateCents: z.number().int().positive().nullable().optional(),
  marketingSource: z.string().max(60).nullable().optional(),
  appointmentOption: z.string().max(60).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  customerRecommendations: z.string().max(4000).nullable().optional(),
  keyTag: z.string().max(40).nullable().optional(),
  promiseTime: z.string().datetime().nullable().optional(),
  saveParts: z.boolean().optional(),
});

export type UpdateRoSidebarInput = z.infer<typeof UpdateRoSidebarInput>;

/** Update RO sidebar fields (staff, rate, notes, key tag, etc.). */
export async function updateRepairOrderSidebar(
  raw: UpdateRoSidebarInput,
): Promise<UpdateRoSidebarResult> {
  const parsed = UpdateRoSidebarInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const d = parsed.data;

  const shopId = await getShopId();
  const ro = await prisma.repairOrder.findFirst({
    where: { id: d.roId, shopId },
    select: { id: true, status: true, technicianId: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const techChanging =
    d.technicianId !== undefined && d.technicianId !== ro.technicianId;
  const posted =
    ro.status !== ROStatus.ESTIMATE && ro.status !== ROStatus.APPROVED;
  const gate = techChanging && posted ? gates.customersChangeTech : gates.jobBoardView;
  const denied = await gate(shopId);
  if (denied) return { ok: false, error: denied.error };

  const data: Record<string, unknown> = {};
  if (d.serviceWriterId !== undefined) data.serviceWriterId = d.serviceWriterId;
  if (d.technicianId !== undefined) data.technicianId = d.technicianId;
  if (d.laborRateCents !== undefined) data.laborRateCents = d.laborRateCents;
  if (d.appointmentOption !== undefined) data.appointmentOption = d.appointmentOption;
  if (d.notes !== undefined) data.notes = d.notes?.trim() || null;
  if (d.customerRecommendations !== undefined) {
    data.customerRecommendations = d.customerRecommendations?.trim() || null;
  }
  if (d.keyTag !== undefined) data.keyTag = d.keyTag?.trim() || null;
  if (d.saveParts !== undefined) data.saveParts = d.saveParts;
  if (d.promiseTime !== undefined) {
    data.promiseTime = d.promiseTime ? new Date(d.promiseTime) : null;
  }

  if (d.marketingSource !== undefined) {
    const src = d.marketingSource?.trim() || null;
    if (src) {
      const allowed = await getLeadSourceNames();
      if (!allowed.includes(src)) {
        return { ok: false, error: "Invalid marketing source for this shop." };
      }
    }
    data.marketingSource = src;
  }

  // Validate staff belong to this shop.
  for (const [field, id] of [
    ["serviceWriterId", d.serviceWriterId],
    ["technicianId", d.technicianId],
  ] as const) {
    if (id === undefined || id === null) continue;
    const member = await prisma.membership.findFirst({
      where: { shopId, userId: id, active: true },
      select: { id: true },
    });
    if (!member) return { ok: false, error: `Selected ${field} is not an active employee.` };
  }

  if (Object.keys(data).length === 0) return { ok: true };

  const updated = await prisma.repairOrder.updateMany({
    where: { id: d.roId, shopId },
    data,
  });
  if (updated.count === 0) return { ok: false, error: "Repair order not found." };

  revalidatePath(`/repair-orders/${d.roId}`);
  revalidatePath(`/repair-orders/${d.roId}/estimate`);
  revalidatePath("/job-board");
  revalidatePath("/design-review/estimate-building");
  return { ok: true };
}

export type UpdateRoMileageResult = { ok: true } | { ok: false; error: string };

const UpdateRoMileageInput = z.object({
  repairOrderId: z.string().min(1),
  mileageIn: z.number().int().nonnegative().nullable().optional(),
  mileageOut: z.number().int().nonnegative().nullable().optional(),
  odometerNotWorking: z.boolean().optional(),
});

export type UpdateRoMileageInput = z.infer<typeof UpdateRoMileageInput>;

/** Update odometer in/out on an existing repair order. */
export async function updateRepairOrderMileage(
  raw: UpdateRoMileageInput,
): Promise<UpdateRoMileageResult> {
  const parsed = UpdateRoMileageInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: d.repairOrderId, shopId },
    select: { id: true, vehicleId: true, mileageIn: true, odometerNotWorking: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { roAdvanced: true },
  });
  const advanced = resolveAdvanced(shop?.roAdvanced);

  const notWorking =
    d.odometerNotWorking !== undefined ? d.odometerNotWorking : ro.odometerNotWorking;

  let nextMileageIn = ro.mileageIn;
  if (notWorking) {
    nextMileageIn = null;
  } else if (d.mileageIn !== undefined) {
    nextMileageIn = d.mileageIn;
  }

  if (advanced.reqOdometer && !notWorking && (nextMileageIn == null || nextMileageIn <= 0)) {
    if (d.mileageIn !== undefined || d.odometerNotWorking !== undefined) {
      return { ok: false, error: "Odometer in is required." };
    }
  }

  const data: Record<string, unknown> = {};
  if (d.odometerNotWorking !== undefined) data.odometerNotWorking = d.odometerNotWorking;
  if (d.mileageIn !== undefined || d.odometerNotWorking !== undefined) {
    data.mileageIn = nextMileageIn;
  }
  if (d.mileageOut !== undefined) data.mileageOut = d.mileageOut;

  if (Object.keys(data).length === 0) return { ok: true };

  const updated = await prisma.repairOrder.updateMany({
    where: { id: d.repairOrderId, shopId },
    data,
  });
  if (updated.count === 0) return { ok: false, error: "Repair order not found." };

  const recordedIn = data.mileageIn as number | null | undefined;
  if (recordedIn && recordedIn > 0 && recordedIn !== ro.mileageIn) {
    await prisma.mileageRecord.create({
      data: { shopId, vehicleId: ro.vehicleId, miles: recordedIn, source: "RO" },
    });
  }

  revalidatePath(`/repair-orders/${d.repairOrderId}`);
  revalidatePath("/job-board");
  revalidatePath("/design-review/estimate-building");
  return { ok: true };
}

export type DeleteRepairOrderResult = { ok: true } | { ok: false; error: string };

/** Delete an estimate-only repair order (no payments / not started). */
export async function deleteRepairOrder(repairOrderId: string): Promise<DeleteRepairOrderResult> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardDelete(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: {
      status: true,
      invoice: { select: { payments: { select: { id: true }, take: 1 } } },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  if (ro.status !== "ESTIMATE") {
    return { ok: false, error: "Only estimate repair orders can be deleted." };
  }
  if (ro.invoice?.payments.length) {
    return { ok: false, error: "Cannot delete — payments have been recorded." };
  }

  const deleted = await prisma.repairOrder.deleteMany({
    where: { id: repairOrderId, shopId, status: "ESTIMATE" },
  });
  if (deleted.count === 0) {
    return { ok: false, error: "Repair order could not be deleted." };
  }

  revalidatePath("/job-board");
  revalidatePath("/customers");
  revalidatePath("/repair-orders");
  return { ok: true };
}
