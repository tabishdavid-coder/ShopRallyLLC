"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { isEstimateEditable } from "@/lib/estimate-editable";
import { partRetail, type PartTier } from "@/lib/matrix";
import { recomputeRoTotals as recompute } from "@/server/estimate";
import { gates } from "@/server/permission-gates";
import { requirePermission } from "@/server/permissions";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";

export type EstimateResult = { ok: true } | { ok: false; error: string };

type EditableRo = {
  id: string;
  status: import("@/generated/prisma").ROStatus;
  laborRateCents: number | null;
  shop: {
    laborRateCents: number;
    partMatrix: PartTier[];
  };
};

function revalidateRo(roId: string) {
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
}

function done(roId: string): EstimateResult {
  revalidateRo(roId);
  return { ok: true };
}

async function loadEditableRo(shopId: string, roId: string): Promise<EditableRo | null> {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: {
      id: true,
      status: true,
      laborRateCents: true,
      shop: {
        select: {
          laborRateCents: true,
          partMatrix: {
            orderBy: { sortOrder: "asc" },
            select: { minCents: true, maxCents: true, multiplier: true },
          },
        },
      },
    },
  });
  if (!ro || !isEstimateEditable(ro.status)) return null;
  return ro;
}

function effectiveLaborRate(ro: EditableRo): number {
  return ro.laborRateCents ?? ro.shop.laborRateCents;
}

async function loadEditableJob(shopId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, shopId },
    select: { id: true, repairOrderId: true },
  });
  if (!job) return null;
  const ro = await loadEditableRo(shopId, job.repairOrderId);
  if (!ro) return null;
  return { job, ro };
}

async function loadEditableLaborLine(shopId: string, lineId: string) {
  const line = await prisma.laborLine.findFirst({
    where: { id: lineId, shopId },
    select: { id: true, jobId: true, job: { select: { repairOrderId: true } } },
  });
  if (!line) return null;
  const ro = await loadEditableRo(shopId, line.job.repairOrderId);
  if (!ro) return null;
  return { line, ro };
}

async function loadEditablePartLine(shopId: string, lineId: string) {
  const line = await prisma.partLine.findFirst({
    where: { id: lineId, shopId },
    select: { id: true, jobId: true, job: { select: { repairOrderId: true } } },
  });
  if (!line) return null;
  const ro = await loadEditableRo(shopId, line.job.repairOrderId);
  if (!ro) return null;
  return { line, ro };
}

async function gateEstimateEdit(shopId: string): Promise<EstimateResult | null> {
  const perm = await requirePermission(shopId, "estimate.edit");
  if (!perm.ok) return { ok: false, error: perm.error };
  return null;
}

async function gateEstimateApprove(shopId: string): Promise<EstimateResult | null> {
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return { ok: false, error: perm.error };
  return null;
}

async function auditEstimate(
  shopId: string,
  repairOrderId: string,
  eventType: ShopAuditEventType,
  summary: string,
  metadata?: Record<string, unknown>,
) {
  await recordShopAuditEventSafe({
    shopId,
    repairOrderId,
    eventType,
    summary,
    metadata,
  });
}

/** Recompute and persist cached RO totals (labor, parts, fees, tax, grand total). */
export async function recomputeRepairOrderTotals(repairOrderId: string): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: { id: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };
  await recompute(repairOrderId);
  return done(repairOrderId);
}

const AddJobInput = z.object({
  name: z.string().trim().min(1, "Job name is required.").max(200),
  description: z.string().trim().max(1000).optional(),
});

