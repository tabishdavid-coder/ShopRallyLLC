"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import { getShopId } from "@/lib/shop";
import { recomputeRoTotals } from "@/server/estimate";
import { getShopMatrices, shopPartRetail } from "@/server/pricing-matrix";
import { syncPurchaseOrdersFromParts } from "@/server/purchase-orders";
import { getPartsTechForShop, type PartResult } from "@/server/services/partstech";
import { gates } from "@/server/permission-gates";

export type PunchoutResult =
  | { ok: true; mode: "mock" }
  | { ok: true; mode: "live"; redirectUrl: string }
  | { ok: false; error: string };

/**
 * Start a PartsTech punchout: creates a session pre-loaded with the vehicle and
 * returns the catalog redirect URL to embed. Falls back to mode "mock" (the
 * sample-catalog search) until partner credentials are configured.
 */
export async function startPunchout(roId: string, jobId?: string | null): Promise<PunchoutResult> {
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { vehicle: { select: { year: true, make: true, model: true, vin: true } } },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const provider = await getPartsTechForShop(shopId);
  if (provider.mode === "mock" || !provider.createPunchoutSession) return { ok: true, mode: "mock" };

  const returnUrl =
    publicUrl("/api/partstech/return") +
    `?roId=${encodeURIComponent(roId)}` +
    (jobId ? `&jobId=${encodeURIComponent(jobId)}` : "");

  try {
    const session = await provider.createPunchoutSession({ vehicle: ro.vehicle ?? undefined, returnUrl });
    return { ok: true, mode: "live", redirectUrl: session.redirectUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PartsTech punchout failed." };
  }
}

export type SearchResult =
  | { ok: true; mode: "live" | "mock"; parts: PartResult[] }
  | { ok: false; error: string };

/** Fetch finalized quote lines after punchout Submit quote (mapping step — no auto-import). */
export async function fetchPartsTechSessionQuote(
  sessionId: string,
  roId: string,
): Promise<SearchResult> {
  if (!sessionId.trim()) return { ok: false, error: "Missing PartsTech session." };
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const provider = await getPartsTechForShop(shopId);
  if (!provider.getQuote) return { ok: false, error: "PartsTech quote fetch not available." };

  try {
    const parts = await provider.getQuote(sessionId);
    const { partTiers } = await getShopMatrices(shopId);
    const priced = parts.map((p) => ({
      ...p,
      retailCents: partTiers.length ? shopPartRetail(p.costCents, partTiers) : p.retailCents,
    }));
    return { ok: true, mode: provider.mode, parts: priced };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load PartsTech quote." };
  }
}

/** Search PartsTech for parts for this RO's vehicle. */
export async function searchPartsTech(roId: string, query: string): Promise<SearchResult> {
  if (!query.trim()) return { ok: false, error: "Enter a part to search." };
  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { vehicle: { select: { year: true, make: true, model: true } } },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const provider = await getPartsTechForShop(shopId);
  try {
    const parts = await provider.searchParts({ query, vehicle: ro.vehicle ?? undefined });
    const { partTiers } = await getShopMatrices(shopId);
    const priced = parts.map((p) => ({
      ...p,
      retailCents: partTiers.length ? shopPartRetail(p.costCents, partTiers) : p.retailCents,
    }));
    return { ok: true, mode: provider.mode, parts: priced };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PartsTech search failed." };
  }
}

const ImportPart = z.object({
  partstechId: z.string(),
  brand: z.string().max(100),
  partNumber: z.string().max(100),
  description: z.string().max(300),
  quantity: z.number().int().min(1).max(999),
  costCents: z.number().int().min(0),
  retailCents: z.number().int().min(0),
  vendor: z.string().max(120).optional(),
});
const ImportInput = z.object({
  roId: z.string().min(1),
  jobId: z.string().nullable().optional(),
  jobName: z.string().max(200).optional(),
  parts: z.array(ImportPart).min(1).max(50),
});
export type ImportInput = z.infer<typeof ImportInput>;
export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

/** Import selected PartsTech parts as part lines on a job (creating one if needed). */
export async function importPartsToJob(
  raw: ImportInput,
  shopIdOverride?: string,
): Promise<ImportResult> {
  const parsed = ImportInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid import." };
  const d = parsed.data;

  const shopId = shopIdOverride ?? (await getShopId());
  if (!shopIdOverride) {
    const denied = await gates.estimateEdit(shopId);
    if (denied) return { ok: false, error: denied.error };
  }

  const ro = await prisma.repairOrder.findFirst({ where: { id: d.roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const { partTiers } = await getShopMatrices(shopId);
  const retail = (cost: number, clientRetail: number) =>
    partTiers.length ? shopPartRetail(cost, partTiers) : clientRetail;

  // Resolve target job: existing one, or create a new job to hold the parts.
  let jobId = d.jobId ?? null;
  if (jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, repairOrderId: d.roId, shopId }, select: { id: true } });
    if (!job) return { ok: false, error: "Target job not found." };
  } else {
    const last = await prisma.job.findFirst({ where: { repairOrderId: d.roId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const job = await prisma.job.create({
      data: { shopId, repairOrderId: d.roId, name: d.jobName?.trim() || "Parts", sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true },
    });
    jobId = job.id;
  }

  await prisma.partLine.createMany({
    data: d.parts.map((p) => {
      const retailCents = retail(p.costCents, p.retailCents);
      return {
        shopId,
        jobId: jobId!,
        description: p.description,
        partNumber: p.partNumber || null,
        brand: p.brand || null,
        quantity: p.quantity,
        costCents: p.costCents,
        retailCents,
        totalCents: retailCents * p.quantity,
        source: "PARTSTECH",
        status: "QUOTED",
        vendor: p.vendor ?? null,
        partstechId: p.partstechId,
      };
    }),
  });

  await recomputeRoTotals(d.roId);
  revalidatePath(`/repair-orders/${d.roId}/estimate`);
  return { ok: true, count: d.parts.length };
}

/** Move quoted parts to Ordered/Received (PartsHub "Submit Order"). */
export async function markPartsOrdered(partIds: string[]): Promise<ImportResult> {
  if (!partIds.length) return { ok: false, error: "Select at least one part." };
  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const parts = await prisma.partLine.findMany({
    where: { id: { in: partIds }, shopId },
    select: { id: true, job: { select: { repairOrderId: true } } },
  });
  if (!parts.length) return { ok: false, error: "Parts not found." };
  await prisma.partLine.updateMany({ where: { id: { in: parts.map((p) => p.id) } }, data: { status: "ORDERED" } });
  const roId = parts[0].job.repairOrderId;
  await syncPurchaseOrdersFromParts(shopId, roId);
  revalidatePath(`/repair-orders/${roId}/estimate`);
  revalidatePath(`/repair-orders/${roId}`);
  return { ok: true, count: parts.length };
}

const MappedItem = z.object({
  partstechId: z.string(),
  brand: z.string().max(100),
  partNumber: z.string().max(100),
  description: z.string().max(300),
  quantity: z.number().int().min(1).max(999),
  costCents: z.number().int().min(0),
  retailCents: z.number().int().min(0),
  vendor: z.string().max(120).optional(),
  method: z.enum(["add", "replace"]),
  jobId: z.string().nullable().optional(), // for method "add"
  replacePartId: z.string().optional(), // for method "replace"
});
const MapInput = z.object({ roId: z.string().min(1), items: z.array(MappedItem).min(1).max(50) });
export type MapInput = z.infer<typeof MapInput>;

/**
 * Commit quoted parts with per-part mapping: "add" → a chosen/new job; "replace"
 * → swap out an existing part line (new part lands on that part's job).
 */
export async function importMappedParts(raw: MapInput): Promise<ImportResult> {
  const parsed = MapInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid mapping." };
  const { roId, items } = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const { partTiers } = await getShopMatrices(shopId);
  const retail = (cost: number, clientRetail: number) =>
    partTiers.length ? shopPartRetail(cost, partTiers) : clientRetail;

  let fallbackJobId: string | null = null; // lazily-created "Parts" job for add-without-job
  async function partsJob(): Promise<string> {
    if (fallbackJobId) return fallbackJobId;
    const last = await prisma.job.findFirst({ where: { repairOrderId: roId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const job = await prisma.job.create({
      data: { shopId, repairOrderId: roId, name: "Parts", sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true },
    });
    fallbackJobId = job.id;
    return job.id;
  }

  for (const it of items) {
    let jobId: string;
    if (it.method === "replace" && it.replacePartId) {
      const existing = await prisma.partLine.findFirst({
        where: { id: it.replacePartId, shopId, job: { repairOrderId: roId } },
        select: { id: true, jobId: true },
      });
      if (!existing) return { ok: false, error: "Part to replace not found." };
      jobId = existing.jobId;
      await prisma.partLine.delete({ where: { id: existing.id } });
    } else if (it.jobId) {
      const job = await prisma.job.findFirst({ where: { id: it.jobId, repairOrderId: roId, shopId }, select: { id: true } });
      if (!job) return { ok: false, error: "Target job not found." };
      jobId = job.id;
    } else {
      jobId = await partsJob();
    }

    await prisma.partLine.create({
      data: {
        shopId,
        jobId,
        description: it.description,
        partNumber: it.partNumber || null,
        brand: it.brand || null,
        quantity: it.quantity,
        costCents: it.costCents,
        retailCents: retail(it.costCents, it.retailCents),
        totalCents: retail(it.costCents, it.retailCents) * it.quantity,
        source: "PARTSTECH",
        status: "QUOTED",
        vendor: it.vendor ?? null,
        partstechId: it.partstechId,
      },
    });
  }

  await recomputeRoTotals(roId);
  revalidatePath(`/repair-orders/${roId}/estimate`);
  return { ok: true, count: items.length };
}

const PhoneOrderInput = z.object({
  roId: z.string().min(1),
  jobId: z.string().nullable().optional(),
  vendor: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(100).optional(),
  description: z.string().trim().min(1, "Part description is required.").max(300),
  partNumber: z.string().trim().max(100).optional(),
  quantity: z.number().int().min(1).max(999),
  costCents: z.number().int().min(0),
  retailCents: z.number().int().min(0),
});
export type PhoneOrderInput = z.infer<typeof PhoneOrderInput>;

/** Add a phoned-in part quote manually (status QUOTED, source MANUAL). */
export async function addPhoneOrderPart(raw: PhoneOrderInput): Promise<ImportResult> {
  const parsed = PhoneOrderInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid part." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({ where: { id: d.roId, shopId }, select: { id: true } });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const { partTiers } = await getShopMatrices(shopId);
  const retailCents = partTiers.length ? shopPartRetail(d.costCents, partTiers) : d.retailCents;

  let jobId = d.jobId ?? null;
  if (jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, repairOrderId: d.roId, shopId }, select: { id: true } });
    if (!job) return { ok: false, error: "Target job not found." };
  } else {
    const last = await prisma.job.findFirst({ where: { repairOrderId: d.roId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const job = await prisma.job.create({
      data: { shopId, repairOrderId: d.roId, name: "Parts", sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true },
    });
    jobId = job.id;
  }

  await prisma.partLine.create({
    data: {
      shopId,
      jobId,
      description: d.description,
      partNumber: d.partNumber || null,
      brand: d.brand || null,
      quantity: d.quantity,
      costCents: d.costCents,
      retailCents,
      totalCents: retailCents * d.quantity,
      source: "MANUAL",
      status: "QUOTED",
      vendor: d.vendor || null,
    },
  });

  await recomputeRoTotals(d.roId);
  revalidatePath(`/repair-orders/${d.roId}/estimate`);
  return { ok: true, count: 1 };
}
