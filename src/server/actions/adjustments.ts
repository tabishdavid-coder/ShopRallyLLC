"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { recomputeRoTotals } from "@/server/estimate";
import { requireAnyPermission, requirePermission } from "@/server/permissions";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";

export type AdjustResult = { ok: true } | { ok: false; error: string };

const Method = z.enum(["PERCENT", "FIXED"]);
const Base = z.enum(["LABOR", "PARTS", "LABOR_PARTS"]);

const FeeInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  method: Method,
  base: Base,
  amount: z.number().int().min(0), // bps if PERCENT, cents if FIXED
  capCents: z.number().int().min(0).nullable().optional(),
  taxable: z.boolean().default(false),
});
const DiscountInput = FeeInput.omit({ capCents: true, taxable: true });

async function revalidate(roId: string): Promise<AdjustResult> {
  await recomputeRoTotals(roId);
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
  return { ok: true };
}

async function ownsRo(roId: string) {
  const shopId = await getShopId();
  const ro = await prisma.repairOrder.findFirst({ where: { id: roId, shopId }, select: { id: true } });
  return ro ? shopId : null;
}

/** Validate a job belongs to this RO/shop; returns true if ok (or no jobId). */
async function jobOk(roId: string, shopId: string, jobId?: string | null) {
  if (!jobId) return true;
  const job = await prisma.job.findFirst({ where: { id: jobId, repairOrderId: roId, shopId }, select: { id: true } });
  return Boolean(job);
}

async function gateEstimateEdit(shopId: string): Promise<AdjustResult | null> {
  const perm = await requirePermission(shopId, "estimate.edit");
  if (!perm.ok) return { ok: false, error: perm.error };
  return null;
}

async function gateDiscountEdit(shopId: string): Promise<AdjustResult | null> {
  const perm = await requireAnyPermission(shopId, ["estimate.edit", "payments.collect"]);
  if (!perm.ok) return { ok: false, error: perm.error };
  return null;
}

async function auditAdjust(
  shopId: string,
  repairOrderId: string,
  eventType: ShopAuditEventType,
  summary: string,
) {
  await recordShopAuditEventSafe({ shopId, repairOrderId, eventType, summary });
}

// ── Fees ──────────────────────────────────────────────────────────────
export async function addFee(roId: string, raw: z.input<typeof FeeInput>, jobId?: string | null): Promise<AdjustResult> {
  const parsed = FeeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid fee." };
  const shopId = await ownsRo(roId);
  if (!shopId) return { ok: false, error: "Repair order not found." };
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;
  if (!(await jobOk(roId, shopId, jobId))) return { ok: false, error: "Job not found." };
  const d = parsed.data;
  await prisma.fee.create({
    data: {
      shopId,
      repairOrderId: roId,
      jobId: jobId ?? null,
      name: d.name,
      method: d.method,
      base: d.base,
      amount: d.amount,
      capCents: d.capCents ?? null,
      taxable: d.taxable,
    },
  });
  await auditAdjust(shopId, roId, ShopAuditEventType.ESTIMATE_FEE_ADDED, `Added fee "${d.name}"`);
  return revalidate(roId);
}

export async function updateFee(feeId: string, raw: z.input<typeof FeeInput>): Promise<AdjustResult> {
  const parsed = FeeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid fee." };
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;
  const fee = await prisma.fee.findFirst({ where: { id: feeId, shopId }, select: { repairOrderId: true } });
  if (!fee) return { ok: false, error: "Fee not found." };
  const d = parsed.data;
  await prisma.fee.update({
    where: { id: feeId },
    data: { name: d.name, method: d.method, base: d.base, amount: d.amount, capCents: d.capCents ?? null, taxable: d.taxable },
  });
  await auditAdjust(shopId, fee.repairOrderId, ShopAuditEventType.ESTIMATE_FEE_UPDATED, `Updated fee "${d.name}"`);
  return revalidate(fee.repairOrderId);
}

export async function deleteFee(feeId: string): Promise<AdjustResult> {
  const shopId = await getShopId();
  const denied = await gateEstimateEdit(shopId);
  if (denied) return denied;
  const fee = await prisma.fee.findFirst({ where: { id: feeId, shopId }, select: { repairOrderId: true } });
  if (!fee) return { ok: false, error: "Fee not found." };
  await prisma.fee.delete({ where: { id: feeId } });
  await auditAdjust(shopId, fee.repairOrderId, ShopAuditEventType.ESTIMATE_FEE_DELETED, "Deleted fee");
  return revalidate(fee.repairOrderId);
}

// ── Discounts ─────────────────────────────────────────────────────────
export async function addDiscount(roId: string, raw: z.input<typeof DiscountInput>, jobId?: string | null): Promise<AdjustResult> {
  const parsed = DiscountInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid discount." };
  const shopId = await ownsRo(roId);
  if (!shopId) return { ok: false, error: "Repair order not found." };
  const denied = await gateDiscountEdit(shopId);
  if (denied) return denied;
  if (!(await jobOk(roId, shopId, jobId))) return { ok: false, error: "Job not found." };
  const d = parsed.data;
  await prisma.discount.create({
    data: { shopId, repairOrderId: roId, jobId: jobId ?? null, name: d.name, method: d.method, base: d.base, amount: d.amount },
  });
  await auditAdjust(shopId, roId, ShopAuditEventType.ESTIMATE_DISCOUNT_ADDED, `Added discount "${d.name}"`);
  return revalidate(roId);
}

export async function updateDiscount(discountId: string, raw: z.input<typeof DiscountInput>): Promise<AdjustResult> {
  const parsed = DiscountInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid discount." };
  const shopId = await getShopId();
  const denied = await gateDiscountEdit(shopId);
  if (denied) return denied;
  const disc = await prisma.discount.findFirst({ where: { id: discountId, shopId }, select: { repairOrderId: true } });
  if (!disc) return { ok: false, error: "Discount not found." };
  const d = parsed.data;
  await prisma.discount.update({
    where: { id: discountId },
    data: { name: d.name, method: d.method, base: d.base, amount: d.amount },
  });
  await auditAdjust(shopId, disc.repairOrderId, ShopAuditEventType.ESTIMATE_DISCOUNT_UPDATED, `Updated discount "${d.name}"`);
  return revalidate(disc.repairOrderId);
}

export async function deleteDiscount(discountId: string): Promise<AdjustResult> {
  const shopId = await getShopId();
  const denied = await gateDiscountEdit(shopId);
  if (denied) return denied;
  const disc = await prisma.discount.findFirst({ where: { id: discountId, shopId }, select: { repairOrderId: true } });
  if (!disc) return { ok: false, error: "Discount not found." };
  await prisma.discount.delete({ where: { id: discountId } });
  await auditAdjust(shopId, disc.repairOrderId, ShopAuditEventType.ESTIMATE_DISCOUNT_DELETED, "Deleted discount");
  return revalidate(disc.repairOrderId);
}