/** Add a new (empty) job to an estimate. */
export async function addJob(
  repairOrderId: string,
  input?: { name?: string; description?: string },
): Promise<EstimateResult> {
  const parsed = AddJobInput.safeParse({
    name: input?.name?.trim() || "New Job",
    description: input?.description,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ro = await loadEditableRo(shopId, repairOrderId);
  if (!ro) return { ok: false, error: "Repair order not found or is read-only." };

  const last = await prisma.job.findFirst({
    where: { repairOrderId, shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.job.create({
    data: {
      shopId,
      repairOrderId,
      name: parsed.data.name,
      note: parsed.data.description ?? null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  await auditEstimate(shopId, repairOrderId, ShopAuditEventType.ESTIMATE_JOB_ADDED, `Added job "${parsed.data.name}"`, {
    jobName: parsed.data.name,
  });
  return done(repairOrderId);
}

const UpdateJobInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  authorized: z.boolean().optional(),
  recommended: z.boolean().optional(),
});

/** Update job name, note, or authorized flag. */
export async function updateJob(jobId: string, patch: z.infer<typeof UpdateJobInput>): Promise<EstimateResult> {
  const parsed = UpdateJobInput.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job." };
  }

  const shopId = await getShopId();
  if (parsed.data.authorized != null) {
    const denied = await gateEstimateApprove(shopId);
    if (denied) return denied;
  } else {
    const denied = await gateEstimateEdit(shopId);
    if (denied) return denied;
  }

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  const data: { name?: string; note?: string | null; authorized?: boolean; recommended?: boolean } = {};
  if (parsed.data.name != null) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.note = parsed.data.description;
  if (parsed.data.authorized != null) data.authorized = parsed.data.authorized;
  if (parsed.data.recommended != null) data.recommended = parsed.data.recommended;

  await prisma.job.updateMany({ where: { id: jobId, shopId }, data });
  if (parsed.data.authorized != null) {
    await prisma.laborLine.updateMany({ where: { jobId, shopId }, data: { authorized: parsed.data.authorized } });
    await prisma.partLine.updateMany({ where: { jobId, shopId }, data: { authorized: parsed.data.authorized } });
  }
  await recompute(ctx.ro.id);
  if (parsed.data.authorized != null) {
    await auditEstimate(
      shopId,
      ctx.ro.id,
      ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
      `Job authorization set to ${parsed.data.authorized ? "approved" : "declined"}`,
      { jobId, authorized: parsed.data.authorized },
    );
  } else {
    await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_JOB_UPDATED, "Updated job details", {
      jobId,
    });
  }
  return done(ctx.ro.id);
}

/** Delete a job and all its labor/parts (cascade). */
export async function deleteJob(jobId: string): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  await prisma.job.deleteMany({ where: { id: jobId, shopId } });
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_JOB_DELETED, "Deleted job", { jobId });
  return done(ctx.ro.id);
}

const AddLaborInput = z.object({
  description: z.string().trim().min(1, "Description is required.").max(300),
  hours: z.number().min(0).max(1000),
  rateCents: z.number().int().min(0).optional(),
});

/** Add a labor line; defaults rate to RO labor rate. */
export async function addLaborLine(jobId: string, input: z.infer<typeof AddLaborInput>): Promise<EstimateResult> {
  const parsed = AddLaborInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid labor line." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  const rateCents = parsed.data.rateCents ?? effectiveLaborRate(ctx.ro);
  const totalCents = Math.round(parsed.data.hours * rateCents);
  const lastLabor = await prisma.laborLine.findFirst({
    where: { jobId, shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.laborLine.create({
    data: {
      shopId,
      jobId,
      description: parsed.data.description,
      hours: parsed.data.hours,
      rateCents,
      totalCents,
      sortOrder: (lastLabor?.sortOrder ?? -1) + 1,
    },
  });
  await recompute(ctx.ro.id);
  await auditEstimate(
    shopId,
    ctx.ro.id,
    ShopAuditEventType.ESTIMATE_LINE_ADDED,
    `Added labor line "${parsed.data.description}"`,
    { jobId, lineType: "labor" },
  );
  return done(ctx.ro.id);
}

const UpdateLaborInput = z.object({
  description: z.string().trim().min(1).max(300).optional(),
  hours: z.number().min(0).max(1000).optional(),
  rateCents: z.number().int().min(0).optional(),
});

/** Update one labor line; recomputes line total and RO totals. */
export async function updateLaborLine(
  lineId: string,
  patch: z.infer<typeof UpdateLaborInput>,
): Promise<EstimateResult> {
  const parsed = UpdateLaborInput.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid labor line." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableLaborLine(shopId, lineId);
  if (!ctx) return { ok: false, error: "Labor line not found or repair order is read-only." };

  const existing = await prisma.laborLine.findUnique({
    where: { id: lineId },
    select: { description: true, hours: true, rateCents: true },
  });
  if (!existing) return { ok: false, error: "Labor line not found." };

  const hours = parsed.data.hours ?? existing.hours;
  const rateCents = parsed.data.rateCents ?? existing.rateCents;
  await prisma.laborLine.updateMany({
    where: { id: lineId, shopId },
    data: {
      description: parsed.data.description ?? existing.description,
      hours,
      rateCents,
      totalCents: Math.round(hours * rateCents),
    },
  });
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_LINE_UPDATED, "Updated labor line", {
    lineId,
    lineType: "labor",
  });
  return done(ctx.ro.id);
}

/** Delete a labor line. */
export async function deleteLaborLine(lineId: string): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableLaborLine(shopId, lineId);
  if (!ctx) return { ok: false, error: "Labor line not found or repair order is read-only." };

  await prisma.laborLine.deleteMany({ where: { id: lineId, shopId } });
  await syncJobAuthorized(ctx.line.jobId, shopId);
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_LINE_DELETED, "Deleted labor line", {
    lineId,
    lineType: "labor",
  });
  return done(ctx.ro.id);
}

const AddPartInput = z.object({
  description: z.string().trim().min(1, "Description is required.").max(300),
  partNumber: z.string().trim().max(100).nullable().optional(),
  vendor: z.string().trim().max(100).nullable().optional(),
  qty: z.number().int().min(1).max(9999),
  costCents: z.number().int().min(0),
  retailCents: z.number().int().min(0).optional(),
});

/** Add a part line; retail from matrix (or cost × default multiplier) when omitted. */
export async function addPartLine(jobId: string, input: z.infer<typeof AddPartInput>): Promise<EstimateResult> {
  const parsed = AddPartInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid part line." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  const retailCents =
    parsed.data.retailCents ?? partRetail(parsed.data.costCents, ctx.ro.shop.partMatrix);
  const totalCents = retailCents * parsed.data.qty;
  const lastPart = await prisma.partLine.findFirst({
    where: { jobId, shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.partLine.create({
    data: {
      shopId,
      jobId,
      description: parsed.data.description,
      partNumber: parsed.data.partNumber ?? null,
      vendor: parsed.data.vendor ?? null,
      quantity: parsed.data.qty,
      costCents: parsed.data.costCents,
      retailCents,
      totalCents,
      sortOrder: (lastPart?.sortOrder ?? -1) + 1,
    },
  });
  await recompute(ctx.ro.id);
  await auditEstimate(
    shopId,
    ctx.ro.id,
    ShopAuditEventType.ESTIMATE_LINE_ADDED,
    `Added part line "${parsed.data.description}"`,
    { jobId, lineType: "part" },
  );
  return done(ctx.ro.id);
}

/** Move a part line to a different job on the same RO (PartsHub job assignment). */
export async function reassignPartLineJob(partLineId: string, jobId: string): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const line = await prisma.partLine.findFirst({
    where: { id: partLineId, shopId },
    select: { id: true, job: { select: { repairOrderId: true } } },
  });
  if (!line) return { ok: false, error: "Part line not found." };

  const target = await prisma.job.findFirst({
    where: { id: jobId, shopId, repairOrderId: line.job.repairOrderId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "Target job not found on this repair order." };

  const lastPart = await prisma.partLine.findFirst({
    where: { jobId, shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.partLine.updateMany({
    where: { id: partLineId, shopId },
    data: { jobId, sortOrder: (lastPart?.sortOrder ?? -1) + 1 },
  });

  await recompute(line.job.repairOrderId);
  await auditEstimate(shopId, line.job.repairOrderId, ShopAuditEventType.ESTIMATE_LINE_UPDATED, "Reassigned part to job", {
    partLineId,
    jobId,
  });
  return done(line.job.repairOrderId);
}

const UpdatePartInput = z.object({
  description: z.string().trim().min(1).max(300).optional(),
  partNumber: z.string().trim().max(100).nullable().optional(),
  qty: z.number().int().min(0).max(9999).optional(),
  costCents: z.number().int().min(0).optional(),
  retailCents: z.number().int().min(0).optional(),
});

/** Update one part line; recomputes line total and RO totals. */
export async function updatePartLine(
  lineId: string,
  patch: z.infer<typeof UpdatePartInput>,
): Promise<EstimateResult> {
  const parsed = UpdatePartInput.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid part line." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditablePartLine(shopId, lineId);
  if (!ctx) return { ok: false, error: "Part line not found or repair order is read-only." };

  const existing = await prisma.partLine.findUnique({
    where: { id: lineId },
    select: { description: true, partNumber: true, quantity: true, costCents: true, retailCents: true },
  });
  if (!existing) return { ok: false, error: "Part line not found." };

  const quantity = parsed.data.qty ?? existing.quantity;
  const costCents = parsed.data.costCents ?? existing.costCents;
  let retailCents = parsed.data.retailCents ?? existing.retailCents;
  if (parsed.data.costCents != null && parsed.data.retailCents == null) {
    retailCents = partRetail(costCents, ctx.ro.shop.partMatrix);
  }

  await prisma.partLine.updateMany({
    where: { id: lineId, shopId },
    data: {
      description: parsed.data.description ?? existing.description,
      partNumber: parsed.data.partNumber !== undefined ? parsed.data.partNumber : existing.partNumber,
      quantity,
      costCents,
      retailCents,
      totalCents: retailCents * quantity,
    },
  });
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_LINE_UPDATED, "Updated part line", {
    lineId,
    lineType: "part",
  });
  return done(ctx.ro.id);
}

/** Delete a part line. */
export async function deletePartLine(lineId: string): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditablePartLine(shopId, lineId);
  if (!ctx) return { ok: false, error: "Part line not found or repair order is read-only." };

  await prisma.partLine.deleteMany({ where: { id: lineId, shopId } });
  await syncJobAuthorized(ctx.line.jobId, shopId);
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_LINE_DELETED, "Deleted part line", {
    lineId,
    lineType: "part",
  });
  return done(ctx.ro.id);
}

// ── Batch save (used by estimate job card edit mode) ──────────────────

const SaveJobInput = z.object({
  jobId: z.string().min(1),
  name: z.string().trim().min(1, "Job name is required.").max(200),
  note: z.string().max(1000).nullable().optional(),
  laborLines: z
    .array(
      z.object({
        id: z.string().optional(),
        description: z.string().trim().max(300),
        hours: z.number().min(0).max(1000),
        costCents: z.number().int().min(0).optional().default(0),
        rateCents: z.number().int().min(0),
        discountCents: z.number().int().min(0).optional().default(0),
        technicianId: z.string().nullable().optional(),
      }),
    )
    .max(50),
  partLines: z
    .array(
      z.object({
        id: z.string().optional(),
        brand: z.string().trim().max(100).nullable().optional(),
        description: z.string().trim().max(500),
        partNumber: z.string().trim().max(100).nullable().optional(),
        quantity: z.number().int().min(0).max(9999),
        costCents: z.number().int().min(0),
        retailCents: z.number().int().min(0),
        discountCents: z.number().int().min(0).optional().default(0),
      }),
    )
    .max(100),
});
export type SaveJobInput = z.infer<typeof SaveJobInput>;

/**
 * Persist all edits to one job in a single transaction: rename, then sync labor
 * and part lines (delete removed, update existing, create new). Recompute totals.
 */
export async function saveJob(raw: SaveJobInput): Promise<EstimateResult> {
  const parsed = SaveJobInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job." };
  }
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, d.jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  const keepLabor = d.laborLines.filter((l) => l.id).map((l) => l.id!) as string[];
  const keepParts = d.partLines.filter((p) => p.id).map((p) => p.id!) as string[];

  await prisma.$transaction([
    prisma.job.updateMany({ where: { id: d.jobId, shopId }, data: { name: d.name, note: d.note ?? null } }),
    prisma.laborLine.deleteMany({
      where: { jobId: d.jobId, shopId, id: { notIn: keepLabor.length ? keepLabor : ["_none_"] } },
    }),
    prisma.partLine.deleteMany({
      where: { jobId: d.jobId, shopId, id: { notIn: keepParts.length ? keepParts : ["_none_"] } },
    }),
    ...d.laborLines.map((l, i) => {
      const amountCents = Math.round(l.hours * l.rateCents);
      const discountCents = Math.min(l.discountCents ?? 0, amountCents);
      const totalCents = Math.max(0, amountCents - discountCents);
      const costCents = l.costCents ?? 0;
      return l.id
        ? prisma.laborLine.updateMany({
            where: { id: l.id, jobId: d.jobId, shopId },
            data: {
              description: l.description,
              hours: l.hours,
              costCents,
              rateCents: l.rateCents,
              discountCents,
              totalCents,
              technicianId: l.technicianId ?? null,
              sortOrder: i,
            },
          })
        : prisma.laborLine.create({
            data: {
              shopId,
              jobId: d.jobId,
              description: l.description,
              hours: l.hours,
              costCents,
              rateCents: l.rateCents,
              discountCents,
              totalCents,
              technicianId: l.technicianId ?? null,
              sortOrder: i,
            },
          });
    }),
    ...d.partLines.map((p, i) => {
      const amountCents = p.retailCents * p.quantity;
      const discountCents = Math.min(p.discountCents ?? 0, amountCents);
      const totalCents = Math.max(0, amountCents - discountCents);
      return p.id
        ? prisma.partLine.updateMany({
            where: { id: p.id, jobId: d.jobId, shopId },
            data: {
              brand: p.brand ?? null,
              description: p.description,
              partNumber: p.partNumber ?? null,
              quantity: p.quantity,
              costCents: p.costCents,
              retailCents: p.retailCents,
              discountCents,
              totalCents,
              sortOrder: i,
            },
          })
        : prisma.partLine.create({
            data: {
              shopId,
              jobId: d.jobId,
              brand: p.brand ?? null,
              description: p.description,
              partNumber: p.partNumber ?? null,
              quantity: p.quantity,
              costCents: p.costCents,
              retailCents: p.retailCents,
              discountCents,
              totalCents,
              sortOrder: i,
            },
          });
    }),
  ]);

  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_JOB_SAVED, `Saved job "${d.name}"`, {
    jobId: d.jobId,
    laborLineCount: d.laborLines.length,
    partLineCount: d.partLines.length,
  });
  return done(ctx.ro.id);
}

const ReorderJobsInput = z.object({
  repairOrderId: z.string().min(1),
  orderedJobIds: z.array(z.string().min(1)).min(1).max(100),
});

/** Persist job card order after drag-and-drop in estimate lab. */
export async function reorderJobs(raw: z.infer<typeof ReorderJobsInput>): Promise<EstimateResult> {
  const parsed = ReorderJobsInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid job order." };
  }

  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ro = await loadEditableRo(shopId, parsed.data.repairOrderId);
  if (!ro) return { ok: false, error: "Repair order not found or is read-only." };

  const jobs = await prisma.job.findMany({
    where: { repairOrderId: parsed.data.repairOrderId, shopId },
    select: { id: true },
  });
  const jobIds = new Set(jobs.map((j) => j.id));
  if (
    parsed.data.orderedJobIds.length !== jobs.length ||
    parsed.data.orderedJobIds.some((id) => !jobIds.has(id))
  ) {
    return { ok: false, error: "Job order must include every job on this repair order." };
  }

  await prisma.$transaction(
    parsed.data.orderedJobIds.map((id, sortOrder) =>
      prisma.job.updateMany({ where: { id, shopId }, data: { sortOrder } }),
    ),
  );
  await auditEstimate(shopId, parsed.data.repairOrderId, ShopAuditEventType.ESTIMATE_JOB_UPDATED, "Reordered jobs");
  return done(parsed.data.repairOrderId);
}

/** Toggle whether a job's labor and/or parts are taxable, then recompute. */
export async function setJobTax(
  jobId: string,
  patch: { laborTaxable?: boolean; partsTaxable?: boolean },
): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  await prisma.job.updateMany({
    where: { id: jobId, shopId },
    data: { laborTaxable: patch.laborTaxable, partsTaxable: patch.partsTaxable },
  });
  await recompute(ctx.ro.id);
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_JOB_UPDATED, "Updated job tax settings", {
    jobId,
    ...patch,
  });
  return done(ctx.ro.id);
}

/** Assign (or clear) a job's technician. */
export async function assignJobTechnician(jobId: string, technicianId: string | null): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const job = await prisma.job.findFirst({ where: { id: jobId, shopId }, select: { repairOrderId: true } });
  if (!job) return { ok: false, error: "Job not found." };
  if (technicianId) {
    const member = await prisma.membership.findFirst({
      where: { shopId, userId: technicianId },
      select: { id: true },
    });
    if (!member) return { ok: false, error: "Technician is not a member of this shop." };
  }
  await prisma.job.updateMany({ where: { id: jobId, shopId }, data: { technicianId } });
  await auditEstimate(shopId, job.repairOrderId, ShopAuditEventType.ESTIMATE_JOB_UPDATED, "Assigned technician", {
    jobId,
    technicianId,
  });
  return done(job.repairOrderId);
}

