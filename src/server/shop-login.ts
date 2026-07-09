import "server-only";

import { prisma } from "@/db/client";

/** Track shop activity when a user opens the CRM (best-effort). */
export async function recordShopLogin(shopId: string, userId: string) {
  void userId;
  try {
    await prisma.shop.update({
      where: { id: shopId },
      data: { lastActiveAt: new Date() },
    });
  } catch {
    // Non-blocking — dev stub shops may not exist yet.
  }
}
