import "server-only";

import { prisma } from "@/db/client";
import { ROStatus, TireOrderStatus } from "@/generated/prisma";
import { customerDisplayName } from "@/lib/format";
import {
  mergeNotificationPreferences,
  type NotificationTypeKey,
} from "@/lib/notification-types";
import { getCurrentUser } from "@/lib/platform";
import { roEstimateActionHref } from "@/lib/ro-context-actions";

export type AppNotification = {
  id: string;
  type: NotificationTypeKey;
  title: string;
  timestamp: Date;
  href: string;
  read: boolean;
};

export type NotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
};

/** @deprecated Use NotificationsResult — kept for layout badge counts. */
export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  variant: "default" | "warning" | "urgent";
};

/** @deprecated Use NotificationsResult — kept for layout badge counts. */
export type NotificationSummary = {
  total: number;
  items: NotificationItem[];
};

const LOOKBACK_DAYS = 30;

function since(): Date {
  const d = new Date();
  d.setDate(d.getDate() - LOOKBACK_DAYS);
  return d;
}

async function loadReadKeys(shopId: string, userId: string): Promise<Set<string>> {
  try {
    const rows = await prisma.notificationRead.findMany({
      where: { shopId, userId },
      select: { notificationKey: true },
    });
    return new Set(rows.map((r) => r.notificationKey));
  } catch {
    return new Set();
  }
}

type RawEvent = Omit<AppNotification, "read">;

