import { ShopAuditEventType, type RoActivityType } from "@/generated/prisma";

export type RoManualActivityRow = {
  id: string;
  type: RoActivityType;
  description: string;
  createdAt: Date | string;
};

export type RoAuditFeedRow = {
  id: string;
  eventType: ShopAuditEventType;
  summary: string;
  actorEmail: string | null;
  createdAt: Date | string;
};

export type RoActivityFeedItem =
  | {
      kind: "manual";
      id: string;
      type: RoActivityType;
      description: string;
      createdAt: Date;
    }
  | {
      kind: "audit";
      id: string;
      eventType: ShopAuditEventType;
      summary: string;
      actorEmail: string | null;
      createdAt: Date;
    };

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Unified RO Activity timeline: manual RoActivity rows + ShopAuditEvents.
 * Skips RO_ACTIVITY_ADDED audit rows so manual entries are not duplicated.
 * Newest first (matches getRepairOrderAuditTrail).
 */
export function buildRoActivityFeed(
  activities: RoManualActivityRow[],
  auditEvents: RoAuditFeedRow[],
): RoActivityFeedItem[] {
  const items: RoActivityFeedItem[] = [
    ...activities.map((a) => ({
      kind: "manual" as const,
      id: `manual:${a.id}`,
      type: a.type,
      description: a.description,
      createdAt: toDate(a.createdAt),
    })),
    ...auditEvents
      .filter((e) => e.eventType !== ShopAuditEventType.RO_ACTIVITY_ADDED)
      .map((e) => ({
        kind: "audit" as const,
        id: `audit:${e.id}`,
        eventType: e.eventType,
        summary: e.summary,
        actorEmail: e.actorEmail,
        createdAt: toDate(e.createdAt),
      })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items;
}
