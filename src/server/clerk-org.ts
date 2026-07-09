import "server-only";

import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/db/client";
import { isClerkConfigured } from "@/lib/clerk-auth";

export async function getClerkSessionContext(): Promise<{
  userId: string | null;
  orgId: string | null;
}> {
  if (!isClerkConfigured()) return { userId: null, orgId: null };

  try {
    const session = await auth();
    return { userId: session.userId ?? null, orgId: session.orgId ?? null };
  } catch {
    return { userId: null, orgId: null };
  }
}

export async function shopIdForClerkOrg(clerkOrgId: string): Promise<string | null> {
  const shop = await prisma.shop.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  return shop?.id ?? null;
}
