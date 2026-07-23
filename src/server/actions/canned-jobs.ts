"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { getShopId } from "@/lib/shop";
import { SaveCannedJobInput, SaveJobAsCannedJobInput } from "@/lib/canned-job-schemas";
import { getShopMatrices, shopLaborRate, shopPartRetail } from "@/server/pricing-matrix";
import { recomputeRoTotals } from "@/server/estimate";
import { getCannedJob, listCannedJobsForPicker, type CannedJobDetail } from "@/server/canned-jobs";
import { gates } from "@/server/permission-gates";

export type CannedJobResult = { ok: true; id?: string } | { ok: false; error: string };

export type CannedJobDetailResult =
  | { ok: true; job: CannedJobDetail }
  | { ok: false; error: string };

/** Load one canned job for the edit dialog (client-safe via server action). */
export async function fetchCannedJobDetail(id: string): Promise<CannedJobDetailResult> {
  try {
    const shopId = await getShopId();
    const job = await getCannedJob(shopId, id);
    if (!job) return { ok: false, error: "Canned job not found." };
    return { ok: true, job };
  } catch (err) {
    console.error("[fetchCannedJobDetail]", err);
    return { ok: false, error: "Could not load canned job details." };
  }
}

function revalidateCannedJobs() {
  revalidatePath("/canned-jobs");
  revalidatePath("/repair-orders");
}

/** Create or update a canned job template (Settings / Canned Jobs page). */
export async function saveCannedJob(raw: unknown): Promise<CannedJobResult> {
  const parsed = SaveCannedJobInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid canned job." };
  }
  const d = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  if (!d.laborLines.length) {
    return { ok: false, error: "Add at least one labor line." };
  }

  const keepLabor = d.laborLines.filter((l) => l.id).map((l) => l.id!) as string[];
  const keepParts = d.partLines.filter((p) => p.id).map((p) => p.id!) as string[];
  const keepFees = d.feeLines.filter((f) => f.id).map((f) => f.id!) as string[];

  if (d.id) {
    const existing = await prisma.cannedJob.findFirst({ where: { id: d.id, shopId }, select: { id: true } });
    if (!existing) return { ok: false, error: "Canned job not found." };

    await prisma.$transaction([
      prisma.cannedJob.updateMany({
        where: { id: d.id, shopId },
        data: {
          name: d.name,
          description: d.description ?? null,
          category: d.category?.trim() || null,
          isActive: d.isActive,
        },
      }),
      prisma.cannedJobLaborLine.deleteMany({
        where: { cannedJobId: d.id, id: { notIn: keepLabor.length ? keepLabor : ["_none_"] } },
      }),
      prisma.cannedJobPartLine.deleteMany({
        where: { cannedJobId: d.id, id: { notIn: keepParts.length ? keepParts : ["_none_"] } },
      }),
      prisma.cannedJobFeeLine.deleteMany({
        where: { cannedJobId: d.id, id: { notIn: keepFees.length ? keepFees : ["_none_"] } },
      }),
      ...d.laborLines.map((l, i) =>
        l.id
          ? prisma.cannedJobLaborLine.updateMany({
              where: { id: l.id, cannedJobId: d.id, shopId },
              data: {
                description: l.description,
                hours: l.hours,
                flatAmountCents: l.flatAmountCents ?? null,
                sortOrder: i,
              },
            })
          : prisma.cannedJobLaborLine.create({
              data: {
                shopId,
                cannedJobId: d.id!,
                description: l.description,
                hours: l.hours,
                flatAmountCents: l.flatAmountCents ?? null,
                sortOrder: i,
              },
            }),
      ),
      ...d.partLines.map((p, i) =>
        p.id
          ? prisma.cannedJobPartLine.updateMany({
              where: { id: p.id, cannedJobId: d.id, shopId },
              data: {
                brand: p.brand ?? null,
                description: p.description,
                partNumber: p.partNumber ?? null,
                costCents: p.costCents,
                quantity: p.quantity,
                sortOrder: i,
              },
            })
          : prisma.cannedJobPartLine.create({
              data: {
                shopId,
                cannedJobId: d.id!,
                brand: p.brand ?? null,
                description: p.description,
                partNumber: p.partNumber ?? null,
                costCents: p.costCents,
                quantity: p.quantity,
                sortOrder: i,
              },
            }),
      ),
      ...d.feeLines.map((f, i) =>
        f.id
          ? prisma.cannedJobFeeLine.updateMany({
              where: { id: f.id, cannedJobId: d.id, shopId },
              data: {
                name: f.name,
                method: f.method,
                base: f.base,
                amount: f.amount,
                capCents: f.capCents ?? null,
                taxable: f.taxable,
                sortOrder: i,
              },
            })
          : prisma.cannedJobFeeLine.create({
              data: {
                shopId,
                cannedJobId: d.id!,
                name: f.name,
                method: f.method,
                base: f.base,
                amount: f.amount,
                capCents: f.capCents ?? null,
                taxable: f.taxable,
                sortOrder: i,
              },
            }),
      ),
    ]);
    revalidateCannedJobs();
    return { ok: true, id: d.id };
  }

  const last = await prisma.cannedJob.findFirst({
    where: { shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.cannedJob.create({
    data: {
      shopId,
      name: d.name,
      description: d.description ?? null,
      category: d.category?.trim() || null,
      isActive: d.isActive,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      laborLines: {
        create: d.laborLines.map((l, i) => ({
          shopId,
          description: l.description,
          hours: l.hours,
          flatAmountCents: l.flatAmountCents ?? null,
          sortOrder: i,
        })),
      },
      partLines: {
        create: d.partLines.map((p, i) => ({
          shopId,
          brand: p.brand ?? null,
          description: p.description,
          partNumber: p.partNumber ?? null,
          costCents: p.costCents,
          quantity: p.quantity,
          sortOrder: i,
        })),
      },
      feeLines: {
        create: d.feeLines.map((f, i) => ({
          shopId,
          name: f.name,
          method: f.method,
          base: f.base,
          amount: f.amount,
          capCents: f.capCents ?? null,
          taxable: f.taxable,
          sortOrder: i,
        })),
      },
    },
    select: { id: true },
  });

  revalidateCannedJobs();
  return { ok: true, id: created.id };
}

/** Soft-deactivate a canned job (keeps usage history). */
export async function deactivateCannedJob(id: string): Promise<CannedJobResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const row = await prisma.cannedJob.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!row) return { ok: false, error: "Canned job not found." };
  await prisma.cannedJob.updateMany({ where: { id, shopId }, data: { isActive: false } });
  revalidateCannedJobs();
  return { ok: true };
}