/** Toggle advisor-recommended flag on a job (estimate lab / services parity). */
export async function setJobRecommended(jobId: string, recommended: boolean): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;

  const ctx = await loadEditableJob(shopId, jobId);
  if (!ctx) return { ok: false, error: "Job not found or repair order is read-only." };

  await prisma.job.updateMany({ where: { id: jobId, shopId }, data: { recommended } });
  await auditEstimate(shopId, ctx.ro.id, ShopAuditEventType.ESTIMATE_JOB_UPDATED, `Job recommended ${recommended ? "on" : "off"}`, {
    jobId,
    recommended,
  });
  return done(ctx.ro.id);
}

/** Toggle a whole job (and all its lines) in/out of the estimate. */
export async function toggleJobAuthorized(jobId: string, authorized: boolean): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateApprove(shopId);
  if (denied) return denied;

  const job = await prisma.job.findFirst({
    where: { id: jobId, shopId },
    select: { repairOrderId: true },
  });
  if (!job) return { ok: false, error: "Job not found." };

  await prisma.$transaction([
    prisma.job.updateMany({ where: { id: jobId, shopId }, data: { authorized } }),
    prisma.laborLine.updateMany({ where: { jobId, shopId }, data: { authorized } }),
    prisma.partLine.updateMany({ where: { jobId, shopId }, data: { authorized } }),
  ]);
  await recompute(job.repairOrderId);
  await auditEstimate(
    shopId,
    job.repairOrderId,
    ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
    `Job authorization set to ${authorized ? "approved" : "declined"}`,
    { jobId, authorized },
  );
  return done(job.repairOrderId);
}

