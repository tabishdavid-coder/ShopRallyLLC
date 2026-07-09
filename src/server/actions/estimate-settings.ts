"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { EstimateJobsLayout } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";

const layoutSchema = z.nativeEnum(EstimateJobsLayout);

export async function updateEstimateJobsLayout(layout: EstimateJobsLayout) {
  const parsed = layoutSchema.safeParse(layout);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid jobs layout" };
  }

  const shopId = await getShopId();
  await prisma.shop.update({
    where: { id: shopId },
    data: { estimateJobsLayout: parsed.data },
  });

  revalidatePath("/settings/estimates/workspace");
  revalidatePath("/settings/ro-settings");
  revalidatePath("/repair-orders", "layout");

  return { ok: true as const };
}