/** Permanently delete a canned job template. */
export async function deleteCannedJob(id: string): Promise<CannedJobResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const row = await prisma.cannedJob.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!row) return { ok: false, error: "Canned job not found." };
  await prisma.cannedJob.deleteMany({ where: { id, shopId } });
  revalidateCannedJobs();
  return { ok: true };
}

/** Reactivate a deactivated canned job. */
export async function activateCannedJob(id: string): Promise<CannedJobResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const row = await prisma.cannedJob.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!row) return { ok: false, error: "Canned job not found." };
  await prisma.cannedJob.updateMany({ where: { id, shopId }, data: { isActive: true } });
  revalidateCannedJobs();
  return { ok: true };
}

/** Active canned jobs for estimate picker (client can filter further). */
export async function fetchCannedJobsForPicker(opts?: { q?: string; category?: string }) {
  const shopId = await getShopId();
  return listCannedJobsForPicker(shopId, opts);
}

export type ShopFeeTemplateRow = {
  name: string;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
  capCents: number | null;
  taxable: boolean;
};

export type ShopFeeTemplatesResult =
  | { ok: true; templates: ShopFeeTemplateRow[] }
  | { ok: false; error: string };

/** Shop fee templates for canned job builder fee-line picker. */
export async function fetchShopFeeTemplatesForPicker(): Promise<ShopFeeTemplatesResult> {
  try {
    const shopId = await getShopId();
    const rows = await prisma.shopFeeTemplate.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        method: true,
        base: true,
        amount: true,
        capCents: true,
        taxable: true,
      },
    });
    return { ok: true, templates: rows };
  } catch (err) {
    console.error("[fetchShopFeeTemplatesForPicker]", err);
    return { ok: false, error: "Could not load shop fee templates." };
  }
}

