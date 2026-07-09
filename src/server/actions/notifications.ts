"use server";

import { revalidatePath } from "next/cache";

import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function markNotificationReadAction(
  notificationKey: string,
): Promise<ActionResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.jobBoardView(shopId);
    if (denied) return { ok: false, error: denied.error };
    await markNotificationRead(shopId, notificationKey);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not mark as read." };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const shopId = await getShopId();
    const denied = await gates.jobBoardView(shopId);
    if (denied) return { ok: false, error: denied.error };
    await markAllNotificationsRead(shopId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not mark all as read." };
  }
}
