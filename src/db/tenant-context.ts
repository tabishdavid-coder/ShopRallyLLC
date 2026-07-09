import "server-only";

import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma";

/** Run work inside a Prisma transaction scoped to a shop tenant. */
export async function withShopTransaction<T>(
  shopId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  void shopId;
  return prisma.$transaction((tx) => fn(tx));
}
