"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

export type CustomerSettingsResult = { ok: true } | { ok: false; error: string };

/** Tag options for the Add-Customer picker + list filter + drawer Profile. */
export async function getCustomerTagNames(): Promise<string[]> {
  const shopId = await getShopId();
  // Read path: anyone who can view customers can pick from the shop tag list.
  const denied = await gates.customersView(shopId);
  if (denied) return [];

  const rows = await prisma.customerTag.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

const Names = z.array(z.string().trim().min(1).max(40)).max(100);

/** Replace the shop's customer-tag list (source of truth). */
export async function saveCustomerTags(names: string[]): Promise<CustomerSettingsResult> {
  const parsed = Names.safeParse(names.map((n) => n.trim()).filter(Boolean));
  if (!parsed.success) return { ok: false, error: "Invalid tags." };
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
    prisma.customerTag.deleteMany({ where: { shopId } }),
    prisma.customerTag.createMany({ data: uniq.map((name, i) => ({ shopId, name, sortOrder: i })) }),
  ]);

  revalidatePath("/settings/customers");
  revalidatePath("/customers");
  return { ok: true };
}

/** Customer defaults (currently: default marketing opt-in for new customers). */
export async function updateCustomerDefaults(input: { defaultMarketingOptIn: boolean }): Promise<CustomerSettingsResult> {
  const parsed = z.object({ defaultMarketingOptIn: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  await prisma.shop.update({ where: { id: shopId }, data: { defaultMarketingOptIn: parsed.data.defaultMarketingOptIn } });
  revalidatePath("/settings/customers");
  revalidatePath("/customers");
  return { ok: true };
}
