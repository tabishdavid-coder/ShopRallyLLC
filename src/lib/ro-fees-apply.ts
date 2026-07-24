import { prisma } from "@/db/client";
import { recomputeRoTotals } from "@/lib/ro-total-sync";
import type { PrismaClient } from "@/generated/prisma";

/**
 * Sync RO-level shop fees with Settings → Shop Fees:
 * - Remove RO fees that match a template with autoApply=false
 * - Add missing autoApply=true templates (never duplicates by name)
 */
export async function ensureAutoApplyFees(
  shopId: string,
  repairOrderId: string,
  db: PrismaClient = prisma,
): Promise<boolean> {
  const ro = await db.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: { id: true },
  });
  if (!ro) return false;

  const [templates, existing] = await Promise.all([
    db.shopFeeTemplate.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
    }),
    db.fee.findMany({
      where: { shopId, repairOrderId, jobId: null },
      select: { id: true, name: true },
    }),
  ]);

  let changed = false;

  const activeNames = new Set(
    templates.filter((t) => t.autoApply).map((t) => t.name.trim().toLowerCase()),
  );
  const templateNames = new Set(templates.map((t) => t.name.trim().toLowerCase()));

  const inactiveIds = existing
    .filter((f) => {
      const key = f.name.trim().toLowerCase();
      return templateNames.has(key) && !activeNames.has(key);
    })
    .map((f) => f.id);

  if (inactiveIds.length) {
    await db.fee.deleteMany({ where: { id: { in: inactiveIds } } });
    changed = true;
  }

  const autoTemplates = templates.filter((t) => t.autoApply);
  if (!autoTemplates.length) {
    if (changed) await recomputeRoTotals(repairOrderId, db);
    return changed;
  }

  const refreshed = changed
    ? await db.fee.findMany({
        where: { shopId, repairOrderId, jobId: null },
        select: { name: true },
      })
    : existing;

  const have = new Set(refreshed.map((f) => f.name.trim().toLowerCase()));
  const missing = autoTemplates.filter((t) => !have.has(t.name.trim().toLowerCase()));
  if (!missing.length) {
    if (changed) await recomputeRoTotals(repairOrderId, db);
    return changed;
  }

  const baseSort = refreshed.length;
  await db.fee.createMany({
    data: missing.map((t, i) => ({
      shopId,
      repairOrderId,
      name: t.name,
      method: t.method,
      base: t.base,
      amount: t.amount,
      capCents: t.capCents,
      taxable: t.taxable,
      sortOrder: baseSort + i,
    })),
  });

  await recomputeRoTotals(repairOrderId, db);
  return true;
}

/** RO-level fees that match an active (autoApply) shop template, plus custom one-offs. */
export function filterActiveRoFees<
  T extends { name: string; jobId?: string | null },
>(
  fees: T[],
  templates: { name: string; autoApply: boolean }[],
): T[] {
  const templateMap = new Map(
    templates.map((t) => [t.name.trim().toLowerCase(), t.autoApply]),
  );
  return fees.filter((f) => {
    if (f.jobId) return true;
    const key = f.name.trim().toLowerCase();
    const autoApply = templateMap.get(key);
    if (autoApply === undefined) return true;
    return autoApply;
  });
}