/** Duplicate a canned job template (library management). */
export async function duplicateCannedJob(id: string): Promise<CannedJobResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const source = await getCannedJob(shopId, id);
  if (!source) return { ok: false, error: "Canned job not found." };

  const last = await prisma.cannedJob.findFirst({
    where: { shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const copyName = `${source.name} (copy)`.slice(0, 200);

  const created = await prisma.cannedJob.create({
    data: {
      shopId,
      name: copyName,
      description: source.description,
      category: source.category,
      isActive: true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      laborLines: {
        create: source.laborLines.map((l, i) => ({
          shopId,
          description: l.description,
          hours: l.hours,
          flatAmountCents: l.flatAmountCents,
          sortOrder: i,
        })),
      },
      partLines: {
        create: source.partLines.map((p, i) => ({
          shopId,
          brand: p.brand,
          description: p.description,
          partNumber: p.partNumber,
          costCents: p.costCents,
          quantity: p.quantity,
          sortOrder: i,
        })),
      },
      feeLines: {
        create: source.feeLines.map((f, i) => ({
          shopId,
          name: f.name,
          method: f.method,
          base: f.base,
          amount: f.amount,
          capCents: f.capCents,
          taxable: f.taxable,
          sortOrder: i,
        })),
      },
    },
    select: { id: true },
  });

  revalidateCannedJobs();
  return { ok: true, id: created.id };
}

/**
 * Apply a canned job to a repair order: creates Job + LaborLine + PartLine rows,
 * applies shop labor rate + markup matrices, increments usageCount / lastUsedAt.
 */
export async function applyCannedJob(repairOrderId: string, cannedJobId: string): Promise<CannedJobResult> {
  return addCannedJobToRepairOrder(repairOrderId, cannedJobId);
}

/** Copies template labor + parts onto an RO (Shopmonkey "Add Service" flow). */
export async function addCannedJobToRepairOrder(
  repairOrderId: string,
  cannedJobId: string,
): Promise<CannedJobResult> {
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const [ro, template] = await Promise.all([
    prisma.repairOrder.findFirst({
      where: { id: repairOrderId, shopId },
      select: { id: true, laborRateCents: true, shop: { select: { laborRateCents: true } } },
    }),
    prisma.cannedJob.findFirst({
      where: { id: cannedJobId, shopId, isActive: true },
      include: {
        laborLines: { orderBy: { sortOrder: "asc" } },
        partLines: { orderBy: { sortOrder: "asc" } },
        feeLines: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  if (!ro) return { ok: false, error: "Repair order not found." };
  if (!template) return { ok: false, error: "Canned job not found or inactive." };

  const baseRateCents = ro.laborRateCents ?? ro.shop.laborRateCents;
  const { partTiers, laborTiers } = await getShopMatrices(shopId);

  const lastJob = await prisma.job.findFirst({
    where: { repairOrderId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastJob?.sortOrder ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        shopId,
        repairOrderId,
        name: template.name,
        note: template.description,
        sortOrder,
        laborLines: {
          create: template.laborLines.map((l) => {
            const rateCents = shopLaborRate(baseRateCents, l.hours, laborTiers);
            const totalCents =
              l.flatAmountCents ?? Math.round(l.hours * rateCents);
            const effectiveRateCents =
              l.hours > 0 ? Math.round(totalCents / l.hours) : rateCents;
            return {
              shopId,
              description: l.description,
              hours: l.hours,
              rateCents: effectiveRateCents,
              totalCents,
            };
          }),
        },
        partLines: {
          create: template.partLines.map((p) => {
            const retailCents = shopPartRetail(p.costCents, partTiers);
            return {
              shopId,
              brand: p.brand,
              description: p.description,
              partNumber: p.partNumber,
              quantity: p.quantity,
              costCents: p.costCents,
              retailCents,
              totalCents: retailCents * p.quantity,
            };
          }),
        },
        fees: {
          create: template.feeLines.map((f, i) => ({
            shopId,
            repairOrderId,
            name: f.name,
            method: f.method,
            base: f.base,
            amount: f.amount,
            capCents: f.capCents,
            taxable: f.taxable,
            sortOrder: i,
          })),
        },
      },
    });

    await tx.cannedJob.update({
      where: { id: cannedJobId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return job;
  });

  await recomputeRoTotals(repairOrderId);
  for (const path of revalidateEstimatePaths(repairOrderId)) {
    revalidatePath(path);
  }
  revalidateCannedJobs();
  return { ok: true };
}

/** Save an existing estimate job as a new canned job template (star icon on job card). */
export async function saveJobAsCannedJob(raw: unknown): Promise<CannedJobResult> {
  const parsed = SaveJobAsCannedJobInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid canned job." };
  }
  const { jobId, name, category, description } = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const job = await prisma.job.findFirst({
    where: { id: jobId, shopId },
    include: {
      laborLines: { orderBy: { id: "asc" } },
      partLines: { orderBy: { id: "asc" } },
    },
  });
  if (!job) return { ok: false, error: "Job not found." };

  const last = await prisma.cannedJob.findFirst({
    where: { shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.cannedJob.create({
    data: {
      shopId,
      name: (name?.trim() || job.name).slice(0, 200),
      description: description !== undefined ? description : job.note,
      category: category?.trim() || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      laborLines: {
        create: job.laborLines.map((l, i) => ({
          shopId,
          description: l.description,
          hours: l.hours,
          sortOrder: i,
        })),
      },
      partLines: {
        create: job.partLines.map((p, i) => ({
          shopId,
          brand: p.brand,
          description: p.description,
          partNumber: p.partNumber,
          costCents: p.costCents,
          quantity: p.quantity,
          sortOrder: i,
        })),
      },
    },
    select: { id: true },
  });

  revalidateCannedJobs();
  return { ok: true, id: created.id };
}
