import "server-only";

import { prisma } from "@/db/client";
import { generateMasterId } from "@/lib/master-id";

const MAX_ATTEMPTS = 12;

/** Assign a unique Master ID for a new shop (call before shop.create). */
export async function assignUniqueMasterId(shopCode: string): Promise<{
  masterId: string;
  masterIdCreatedAt: Date;
}> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const masterId = generateMasterId(shopCode);
    const existing = await prisma.shop.findUnique({
      where: { masterId },
      select: { id: true },
    });
    if (!existing) {
      return { masterId, masterIdCreatedAt: new Date() };
    }
  }
  throw new Error("Could not generate a unique Master ID.");
}