async function buildNotificationEvents(shopId: string): Promise<RawEvent[]> {
  const cutoff = since();
  const events: RawEvent[] = [];

  const [estimateViewed, roApproved, inboundSms, tirePending, recentPayments, roCompleted] =
    await Promise.all([
      prisma.repairOrder.findMany({
        where: {
          shopId,
          estimateViewedAt: { not: null, gte: cutoff },
        },
        select: {
          id: true,
          number: true,
          estimateViewedAt: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
        },
        orderBy: { estimateViewedAt: "desc" },
        take: 50,
      }),
      prisma.repairOrder.findMany({
        where: {
          shopId,
          authorizedAt: { not: null, gte: cutoff },
          approvedVia: "CUSTOMER",
        },
        select: {
          id: true,
          number: true,
          authorizedAt: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
          jobs: { select: { authorized: true } },
        },
        orderBy: { authorizedAt: "desc" },
        take: 50,
      }),
      prisma.message.findMany({
        where: {
          shopId,
          direction: "INBOUND",
          createdAt: { gte: cutoff },
        },
        select: {
          id: true,
          createdAt: true,
          customerId: true,
          repairOrderId: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
          repairOrder: { select: { number: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.tireOrder.findMany({
        where: { shopId, status: TireOrderStatus.PENDING_SUPPLIER_APPROVAL },
        select: {
          id: true,
          number: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.payment.findMany({
        where: { shopId, paidAt: { gte: cutoff } },
        select: {
          id: true,
          paidAt: true,
          amountCents: true,
          invoice: {
            select: {
              repairOrder: {
                select: {
                  id: true,
                  number: true,
                  customer: { select: { firstName: true, lastName: true, company: true } },
                },
              },
            },
          },
        },
        orderBy: { paidAt: "desc" },
        take: 30,
      }),
      prisma.repairOrder.findMany({
        where: {
          shopId,
          status: ROStatus.COMPLETED,
          completedAt: { not: null, gte: cutoff },
        },
        select: {
          id: true,
          number: true,
          completedAt: true,
          customer: { select: { firstName: true, lastName: true, company: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 30,
      }),
    ]);

  for (const ro of estimateViewed) {
    const name = customerDisplayName(ro.customer);
    events.push({
      id: `estimate-viewed:${ro.id}`,
      type: "CUSTOMER_VIEWED_ESTIMATE",
      title: `${name} viewed their estimate on RO#${ro.number}`,
      timestamp: ro.estimateViewedAt!,
      href: `/repair-orders/${ro.id}/estimate`,
    });
  }

  for (const ro of roApproved) {
    const name = customerDisplayName(ro.customer);
    const approved = ro.jobs.filter((j) => j.authorized).length;
    const total = ro.jobs.length || approved;
    events.push({
      id: `ro-approved:${ro.id}`,
      type: "RO_AUTHORIZED",
      title: `${name} approved ${approved} of ${total} jobs on RO#${ro.number}`,
      timestamp: ro.authorizedAt!,
      href: `/repair-orders/${ro.id}/estimate`,
    });
  }

  for (const msg of inboundSms) {
    const name = customerDisplayName(msg.customer);
    const roPart = msg.repairOrder ? ` on RO#${msg.repairOrder.number}` : "";
    events.push({
      id: `sms:${msg.id}`,
      type: "SMS_RECEIVED",
      title: `New text message from ${name}${roPart}`,
      timestamp: msg.createdAt,
      href: `/messages?customerId=${msg.customerId}`,
    });
  }

  for (const order of tirePending) {
    const name = customerDisplayName(order.customer);
    events.push({
      id: `tire-pending:${order.id}`,
      type: "TIRE_APPROVAL_PENDING",
      title: `Tire order #${order.number} for ${name} needs supplier approval`,
      timestamp: order.createdAt,
      href: `/tires/${order.id}`,
    });
  }

  for (const p of recentPayments) {
    const ro = p.invoice.repairOrder;
    const name = customerDisplayName(ro.customer);
    events.push({
      id: `payment:${p.id}`,
      type: "PAYMENT_RECEIVED",
      title: `Payment received from ${name} on RO#${ro.number}`,
      timestamp: p.paidAt,
      href: roEstimateActionHref(ro.id, "payment"),
    });
  }

  for (const ro of roCompleted) {
    const name = customerDisplayName(ro.customer);
    events.push({
      id: `ro-completed:${ro.id}`,
      type: "RO_COMPLETED",
      title: `RO#${ro.number} for ${name} was completed`,
      timestamp: ro.completedAt!,
      href: `/repair-orders/${ro.id}/estimate`,
    });
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return events;
}

export async function getNotifications(
  shopId: string,
  userId?: string,
): Promise<NotificationsResult> {
  let uid = userId;
  if (!uid) {
    try {
      uid = (await getCurrentUser()).id;
    } catch {
      uid = undefined;
    }
  }

  const [events, readKeys, userPrefs] = await Promise.all([
    buildNotificationEvents(shopId),
    uid ? loadReadKeys(shopId, uid) : Promise.resolve(new Set<string>()),
    uid
      ? prisma.user
          .findUnique({
            where: { id: uid },
            select: { notificationPreferences: true },
          })
          .then((u) => mergeNotificationPreferences(u?.notificationPreferences))
          .catch(() => mergeNotificationPreferences({}))
      : Promise.resolve(mergeNotificationPreferences({})),
  ]);

  const filtered = events.filter((e) => userPrefs[e.type] !== "NONE");

  const notifications: AppNotification[] = filtered.map((e) => ({
    ...e,
    read: readKeys.has(e.id),
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function getNotificationSummary(shopId: string): Promise<NotificationSummary> {
  const { notifications, unreadCount } = await getNotifications(shopId);

  const byType = new Map<string, AppNotification[]>();
  for (const n of notifications.filter((x) => !x.read)) {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }

  const variantFor = (type: NotificationTypeKey): NotificationItem["variant"] => {
    if (type === "TIRE_APPROVAL_PENDING") return "warning";
    return "default";
  };

  const labelFor = (type: NotificationTypeKey): string => {
    switch (type) {
      case "CUSTOMER_VIEWED_ESTIMATE":
        return "Customers viewed estimates";
      case "RO_AUTHORIZED":
        return "Repair orders authorized";
      case "SMS_RECEIVED":
        return "Unread text messages";
      case "TIRE_APPROVAL_PENDING":
        return "Tire supplier approvals";
      case "PAYMENT_RECEIVED":
        return "Payments received";
      case "RO_COMPLETED":
        return "Repair orders completed";
      default:
        return type.replace(/_/g, " ").toLowerCase();
    }
  };

  const hrefFor = (type: NotificationTypeKey, items: AppNotification[]): string => {
    if (type === "SMS_RECEIVED") return "/messages";
    if (type === "TIRE_APPROVAL_PENDING") return "/tires";
    return items[0]?.href ?? "/job-board";
  };

  const items: NotificationItem[] = [...byType.entries()].map(([type, list]) => ({
    id: type.toLowerCase(),
    title: labelFor(type as NotificationTypeKey),
    description: list[0]?.title ?? "",
    href: hrefFor(type as NotificationTypeKey, list),
    count: list.length,
    variant: variantFor(type as NotificationTypeKey),
  }));

  return { total: unreadCount, items };
}

export async function markNotificationRead(
  shopId: string,
  notificationKey: string,
  userId?: string,
): Promise<void> {
  let uid = userId;
  if (!uid) uid = (await getCurrentUser()).id;
  if (uid.startsWith("stub-")) return;

  await prisma.notificationRead.upsert({
    where: {
      shopId_userId_notificationKey: { shopId, userId: uid, notificationKey },
    },
    create: { shopId, userId: uid, notificationKey },
    update: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  shopId: string,
  userId?: string,
): Promise<void> {
  let uid = userId;
  if (!uid) uid = (await getCurrentUser()).id;
  if (uid.startsWith("stub-")) return;

  const { notifications } = await getNotifications(shopId, uid);
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({
      shopId,
      userId: uid!,
      notificationKey: n.id,
    })),
    skipDuplicates: true,
  });
}
