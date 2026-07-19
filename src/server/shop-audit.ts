import "server-only";

import { prisma } from "@/db/client";
import { ShopAuditEventType, type Prisma } from "@/generated/prisma";
import { redactAuditMetadata } from "@/lib/data-compliance";
import { getCurrentUser } from "@/lib/platform";

export type RecordShopAuditInput = {
  shopId: string;
  eventType: ShopAuditEventType;
  summary: string;
  repairOrderId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Backfill / structural events (e.g. RO created before audit pipeline). */
  createdAt?: Date;
  /** Omit to use the current user; pass `null` for system/customer/webhook events. */
  actor?: { userId: string; email: string } | null;
};

const ESTIMATE_EVENT_TYPES: ShopAuditEventType[] = [
  ShopAuditEventType.ESTIMATE_JOB_ADDED,
  ShopAuditEventType.ESTIMATE_JOB_UPDATED,
  ShopAuditEventType.ESTIMATE_JOB_DELETED,
  ShopAuditEventType.ESTIMATE_JOB_SAVED,
  ShopAuditEventType.ESTIMATE_LINE_ADDED,
  ShopAuditEventType.ESTIMATE_LINE_UPDATED,
  ShopAuditEventType.ESTIMATE_LINE_DELETED,
  ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
  ShopAuditEventType.ESTIMATE_FEE_ADDED,
  ShopAuditEventType.ESTIMATE_FEE_UPDATED,
  ShopAuditEventType.ESTIMATE_FEE_DELETED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_ADDED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_UPDATED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_DELETED,
  ShopAuditEventType.ESTIMATE_APPROVED_BY_CUSTOMER,
  ShopAuditEventType.ESTIMATE_LINK_CREATED,
  ShopAuditEventType.ESTIMATE_LINK_REVOKED,
  ShopAuditEventType.RO_ACTIVITY_ADDED,
  ShopAuditEventType.RO_CREATED,
];

const PAYMENT_EVENT_TYPES: ShopAuditEventType[] = [
  ShopAuditEventType.PAYMENT_RECORDED,
  ShopAuditEventType.PAYMENT_CHECKOUT_STARTED,
  ShopAuditEventType.PAYMENT_REFUND_REQUESTED,
  ShopAuditEventType.INVOICE_LINK_CREATED,
  ShopAuditEventType.INVOICE_LINK_REVOKED,
  ShopAuditEventType.DEPOSIT_REQUEST_CREATED,
  ShopAuditEventType.DEPOSIT_REQUEST_SENT,
  ShopAuditEventType.DEPOSIT_PAID,
];

/** True when the event belongs on the estimate-scoped change log. */
export function isEstimateScopedAuditEvent(eventType: ShopAuditEventType): boolean {
  return ESTIMATE_EVENT_TYPES.includes(eventType);
}

async function resolveActor(input: RecordShopAuditInput) {
  if (input.actor === null) {
    return { actorUserId: null as string | null, actorEmail: null as string | null };
  }
  if (input.actor) {
    return { actorUserId: input.actor.userId, actorEmail: input.actor.email };
  }
  try {
    const user = await getCurrentUser();
    return { actorUserId: user.id, actorEmail: user.email };
  } catch {
    return { actorUserId: null, actorEmail: null };
  }
}

/** Append an immutable shop audit event (estimate edits, payments, compliance). */
export async function recordShopAuditEvent(
  input: RecordShopAuditInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const actor = await resolveActor(input);
  const metadata = input.metadata
    ? redactAuditMetadata(input.metadata)
    : undefined;

  return client.shopAuditEvent.create({
    data: {
      shopId: input.shopId,
      repairOrderId: input.repairOrderId ?? null,
      invoiceId: input.invoiceId ?? null,
      paymentId: input.paymentId ?? null,
      eventType: input.eventType,
      summary: input.summary,
      actorUserId: actor.actorUserId,
      actorEmail: actor.actorEmail,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

/** Best-effort audit write — never throws to callers. */
export async function recordShopAuditEventSafe(input: RecordShopAuditInput) {
  try {
    await recordShopAuditEvent(input);
  } catch (err) {
    console.error("[shop-audit] failed to record", input.eventType, err);
  }
}

export type RoCreatedAuditSource = "manual" | "freeform_intake" | "smart_intake";

const RO_CREATED_SUMMARY: Record<RoCreatedAuditSource, string> = {
  manual: "Repair order created",
  freeform_intake: "Repair order created via AI intake",
  smart_intake: "Repair order created via smart intake",
};

/** Seed the RO Activity tab with a structural creation entry (no manual RoActivity row). */
export async function recordRoCreatedAudit(input: {
  shopId: string;
  repairOrderId: string;
  roNumber: number;
  source?: RoCreatedAuditSource;
}) {
  const source = input.source ?? "manual";
  await recordShopAuditEventSafe({
    shopId: input.shopId,
    repairOrderId: input.repairOrderId,
    eventType: ShopAuditEventType.RO_CREATED,
    summary: `${RO_CREATED_SUMMARY[source]} (#${input.roNumber})`,
    metadata: { roNumber: input.roNumber, source },
  });
}

export type ShopAuditTrailScope = "all" | "estimate" | "payment";

export type ShopAuditEventRow = {
  id: string;
  eventType: ShopAuditEventType;
  summary: string;
  actorEmail: string | null;
  createdAt: Date;
  metadata: unknown;
};

async function repairOrderInShop(shopId: string, repairOrderId: string) {
  return prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: { id: true, number: true, createdAt: true },
  });
}

/**
 * Idempotent seed for the Activity tab — inserts RO_CREATED when missing
 * (older ROs or best-effort writes that failed silently).
 */
async function ensureRoCreatedAudit(
  shopId: string,
  repairOrderId: string,
  ro: { number: number; createdAt: Date },
) {
  const existing = await prisma.shopAuditEvent.findFirst({
    where: { shopId, repairOrderId, eventType: ShopAuditEventType.RO_CREATED },
    select: { id: true },
  });
  if (existing) return;

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId,
    eventType: ShopAuditEventType.RO_CREATED,
    summary: `Repair order created (#${ro.number})`,
    metadata: { roNumber: ro.number, source: "backfill" },
    createdAt: ro.createdAt,
    actor: null,
  });
}

/** Tenant-scoped audit trail for a repair order. */
export async function getRepairOrderAuditTrail(
  shopId: string,
  repairOrderId: string,
  scope: ShopAuditTrailScope = "all",
): Promise<ShopAuditEventRow[]> {
  const ro = await repairOrderInShop(shopId, repairOrderId);
  if (!ro) return [];

  if (scope === "all" || scope === "estimate") {
    await ensureRoCreatedAudit(shopId, repairOrderId, ro);
  }

  const where: Prisma.ShopAuditEventWhereInput = {
    shopId,
    repairOrderId,
  };

  if (scope === "estimate") {
    where.eventType = { in: ESTIMATE_EVENT_TYPES };
  } else if (scope === "payment") {
    where.eventType = { in: PAYMENT_EVENT_TYPES };
  }

  return prisma.shopAuditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      eventType: true,
      summary: true,
      actorEmail: true,
      createdAt: true,
      metadata: true,
    },
  });
}

export async function listShopAuditEvents(
  shopId: string,
  opts?: { limit?: number; cursor?: string },
) {
  return prisma.shopAuditEvent.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
    ...(opts?.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
  });
}
