"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { LEAD_SOURCES } from "@/lib/options";
import { gates } from "@/server/permission-gates";

export type MarketingResult = { ok: true } | { ok: false; error: string };

/** Lead-source names for the create-RO dropdown (falls back to the seed list). */
export async function getLeadSourceNames(): Promise<string[]> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  const rows = await prisma.leadSource.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  return rows.length ? rows.map((r) => r.name) : [...LEAD_SOURCES];
}

const Names = z.array(z.string().trim().min(1).max(60)).max(100);

/** Replace the shop's lead-source list (source of truth for marketing source). */
export async function saveLeadSources(names: string[]): Promise<MarketingResult> {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  const parsed = Names.safeParse(cleaned);
  if (!parsed.success) return { ok: false, error: "Enter at least one valid lead source." };
  if (!parsed.data.length) return { ok: false, error: "Add at least one lead source." };
  // De-dupe (case-insensitive) preserving order.
  const seen = new Set<string>();
  const uniq = parsed.data.filter((n) => {
    const k = n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  await prisma.$transaction([
    prisma.leadSource.deleteMany({ where: { shopId } }),
    prisma.leadSource.createMany({ data: uniq.map((name, i) => ({ shopId, name, sortOrder: i })) }),
  ]);

  revalidatePath("/settings/marketing");
  revalidatePath("/marketing/lead-sources");
  revalidatePath("/repair-orders/new");
  return { ok: true };
}
