import "server-only";

import { prisma } from "@/db/client";
import type { PlatformSupportTicketRow } from "@/server/platform/support";

export type PlatformLeadStats = {
  openCount: number;
  totalCount: number;
};

export async function getPlatformLeadStats(): Promise<PlatformLeadStats> {
  const [openCount, totalCount] = await Promise.all([
    prisma.supportTicket.count({
      where: { shopId: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.supportTicket.count({ where: { shopId: null } }),
  ]);
  return { openCount, totalCount };
}

export async function listPlatformMarketingLeads(options?: {
  status?: "open" | "all";
  limit?: number;
}): Promise<PlatformSupportTicketRow[]> {
  const limit = Math.min(options?.limit ?? 100, 200);

  const rows = await prisma.supportTicket.findMany({
    where: {
      shopId: null,
      ...(options?.status === "open"
        ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((t) => ({
    id: t.id,
    shopId: null,
    shopName: null,
    name: t.name,
    email: t.email,
    subject: t.subject,
    body: t.body,
    category: t.category,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}
