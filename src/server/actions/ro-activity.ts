"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { RoActivityType, ShopAuditEventType } from "@/generated/prisma";

export type RoActivityResult = { ok: true; id: string } | { ok: false; error: string };

const AddActivityInput = z.object({
  repairOrderId: z.string().min(1),
  type: z.nativeEnum(RoActivityType),
  description: z.string().trim().min(1, "Description is required.").max(2000),
});

const ACTIVITY_TYPE_SUMMARY: Record<RoActivityType, string> = {
  NOTE: "note",
  PHONE_CALL: "phone call",
  EMAIL: "email",
  OTHER: "activity",
};

export async function addRoActivity(
  raw: z.infer<typeof AddActivityInput>,
): Promise<RoActivityResult> {
  const parsed = AddActivityInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid activity." };
  }

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: parsed.data.repairOrderId, shopId },
    select: { id: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const activity = await prisma.roActivity.create({
    data: {
      shopId,
      repairOrderId: ro.id,
      type: parsed.data.type,
      description: parsed.data.description,
    },
    select: { id: true },
  });

  const typeLabel = ACTIVITY_TYPE_SUMMARY[parsed.data.type];
  const preview =
    parsed.data.description.length > 80
      ? `${parsed.data.description.slice(0, 77)}…`
      : parsed.data.description;

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: ro.id,
    eventType: ShopAuditEventType.RO_ACTIVITY_ADDED,
    summary: `Logged ${typeLabel}: ${preview}`,
    metadata: {
      activityId: activity.id,
      activityType: parsed.data.type,
    },
  });

  for (const path of revalidateEstimatePaths(ro.id)) {
    revalidatePath(path);
  }
  return { ok: true, id: activity.id };
}
