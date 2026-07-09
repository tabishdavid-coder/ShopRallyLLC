"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import {
  mergeNotificationPreferences,
  NOTIFICATION_TYPES,
  type NotificationPreferences,
  type NotificationScope,
} from "@/lib/notification-types";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";

export type ShopActionResult = { ok: true } | { ok: false; error: string };

export type NotificationSettings = {
  authorizationNotifyEmail: string | null;
  shopEmail: string | null;
  preferences: NotificationPreferences;
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  const user = await getCurrentUser();

  const [shop, dbUser] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { authorizationNotifyEmail: true, email: true },
    }),
    prisma.user
      .findUnique({
        where: { id: user.id },
        select: { notificationPreferences: true },
      })
      .catch(() => null),
  ]);

  return {
    authorizationNotifyEmail: shop?.authorizationNotifyEmail ?? null,
    shopEmail: shop?.email ?? null,
    preferences: mergeNotificationPreferences(dbUser?.notificationPreferences),
  };
}

const ScopeSchema = z.enum(["ALL", "MY_WORK", "NONE"]);

const NotificationInput = z.object({
  authorizationNotifyEmail: z
    .string()
    .trim()
    .transform((s) => (s.length ? s : null))
    .nullable()
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address.",
    })
    .optional(),
  preferences: z.record(z.string(), ScopeSchema).optional(),
});

export async function updateNotificationSettings(
  input: z.infer<typeof NotificationInput>,
): Promise<ShopActionResult> {
  const parsed = NotificationInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const user = await getCurrentUser();

  if (parsed.data.authorizationNotifyEmail !== undefined) {
    await prisma.shop.update({
      where: { id: shopId },
      data: { authorizationNotifyEmail: parsed.data.authorizationNotifyEmail },
    });
  }

  if (parsed.data.preferences && !user.id.startsWith("stub-")) {
    const merged = mergeNotificationPreferences(parsed.data.preferences);
    await prisma.user.update({
      where: { id: user.id },
      data: { notificationPreferences: merged },
    });
  }

  revalidatePath("/settings/communications/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateNotificationPreference(
  typeKey: string,
  scope: NotificationScope,
): Promise<ShopActionResult> {
  if (!NOTIFICATION_TYPES.some((t) => t.key === typeKey)) {
    return { ok: false, error: "Unknown notification type." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const user = await getCurrentUser();
  if (user.id.startsWith("stub-")) {
    return { ok: true };
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notificationPreferences: true },
  });
  const prefs = mergeNotificationPreferences(existing?.notificationPreferences);
  prefs[typeKey as keyof NotificationPreferences] = scope;

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPreferences: prefs },
  });

  revalidatePath("/settings/communications/notifications");
  revalidatePath("/", "layout");
  return { ok: true };
}