/** Toggle one labor line; syncs the parent job's authorized flag. */
export async function toggleLaborAuthorized(lineId: string, authorized: boolean): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateApprove(shopId);
  if (denied) return denied;

  const line = await prisma.laborLine.findFirst({
    where: { id: lineId, shopId },
    select: { jobId: true, job: { select: { repairOrderId: true } } },
  });
  if (!line) return { ok: false, error: "Labor line not found." };

  await prisma.laborLine.updateMany({ where: { id: lineId, shopId }, data: { authorized } });
  await syncJobAuthorized(line.jobId, shopId);
  await recompute(line.job.repairOrderId);
  await auditEstimate(
    shopId,
    line.job.repairOrderId,
    ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
    `Labor line authorization set to ${authorized ? "approved" : "declined"}`,
    { lineId, authorized, lineType: "labor" },
  );
  return done(line.job.repairOrderId);
}

/** Toggle one part line; syncs the parent job's authorized flag. */
export async function togglePartAuthorized(lineId: string, authorized: boolean): Promise<EstimateResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateApprove(shopId);
  if (denied) return denied;

  const line = await prisma.partLine.findFirst({
    where: { id: lineId, shopId },
    select: { jobId: true, job: { select: { repairOrderId: true } } },
  });
  if (!line) return { ok: false, error: "Part line not found." };

  await prisma.partLine.updateMany({ where: { id: lineId, shopId }, data: { authorized } });
  await syncJobAuthorized(line.jobId, shopId);
  await recompute(line.job.repairOrderId);
  await auditEstimate(
    shopId,
    line.job.repairOrderId,
    ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
    `Part line authorization set to ${authorized ? "approved" : "declined"}`,
    { lineId, authorized, lineType: "part" },
  );
  return done(line.job.repairOrderId);
}

/** Job.authorized = true when every line is authorized and at least one line exists. */
async function syncJobAuthorized(jobId: string, shopId: string) {
  const [labor, parts] = await Promise.all([
    prisma.laborLine.findMany({ where: { jobId, shopId }, select: { authorized: true } }),
    prisma.partLine.findMany({ where: { jobId, shopId }, select: { authorized: true } }),
  ]);
  const lines = [...labor, ...parts];
  const authorized = lines.length > 0 && lines.every((l) => l.authorized);
  await prisma.job.updateMany({ where: { id: jobId, shopId }, data: { authorized } });
}
