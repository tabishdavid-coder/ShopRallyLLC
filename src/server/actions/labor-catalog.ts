"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import {
  refreshStaleLaborOperations,
  regenerateLaborOperation,
} from "@/server/labor-guide-cache";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

/**
 * Server actions for the Labor Guide catalog (Manage → Labor Guide). These let a
 * shop maintain the global labor-time dataset: refresh stale entries in bulk,
 * regenerate a single row, or delete one. Refresh/regenerate call the AI
 * provider, so they may take a few seconds.
 */

export type RefreshResult =
  | { ok: true; refreshed: number }
  | { ok: false; error: string };

/** Bulk-refresh the most-used stale rows (wires refreshStaleLaborOperations). */
export async function refreshStaleLaborCatalog(limit = 50): Promise<RefreshResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.employeesManage(shopId);
    if (denied) return denied;
    const refreshed = await refreshStaleLaborOperations(limit);
    revalidatePath("/labor-guide");
    return { ok: true, refreshed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Refresh failed." };
  }
}

export type CatalogActionResult = { ok: true } | { ok: false; error: string };

/** Force-regenerate one catalog row from the AI provider (ignores TTL). */
export async function regenerateLaborRow(id: string): Promise<CatalogActionResult> {
  if (!id) return { ok: false, error: "Missing row id." };
  try {
    const shopId = await getShopId();
    const denied = await gates.employeesManage(shopId);
    if (denied) return denied;
    const ok = await regenerateLaborOperation(id);
    if (!ok) return { ok: false, error: "Entry not found." };
    revalidatePath("/labor-guide");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Regenerate failed." };
  }
}

/** Remove a row from the catalog. */
export async function deleteLaborRow(id: string): Promise<CatalogActionResult> {
  if (!id) return { ok: false, error: "Missing row id." };
  try {
    const shopId = await getShopId();
    const denied = await gates.employeesManage(shopId);
    if (denied) return denied;
    await prisma.laborOperation.delete({ where: { id } });
    revalidatePath("/labor-guide");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete this entry." };
  }
}
