"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

export type MatrixResult = { ok: true } | { ok: false; error: string };

const PartTierInput = z
  .object({
    minCents: z.number().int().min(0),
    maxCents: z.number().int().min(0).nullable(),
    multiplier: z.number().positive().max(100),
  })
  .refine((d) => d.maxCents == null || d.maxCents > d.minCents, {
    message: "Cost to must be greater than cost from.",
  });

const LaborTierInput = z
  .object({
    minHours: z.number().min(0),
    maxHours: z.number().min(0).nullable(),
    multiplier: z.number().positive().max(100),
  })
  .refine((d) => d.maxHours == null || d.maxHours > d.minHours, {
    message: "Hours to must be greater than hours from.",
  });

const MARKUPS_PATHS = [
  "/settings/markups",
  "/settings/markups/parts",
  "/settings/markups/labor",
] as const;

function done(): MatrixResult {
  for (const path of MARKUPS_PATHS) revalidatePath(path);
  return { ok: true };
}

function rangesOverlap(
  aMin: number,
  aMax: number | null,
  bMin: number,
  bMax: number | null,
): boolean {
  const aEnd = aMax ?? Number.POSITIVE_INFINITY;
  const bEnd = bMax ?? Number.POSITIVE_INFINITY;
  return aMin <= bEnd && bMin <= aEnd;
}

async function validatePartTier(
  shopId: string,
  data: z.infer<typeof PartTierInput>,
  excludeId?: string,
): Promise<string | null> {
  const peers = await prisma.partMatrixTier.findMany({
    where: { shopId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { minCents: true, maxCents: true },
  });
  for (const p of peers) {
    if (rangesOverlap(data.minCents, data.maxCents, p.minCents, p.maxCents)) {
      return "This cost range overlaps an existing tier.";
    }
  }
  return null;
}

async function validateLaborTier(
  shopId: string,
  data: z.infer<typeof LaborTierInput>,
  excludeId?: string,
): Promise<string | null> {
  const peers = await prisma.laborMatrixTier.findMany({
    where: { shopId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { minHours: true, maxHours: true },
  });
  for (const p of peers) {
    if (rangesOverlap(data.minHours, data.maxHours, p.minHours, p.maxHours)) {
      return "This hours range overlaps an existing tier.";
    }
  }
  return null;
}

// ── Parts matrix ──────────────────────────────────────────────────────
export async function addPartTier(raw: z.input<typeof PartTierInput>): Promise<MatrixResult> {
  const parsed = PartTierInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const overlap = await validatePartTier(shopId, parsed.data);
  if (overlap) return { ok: false, error: overlap };
  const last = await prisma.partMatrixTier.findFirst({
    where: { shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.partMatrixTier.create({
    data: { shopId, ...parsed.data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  return done();
}

export async function updatePartTier(id: string, raw: z.input<typeof PartTierInput>): Promise<MatrixResult> {
  const parsed = PartTierInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const tier = await prisma.partMatrixTier.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!tier) return { ok: false, error: "Tier not found." };
  const overlap = await validatePartTier(shopId, parsed.data, id);
  if (overlap) return { ok: false, error: overlap };
  await prisma.partMatrixTier.update({ where: { id }, data: parsed.data });
  return done();
}

export async function deletePartTier(id: string): Promise<MatrixResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const tier = await prisma.partMatrixTier.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!tier) return { ok: false, error: "Tier not found." };
  await prisma.partMatrixTier.delete({ where: { id } });
  return done();
}

// ── Labor matrix ──────────────────────────────────────────────────────
export async function addLaborTier(raw: z.input<typeof LaborTierInput>): Promise<MatrixResult> {
  const parsed = LaborTierInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const overlap = await validateLaborTier(shopId, parsed.data);
  if (overlap) return { ok: false, error: overlap };
  const last = await prisma.laborMatrixTier.findFirst({
    where: { shopId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.laborMatrixTier.create({
    data: { shopId, ...parsed.data, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  return done();
}

export async function updateLaborTier(id: string, raw: z.input<typeof LaborTierInput>): Promise<MatrixResult> {
  const parsed = LaborTierInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const tier = await prisma.laborMatrixTier.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!tier) return { ok: false, error: "Tier not found." };
  const overlap = await validateLaborTier(shopId, parsed.data, id);
  if (overlap) return { ok: false, error: overlap };
  await prisma.laborMatrixTier.update({ where: { id }, data: parsed.data });
  return done();
}

export async function deleteLaborTier(id: string): Promise<MatrixResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return { ok: false, error: denied.error };
  const tier = await prisma.laborMatrixTier.findFirst({ where: { id, shopId }, select: { id: true } });
  if (!tier) return { ok: false, error: "Tier not found." };
  await prisma.laborMatrixTier.delete({ where: { id } });
  return done();
}
