import "server-only";

import { prisma } from "@/db/client";
import { customerDisplayName } from "@/lib/format";

export type ConversationRow = {
  customerId: string;
  customerName: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string | null;
  lastMessageAt: Date;
  lastBody: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  unreadCount: number;
  repairOrderId: string | null;
  repairOrderNumber: number | null;
};

/** Latest message per customer for the shop inbox. */
export async function listConversations(shopId: string): Promise<ConversationRow[]> {
  const messages = await prisma.message.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerId: true,
      body: true,
      direction: true,
      createdAt: true,
      readAt: true,
      repairOrderId: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
        },
      },
      repairOrder: { select: { number: true } },
    },
  });

  const byCustomer = new Map<string, (typeof messages)[number]>();
  const unreadByCustomer = new Map<string, number>();

  for (const m of messages) {
    if (!byCustomer.has(m.customerId)) byCustomer.set(m.customerId, m);
    if (m.direction === "INBOUND" && !m.readAt) {
      unreadByCustomer.set(m.customerId, (unreadByCustomer.get(m.customerId) ?? 0) + 1);
    }
  }

  return [...byCustomer.values()]
    .map((m) => ({
      customerId: m.customerId,
      customerName: customerDisplayName(m.customer),
      customerFirstName: m.customer.firstName,
      customerLastName: m.customer.lastName,
      customerPhone: m.customer.phone,
      lastMessageAt: m.createdAt,
      lastBody: m.body,
      lastDirection: m.direction,
      unreadCount: unreadByCustomer.get(m.customerId) ?? 0,
      repairOrderId: m.repairOrderId,
      repairOrderNumber: m.repairOrder?.number ?? null,
    }))
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

/** Stub row so /messages?customerId= deep-links work before the first SMS. */
export async function getCustomerMessageStub(
  shopId: string,
  customerId: string,
): Promise<ConversationRow | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
    },
  });
  if (!customer) return null;

  return {
    customerId: customer.id,
    customerName: customerDisplayName(customer),
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerPhone: customer.phone,
    lastMessageAt: new Date(0),
    lastBody: "",
    lastDirection: "OUTBOUND",
    unreadCount: 0,
    repairOrderId: null,
    repairOrderNumber: null,
  };
}

export async function countUnreadMessages(shopId: string): Promise<number> {
  return prisma.message.count({
    where: { shopId, direction: "INBOUND", readAt: null },
  });
}
