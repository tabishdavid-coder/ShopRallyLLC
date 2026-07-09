"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { recomputeRoTotals } from "@/server/estimate";
import { gates } from "@/server/permission-gates";
import { getShopMatrices, shopLaborRate } from "@/server/pricing-matrix";

export type ConcernResult = { ok: true } | { ok: false; error: string };

const Kind = z.enum(["CUSTOMER", "TECHNICIAN"]);
const Rating = z.enum(["GREEN", "YELLOW", "RED"]);
const MAX_CHARS = 2000;

function revalidate(roId: string): ConcernResult {
  revalidatePath(`/repair-orders/${roId}/estimate`);
  revalidatePath(`/repair-orders/${roId}/work-in-progress`);
  return { ok: true };
}

const CreateInput = z.object({
  roId: z.string().min(1),
  kind: Kind,
  text: z.string().trim().min(1, "Concern text is required.").max(MAX_CHARS),
  finding: z.string().trim().max(MAX_CHARS).nullable().optional(),
  inspectionRating: Rating.nullable().optional(),
});

export async function addConcern(raw: z.input<typeof CreateInput>): Promise<ConcernResult> {
  const parsed = CreateInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid concern." };

  const { roId, kind, text, finding, inspectionRating } = parsed.data;
  if (kind === "TECHNICIAN" && !inspectionRating) {
    return { ok: false, error: "Inspection rating is required." };
  }

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return denied;

  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const last = await prisma.concern.findFirst({
    where: { repairOrderId: roId, kind },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.concern.create({
    data: {
      shopId,
      repairOrderId: roId,
      kind,
      text,
      finding: finding?.trim() || null,
      inspectionRating: kind === "TECHNICIAN" ? inspectionRating : null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  return revalidate(roId);
}

const UpdateInput = z.object({
  text: z.string().trim().min(1, "Concern text is required.").max(MAX_CHARS),
  finding: z.string().trim().max(MAX_CHARS).nullable().optional(),
  inspectionRating: Rating.nullable().optional(),
});

export async function updateConcern(id: string, raw: z.input<typeof UpdateInput>): Promise<ConcernResult> {
  const parsed = UpdateInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid concern." };

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return denied;

  const c = await prisma.concern.findFirst({
    where: { id, shopId },
    select: { repairOrderId: true, kind: true },
  });
  if (!c) return { ok: false, error: "Concern not found." };

  if (c.kind === "TECHNICIAN" && !parsed.data.inspectionRating) {
    return { ok: false, error: "Inspection rating is required." };
  }

  await prisma.concern.update({
    where: { id },
    data: {
      text: parsed.data.text,
      finding: parsed.data.finding ?? null,
      ...(c.kind === "TECHNICIAN"
        ? { inspectionRating: parsed.data.inspectionRating ?? null }
        : {}),
    },
  });
  return revalidate(c.repairOrderId);
}

export async function deleteConcern(id: string): Promise<ConcernResult> {
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return denied;

  const c = await prisma.concern.findFirst({ where: { id, shopId }, select: { repairOrderId: true } });
  if (!c) return { ok: false, error: "Concern not found." };
  await prisma.concern.delete({ where: { id } });
  return revalidate(c.repairOrderId);
}

/** Create an estimate job from a concern (so the writer can price the fix). */
export async function copyConcernToEstimate(id: string): Promise<ConcernResult> {
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return denied;

  const c = await prisma.concern.findFirst({
    where: { id, shopId },
    select: { id: true, repairOrderId: true, text: true, finding: true, copiedJobId: true },
  });
  if (!c) return { ok: false, error: "Concern not found." };

  const [last, ro, { laborTiers }] = await Promise.all([
    prisma.job.findFirst({ where: { repairOrderId: c.repairOrderId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } }),
    prisma.repairOrder.findFirst({
      where: { id: c.repairOrderId, shopId },
      select: { laborRateCents: true, shop: { select: { laborRateCents: true } } },
    }),
    getShopMatrices(shopId),
  ]);
  const baseRate = ro?.laborRateCents ?? ro?.shop.laborRateCents ?? 0;
  const rateCents = shopLaborRate(baseRate, 0, laborTiers);

  // Description defaults to the concern text so the writer prices the exact
  // thing that was reported, instead of an empty "Labor description" field.
  const job = await prisma.job.create({
    data: {
      shopId,
      repairOrderId: c.repairOrderId,
      name: c.text,
      note: c.finding || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      laborLines: {
        create: [{ shopId, description: c.text, hours: 0, rateCents, totalCents: 0 }],
      },
    },
    select: { id: true },
  });
  await prisma.concern.update({ where: { id }, data: { copiedJobId: job.id } });
  await recomputeRoTotals(c.repairOrderId);
  return revalidate(c.repairOrderId);
}
