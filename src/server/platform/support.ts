import "server-only";

import type { SupportTicketCategory, SupportTicketStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";

export type PlatformSupportTicketRow = {
  id: string;
  shopId: string | null;
  shopName: string | null;
  name: string;
  email: string;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  createdAt: Date;
  updatedAt: Date;
};

export async function listPlatformSupportTickets(options?: {
  status?: "open" | "all";
  category?: SupportTicketCategory | "all";
  limit?: number;
}): Promise<PlatformSupportTicketRow[]> {
  const limit = Math.min(options?.limit ?? 50, 200);

  const where: {
    status?: { in: SupportTicketStatus[] };
    category?: SupportTicketCategory;
  } = {};

  if (options?.status === "open") {
    where.status = { in: ["OPEN", "IN_PROGRESS"] };
  }
  if (options?.category && options.category !== "all") {
    where.category = options.category;
  }

  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      shop: { select: { name: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    shopId: t.shopId,
    shopName: t.shop?.name ?? null,
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

export async function getPlatformSupportTicket(id: string): Promise<PlatformSupportTicketRow | null> {
  const t = await prisma.supportTicket.findUnique({
    where: { id },
    include: { shop: { select: { name: true } } },
  });
  if (!t) return null;
  return {
    id: t.id,
    shopId: t.shopId,
    shopName: t.shop?.name ?? null,
    name: t.name,
    email: t.email,
    subject: t.subject,
    body: t.body,
    category: t.category,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
