import { prisma } from "@/db/client";
import type { AdjustBase, AdjustMethod, PrismaClient } from "@/generated/prisma";

/** Compute one fee/discount's cents value against the labor/parts bases. */
export function adjustmentValue(
  adj: { method: AdjustMethod; base: AdjustBase; amount: number; capCents?: number | null },
  laborCents: number,
  partsCents: number,
): number {
  const base =
    adj.base === "LABOR" ? laborCents : adj.base === "PARTS" ? partsCents : laborCents + partsCents;
  let v = adj.method === "PERCENT" ? Math.round((base * adj.amount) / 10000) : adj.amount;
  if (adj.capCents != null) v = Math.min(v, adj.capCents);
  return Math.max(0, v);
}

/**
 * Recompute and persist an RO's cached money totals from its lines, fees and
 * discounts. Single source of truth — used by every estimate mutation.
 */
export async function recomputeRoTotals(
  roId: string,
  db: PrismaClient = prisma,
): Promise<void> {
  const ro = await db.repairOrder.findUnique({
    where: { id: roId },
    select: {
      shopSuppliesCents: true,
      shop: { select: { taxRateBps: true, taxOnLabor: true, taxOnParts: true, taxOnFees: true, taxCapCents: true } },
      jobs: {
        select: {
          id: true,
          laborTaxable: true,
          partsTaxable: true,
          laborLines: { select: { totalCents: true, authorized: true, taxable: true } },
          partLines: { select: { totalCents: true, authorized: true, taxable: true } },
        },
      },
      fees: { select: { jobId: true, method: true, base: true, amount: true, capCents: true, taxable: true } },
      discounts: { select: { jobId: true, method: true, base: true, amount: true } },
    },
  });
  if (!ro) return;

  let labor = 0;
  let parts = 0;
  let taxableLabor = 0;
  let taxableParts = 0;
  const jobBase = new Map<string, { labor: number; parts: number }>();
  for (const j of ro.jobs) {
    const activeLabor = j.laborLines.filter((l) => l.authorized);
    const activeParts = j.partLines.filter((p) => p.authorized);
    const jl = activeLabor.reduce((x, l) => x + l.totalCents, 0);
    const jp = activeParts.reduce((x, p) => x + p.totalCents, 0);
    labor += jl;
    parts += jp;
    // Per-line taxable wins; fall back to job-level flags when unset.
    taxableLabor += activeLabor
      .filter((l) => (l.taxable ?? j.laborTaxable) === true)
      .reduce((x, l) => x + l.totalCents, 0);
    taxableParts += activeParts
      .filter((p) => (p.taxable ?? j.partsTaxable) === true)
      .reduce((x, p) => x + p.totalCents, 0);
    jobBase.set(j.id, { labor: jl, parts: jp });
  }
  const supplies = ro.shopSuppliesCents ?? 0;
  const taxBps = ro.shop.taxRateBps;
  if (!ro.shop.taxOnLabor) taxableLabor = 0;
  if (!ro.shop.taxOnParts) taxableParts = 0;

  const baseFor = (jobId: string | null) => {
    const b = jobId ? jobBase.get(jobId) : null;
    return b ?? { labor, parts };
  };

  const discountTotal = Math.min(
    labor + parts,
    ro.discounts.reduce((s, d) => {
      const b = baseFor(d.jobId);
      return s + adjustmentValue(d, b.labor, b.parts);
    }, 0),
  );

  let feesTotal = 0;
  let taxableFees = 0;
  for (const f of ro.fees) {
    const b = baseFor(f.jobId);
    const v = adjustmentValue(f, b.labor, b.parts);
    feesTotal += v;
    if (ro.shop.taxOnFees && f.taxable) taxableFees += v;
  }

  const taxableBase = Math.max(0, taxableLabor + taxableParts - discountTotal) + supplies + taxableFees;
  let tax = Math.round((taxableBase * taxBps) / 10000);
  if (ro.shop.taxCapCents != null) tax = Math.min(tax, ro.shop.taxCapCents);
  const total = labor + parts + supplies - discountTotal + feesTotal + tax;

  await db.repairOrder.update({
    where: { id: roId },
    data: {
      laborSubtotalCents: labor,
      partsSubtotalCents: parts,
      feesSubtotalCents: feesTotal,
      discountCents: discountTotal,
      taxCents: tax,
      totalCents: total,
    },
  });

  const inv = await db.invoice.findFirst({
    where: { repairOrderId: roId },
    select: { id: true, totalCents: true, balanceCents: true },
  });
  if (inv && inv.balanceCents === inv.totalCents) {
    const invoiceSubtotal = labor + parts + supplies + feesTotal - discountTotal;
    await db.invoice.update({
      where: { id: inv.id },
      data: {
        subtotalCents: invoiceSubtotal,
        taxCents: tax,
        totalCents: total,
        balanceCents: total,
      },
    });
  }
}
