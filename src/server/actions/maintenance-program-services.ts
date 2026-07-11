"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import {
  PROGRAM_SERVICE_TYPES,
  ProgramServiceInputSchema,
  type ProgramServiceInput,
} from "@/lib/maintenance-programs";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import {
  buildProgramServiceFromCannedJob,
  listAllProgramServices,
  listProgramServices,
} from "@/server/maintenance-program-services";
import { gates } from "@/server/permission-gates";

export type ServiceActionResult = { ok: true; id?: string } | { ok: false; error: string };

const FromCannedJobSchema = z.object({
  cannedJobId: z.string().min(1),
  serviceType: z.enum(PROGRAM_SERVICE_TYPES).default("VISITS"),
  defaultQuantity: z.number().int().min(1).optional(),
  defaultIntervalDays: z.number().int().min(1).optional(),
  defaultDiscountBps: z.number().int().min(0).max(10000).optional(),
});

async function requireFeature(shopId: string): Promise<ServiceActionResult | null> {
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const allowed = await canUseReleasedFeature(shopId, "maintenance_programs");
  if (!allowed) {
    return { ok: false, error: `Maintenance programs require ${PLANS.ENTERPRISE.name}.` };
  }
  return null;
}

function revalidate() {
  revalidatePath("/marketing/maintenance-programs");
  revalidatePath("/canned-jobs");
}

async function nextSortOrder(shopId: string) {
  const maxSort = await prisma.maintenanceProgramService.aggregate({
    where: { shopId },
    _max: { sortOrder: true },
  });
  return (maxSort._max.sortOrder ?? -1) + 1;
}

function serviceTypeFields(data: Pick<ProgramServiceInput, "serviceType" | "defaultQuantity" | "defaultIntervalDays" | "defaultDiscountBps">) {
  return {
    defaultQuantity: data.serviceType === "VISITS" ? (data.defaultQuantity ?? 1) : null,
    defaultIntervalDays:
      data.serviceType === "SCHEDULED" || data.serviceType === "UNLIMITED"
        ? (data.defaultIntervalDays ?? 90)
        : null,
    defaultDiscountBps: data.serviceType === "DISCOUNT" ? (data.defaultDiscountBps ?? 0) : null,
  };
}

export async function createProgramService(input: ProgramServiceInput): Promise<ServiceActionResult> {
  const parsed = ProgramServiceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid service." };
  }

  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  if (parsed.data.cannedJobId) {
    const dupe = await prisma.maintenanceProgramService.findFirst({
      where: { shopId, cannedJobId: parsed.data.cannedJobId, active: true },
      select: { id: true },
    });
    if (dupe) {
      return { ok: false, error: "That job template is already in your service library." };
    }
  }

  const row = await prisma.maintenanceProgramService.create({
    data: {
      shopId,
      cannedJobId: parsed.data.cannedJobId ?? null,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      serviceType: parsed.data.serviceType,
      ...serviceTypeFields(parsed.data),
      unitCostCents: parsed.data.unitCostCents ?? null,
      active: parsed.data.active,
      sortOrder: await nextSortOrder(shopId),
    },
    select: { id: true },
  });

  revalidate();
  return { ok: true, id: row.id };
}

export async function createProgramServiceFromCannedJob(
  input: z.infer<typeof FromCannedJobSchema>,
): Promise<ServiceActionResult> {
  const parsed = FromCannedJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  const built = await buildProgramServiceFromCannedJob(shopId, parsed.data.cannedJobId);
  if (!built) return { ok: false, error: "Job template not found." };

  const dupe = await prisma.maintenanceProgramService.findFirst({
    where: { shopId, cannedJobId: parsed.data.cannedJobId },
    select: { id: true, active: true },
  });
  if (dupe?.active) {
    return { ok: false, error: "That job template is already in your service library." };
  }
  if (dupe && !dupe.active) {
    await prisma.maintenanceProgramService.update({
      where: { id: dupe.id },
      data: {
        active: true,
        serviceType: parsed.data.serviceType,
        ...serviceTypeFields(parsed.data),
        unitCostCents: built.unitCostCents,
      },
    });
    revalidate();
    return { ok: true, id: dupe.id };
  }

  const row = await prisma.maintenanceProgramService.create({
    data: {
      shopId,
      cannedJobId: parsed.data.cannedJobId,
      name: built.job.name,
      description: built.job.description,
      serviceType: parsed.data.serviceType,
      ...serviceTypeFields(parsed.data),
      unitCostCents: built.unitCostCents,
      active: true,
      sortOrder: await nextSortOrder(shopId),
    },
    select: { id: true },
  });

  revalidate();
  return { ok: true, id: row.id };
}

export async function updateProgramService(
  id: string,
  input: ProgramServiceInput,
): Promise<ServiceActionResult> {
  const parsed = ProgramServiceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid service." };
  }

  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  const existing = await prisma.maintenanceProgramService.findFirst({ where: { id, shopId } });
  if (!existing) return { ok: false, error: "Service not found." };

  await prisma.maintenanceProgramService.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      serviceType: parsed.data.serviceType,
      ...serviceTypeFields(parsed.data),
      unitCostCents: parsed.data.unitCostCents ?? null,
      active: parsed.data.active,
    },
  });

  revalidate();
  return { ok: true, id };
}

export async function refreshProgramServiceCostFromJob(id: string): Promise<ServiceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  const existing = await prisma.maintenanceProgramService.findFirst({
    where: { id, shopId },
    select: { id: true, cannedJobId: true },
  });
  if (!existing?.cannedJobId) {
    return { ok: false, error: "This service is not linked to a job template." };
  }

  const built = await buildProgramServiceFromCannedJob(shopId, existing.cannedJobId);
  if (!built) return { ok: false, error: "Job template not found." };

  await prisma.maintenanceProgramService.update({
    where: { id },
    data: {
      name: built.job.name,
      description: built.job.description,
      unitCostCents: built.unitCostCents,
    },
  });

  revalidate();
  return { ok: true, id };
}

export async function archiveProgramService(id: string): Promise<ServiceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  const existing = await prisma.maintenanceProgramService.findFirst({ where: { id, shopId } });
  if (!existing) return { ok: false, error: "Service not found." };

  await prisma.maintenanceProgramService.update({
    where: { id },
    data: { active: false },
  });

  revalidate();
  return { ok: true };
}

export async function updateProgramServiceCost(
  id: string,
  unitCostCents: number | null,
): Promise<ServiceActionResult> {
  const shopId = await getShopId();
  const blocked = await requireFeature(shopId);
  if (blocked) return blocked;

  const existing = await prisma.maintenanceProgramService.findFirst({ where: { id, shopId } });
  if (!existing) return { ok: false, error: "Service not found." };

  await prisma.maintenanceProgramService.update({
    where: { id },
    data: { unitCostCents },
  });

  revalidate();
  return { ok: true, id };
}

export { listAllProgramServices, listProgramServices };
