"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { recordEstimateViewed } from "@/server/approval";
import { gates } from "@/server/permission-gates";

export type EstimateViewPoll = {
  viewed: boolean;
  viewedAt: string | null;
  notified: boolean;
  roNumber: number;
};

function isDbConnectivityError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string" &&
    ["P1001", "P1002", "P1017"].includes((err as { code: string }).code)
  );
}

async function fetchEstimateViewPoll(
  roId: string,
): Promise<EstimateViewPoll | null> {
  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return null;
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: {
      number: true,
      estimateViewedAt: true,
      estimateViewedNotifiedAt: true,
    },
  });
  if (!ro) return null;

  return {
    viewed: ro.estimateViewedAt != null,
    viewedAt: ro.estimateViewedAt?.toISOString() ?? null,
    notified: ro.estimateViewedNotifiedAt != null,
    roNumber: ro.number,
  };
}

/** Poll whether the customer has viewed the estimate (for RO detail toast). */
export async function pollEstimateViewed(roId: string): Promise<EstimateViewPoll | null> {
  try {
    return await fetchEstimateViewPoll(roId);
  } catch (err) {
    // Pool saturated — fail fast; do not retry (amplifies connection pressure in dev).
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2024"
    ) {
      return null;
    }
    if (isDbConnectivityError(err)) {
      try {
        return await fetchEstimateViewPoll(roId);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Mark the estimate-view toast as dismissed / notified for this RO. */
export async function markEstimateViewNotified(roId: string): Promise<void> {
  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return;
  await prisma.repairOrder.updateMany({
    where: { id: roId, shopId, estimateViewedNotifiedAt: null },
    data: { estimateViewedNotifiedAt: new Date() },
  });
  revalidatePath(`/repair-orders/${roId}`);
}

function revalidateEstimateViewedPaths(roId: string) {
  revalidatePath("/job-board");
  revalidatePath("/workflow");
  revalidatePath("/dashboard");
  revalidatePath(`/repair-orders/${roId}`);
}

/** Called from the public approval page on first load. */
export async function markEstimateViewedByToken(token: string): Promise<void> {
  const result = await recordEstimateViewed(token);
  if (result?.firstView) {
    revalidateEstimateViewedPaths(result.roId);
  }
}
