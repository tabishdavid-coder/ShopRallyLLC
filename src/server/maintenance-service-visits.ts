import "server-only";

import { prisma } from "@/db/client";
import { getRedeemableEntitlements } from "@/lib/maintenance-redemption";
import {
  checkVehicleGate,
  plateMatches,
  vinLast6,
  vinMatches,
  vehicleIdMatches,
} from "@/lib/maintenance-gatekeeper";
import {
  ensureSubscriptionEntitlements,
  getEnrolledVehicle,
} from "@/server/maintenance-subscriptions";
import {
  computeTermStatus,
  effectiveRemainingCount,
  intervalHintText,
  isEligibleToday,
  type ServiceProfileItem,
} from "@/lib/maintenance-service-profile";
import type { EntitlementKind } from "@/generated/prisma";

export type ServiceVisitAuditEntry = {
  id: string;
  performedAt: Date;
  performedByName: string | null;
  notes: string | null;
  mileageIn: number | null;
  status: string;
  voidReason: string | null;
  repairOrder: { id: string; number: number } | null;
  services: { label: string; quantity: number }[];
  gatekeeperVerified: boolean;
  gatekeeperMismatch: boolean;
  gatekeeperPlate: string | null;
  gatekeeperVinLast6: string | null;
};

export type SubscriptionServiceProfile = {
  subscriptionId: string;
  planName: string;
  status: string;
  services: ServiceProfileItem[];
  visits: ServiceVisitAuditEntry[];
};

async function loadSubscriptionForVisit(shopId: string, subscriptionId: string) {
  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    include: {
      plan: {
        include: {
          entitlements: {
            orderBy: { sortOrder: "asc" },
            include: {
              programService: { select: { name: true, description: true } },
            },
          },
        },
      },
      entitlements: true,
      vehicles: { include: { vehicle: true } },
    },
  });
  if (!sub) throw new Error("Subscription not found.");
  return sub;
}

export type GatekeeperInput = {
  plate?: string | null;
  vinLast6?: string | null;
  vehicleId?: string | null;
  confirmCheckbox?: boolean;
};

function resolveGatekeeperFields(
  enrolled: ReturnType<typeof getEnrolledVehicle>,
  opts: GatekeeperInput,
): {
  verified: boolean;
  mismatch: boolean;
  plate: string | null;
  vinLast6: string | null;
} {
  if (!enrolled) {
    return { verified: false, mismatch: true, plate: null, vinLast6: null };
  }

  if (opts.vehicleId && vehicleIdMatches(enrolled, opts.vehicleId)) {
    return {
      verified: true,
      mismatch: false,
      plate: enrolled.plate?.trim().toUpperCase() ?? null,
      vinLast6: vinLast6(enrolled.vin),
    };
  }

  const plate = opts.plate?.trim();
  if (plate) {
    const match = plateMatches(enrolled, plate);
    return {
      verified: match,
      mismatch: !match,
      plate: plate.toUpperCase(),
      vinLast6: null,
    };
  }

  const vin = opts.vinLast6?.trim();
  if (vin) {
    const match = vinMatches(enrolled, vin);
    return {
      verified: match,
      mismatch: !match,
      plate: null,
      vinLast6: vin.toUpperCase(),
    };
  }

  if (opts.confirmCheckbox) {
    return {
      verified: true,
      mismatch: false,
      plate: enrolled.plate?.trim().toUpperCase() ?? null,
      vinLast6: vinLast6(enrolled.vin),
    };
  }

  return { verified: false, mismatch: false, plate: null, vinLast6: null };
}

function assertGatekeeperForRedemption(
  enrolled: ReturnType<typeof getEnrolledVehicle>,
  visitVehicleId: string | null | undefined,
  visitGatekeeperVerified: boolean,
  opts?: GatekeeperInput,
) {
  if (visitGatekeeperVerified) return;

  const targetVehicleId = visitVehicleId ?? opts?.vehicleId;
  if (enrolled && targetVehicleId && vehicleIdMatches(enrolled, targetVehicleId)) {
    return;
  }

  const gate = checkVehicleGate(enrolled, {
    vehicleId: targetVehicleId,
    plate: opts?.plate,
    vin: opts?.vinLast6,
    requireExplicitConfirm: true,
  });

  if (gate.status === "blocked") {
    throw new Error(gate.message ?? "Vehicle does not match enrolled membership.");
  }

  const resolved = resolveGatekeeperFields(enrolled, {
    vehicleId: targetVehicleId,
    plate: opts?.plate,
    vinLast6: opts?.vinLast6,
    confirmCheckbox: opts?.confirmCheckbox,
  });

  if (!resolved.verified) {
    throw new Error("Vehicle gatekeeper verification is required before completing this visit.");
  }
}

async function lastPerformedByEntitlement(subscriptionId: string, shopId: string) {
  const redemptions = await prisma.planRedemption.findMany({
    where: { shopId, subscriptionId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { subscriptionEntitlementId: true } },
    },
  });

  const map = new Map<
    string,
    { performedAt: Date; performedByName: string | null }
  >();

  for (const r of redemptions) {
    const visitStatus = (r as { status?: string }).status;
    if (visitStatus === "VOIDED" || visitStatus === "IN_PROGRESS") continue;
    const performedAt = (r as { performedAt?: Date }).performedAt ?? r.createdAt;
    const performedByNameField = (r as { performedByName?: string | null }).performedByName;
    const name = performedByNameField?.trim() || null;
    for (const item of r.items) {
      if (map.has(item.subscriptionEntitlementId)) continue;
      map.set(item.subscriptionEntitlementId, {
        performedAt,
        performedByName: name,
      });
    }
  }
  return map;
}

export async function getSubscriptionServiceProfile(
  shopId: string,
  subscriptionId: string,
): Promise<SubscriptionServiceProfile | null> {
  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    include: {
      plan: { select: { name: true } },
    },
  });
  if (!sub) return null;

  await ensureSubscriptionEntitlements(shopId, subscriptionId);
  const full = await loadSubscriptionForVisit(shopId, subscriptionId);
  const lastMap = await lastPerformedByEntitlement(subscriptionId, shopId);
  const peMap = new Map(full.plan.entitlements.map((p) => [p.id, p]));

  const services: ServiceProfileItem[] = full.entitlements
    .map((se) => {
      const pe = peMap.get(se.planEntitlementId);
      if (!pe) return null;

      const last = lastMap.get(se.id);
      const kind = pe.kind as EntitlementKind;
      const remaining = effectiveRemainingCount(se.remainingCount, pe.quantity, se.usedCount);

      return {
        subscriptionEntitlementId: se.id,
        planEntitlementId: pe.id,
        kind,
        label: pe.programService?.name ?? pe.label,
        description: pe.programService?.description ?? null,
        quantity: pe.quantity,
        intervalDays: pe.intervalDays,
        usedCount: se.usedCount,
        remainingCount: remaining,
        nextEligibleAt: se.nextEligibleAt,
        termStatus: computeTermStatus(
          kind,
          se.usedCount,
          remaining,
          pe.quantity,
          se.nextEligibleAt,
        ),
        eligibleToday: isEligibleToday(
          kind,
          remaining,
          se.nextEligibleAt,
          pe.quantity,
          se.usedCount,
        ),
        intervalHint: intervalHintText(pe.intervalDays),
        lastPerformedAt: last?.performedAt ?? null,
        lastPerformedByName: last?.performedByName ?? null,
      };
    })
    .filter(Boolean) as ServiceProfileItem[];

  const visits = await getServiceVisitAudit(shopId, subscriptionId);

  return {
    subscriptionId: sub.id,
    planName: sub.plan.name,
    status: sub.status,
    services,
    visits,
  };
}

export async function getServiceVisitAudit(
  shopId: string,
  subscriptionId: string,
): Promise<ServiceVisitAuditEntry[]> {
  const rows = await prisma.planRedemption.findMany({
    where: { shopId, subscriptionId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      repairOrder: { select: { id: true, number: true } },
      items: true,
    },
  });

  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    select: { planId: true },
  });
  const planEntitlements = sub
    ? await prisma.planEntitlement.findMany({
        where: { planId: sub.planId },
        select: {
          id: true,
          label: true,
          programService: { select: { name: true } },
        },
      })
    : [];
  const labelByPeId = new Map(
    planEntitlements.map((p) => [p.id, p.programService?.name ?? p.label]),
  );

  const seIds = [...new Set(rows.flatMap((r) => r.items.map((i) => i.subscriptionEntitlementId)))];
  const seRows = seIds.length
    ? await prisma.subscriptionEntitlement.findMany({
        where: { id: { in: seIds } },
        select: { id: true, planEntitlementId: true },
      })
    : [];
  const peIdBySeId = new Map(seRows.map((s) => [s.id, s.planEntitlementId]));

  return rows.map((r) => {
    const performedAt = (r as { performedAt?: Date }).performedAt ?? r.createdAt;
    const performedByNameField = (r as { performedByName?: string | null }).performedByName;
    const visitStatus = (r as { status?: string }).status ?? "COMPLETED";
    const voidReason = (r as { voidReason?: string | null }).voidReason ?? null;
    const performedByName = performedByNameField?.trim() || null;

    return {
      id: r.id,
      performedAt,
      performedByName,
      notes: r.notes,
      mileageIn: r.mileageIn,
      status: visitStatus,
      voidReason,
      repairOrder: r.repairOrder,
      gatekeeperVerified: r.gatekeeperVerified,
      gatekeeperMismatch: r.gatekeeperMismatch,
      gatekeeperPlate: r.gatekeeperPlate,
      gatekeeperVinLast6: r.gatekeeperVinLast6,
      services: r.items.map((item) => ({
        label:
          labelByPeId.get(peIdBySeId.get(item.subscriptionEntitlementId) ?? "") ?? "Service",
        quantity: item.quantity,
      })),
    };
  });
}

export async function startServiceVisit(input: {
  shopId: string;
  subscriptionId: string;
  vehicleId?: string | null;
  repairOrderId?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  gatekeeper?: GatekeeperInput;
}) {
  const sub = await loadSubscriptionForVisit(input.shopId, input.subscriptionId);
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") {
    throw new Error("Subscription is not active.");
  }

  const enrolled = getEnrolledVehicle(sub);
  const gateFields = resolveGatekeeperFields(enrolled, {
    vehicleId: input.vehicleId,
    plate: input.gatekeeper?.plate,
    vinLast6: input.gatekeeper?.vinLast6,
    confirmCheckbox: input.gatekeeper?.confirmCheckbox,
  });

  const existing = await prisma.planRedemption.findFirst({
    where: {
      shopId: input.shopId,
      subscriptionId: input.subscriptionId,
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.planRedemption.create({
    data: {
      shopId: input.shopId,
      subscriptionId: input.subscriptionId,
      vehicleId: input.vehicleId ?? enrolled?.id ?? null,
      repairOrderId: input.repairOrderId ?? null,
      redeemedByUserId: input.performedByUserId ?? null,
      performedByName: input.performedByName ?? null,
      status: "IN_PROGRESS",
      performedAt: new Date(),
      gatekeeperVerified: gateFields.verified,
      gatekeeperVerifiedAt: gateFields.verified ? new Date() : null,
      gatekeeperPlate: gateFields.plate,
      gatekeeperVinLast6: gateFields.vinLast6,
      gatekeeperMismatch: gateFields.mismatch,
    },
  });
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function applyEntitlementUpdates(
  tx: TxClient,
  sub: Awaited<ReturnType<typeof loadSubscriptionForVisit>>,
  selected: string[],
) {
  const peMap = new Map(sub.plan.entitlements.map((p) => [p.id, p]));

  for (const seId of selected) {
    const se = sub.entitlements.find((e) => e.id === seId)!;
    const pe = peMap.get(se.planEntitlementId)!;

    if (pe.kind === "COUNTED" || pe.kind === "COUPON") {
      const remaining = effectiveRemainingCount(se.remainingCount, pe.quantity, se.usedCount);
      await tx.subscriptionEntitlement.update({
        where: { id: seId },
        data: {
          usedCount: { increment: 1 },
          remainingCount: Math.max(0, remaining - 1),
        },
      });
    } else if (pe.kind === "UNLIMITED" || pe.kind === "INTERVAL") {
      const days = pe.intervalDays ?? 90;
      const next = new Date();
      next.setDate(next.getDate() + days);
      await tx.subscriptionEntitlement.update({
        where: { id: seId },
        data: {
          usedCount: { increment: 1 },
          nextEligibleAt: next,
        },
      });
    } else if (pe.kind === "EVERY_VISIT") {
      await tx.subscriptionEntitlement.update({
        where: { id: seId },
        data: { usedCount: { increment: 1 } },
      });
    }
  }
}

export async function completeServiceVisit(input: {
  shopId: string;
  visitId: string;
  subscriptionEntitlementIds: string[];
  notes?: string | null;
  performedByName?: string | null;
  performedByUserId?: string | null;
  mileageIn?: number | null;
  gatekeeper?: GatekeeperInput;
}) {
  const visit = await prisma.planRedemption.findFirst({
    where: { id: input.visitId, shopId: input.shopId },
    include: { items: true },
  });
  if (!visit) throw new Error("Visit not found.");
  if (visit.status === "VOIDED") throw new Error("Visit was voided.");
  if (visit.status === "COMPLETED" && visit.items.length > 0) {
    throw new Error("Visit already completed.");
  }

  const sub = await loadSubscriptionForVisit(input.shopId, visit.subscriptionId);
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") {
    throw new Error("Subscription is not active.");
  }

  const enrolled = getEnrolledVehicle(sub);
  assertGatekeeperForRedemption(
    enrolled,
    visit.vehicleId,
    visit.gatekeeperVerified,
    input.gatekeeper,
  );

  const gateUpdate =
    !visit.gatekeeperVerified && input.gatekeeper
      ? resolveGatekeeperFields(enrolled, {
          vehicleId: visit.vehicleId,
          ...input.gatekeeper,
        })
      : null;

  const redeemable = getRedeemableEntitlements(sub, sub.plan.entitlements);
  const selected = input.subscriptionEntitlementIds.filter((id) =>
    redeemable.some((r) => r.subscriptionEntitlementId === id && r.eligible),
  );
  if (!selected.length) throw new Error("No eligible services selected.");

  return prisma.$transaction(async (tx) => {
    if (visit.status === "IN_PROGRESS") {
      await tx.redeemedEntitlement.createMany({
        data: selected.map((subscriptionEntitlementId) => ({
          shopId: input.shopId,
          redemptionId: visit.id,
          subscriptionEntitlementId,
          quantity: 1,
        })),
      });

      await applyEntitlementUpdates(tx, sub, selected);

      return tx.planRedemption.update({
        where: { id: visit.id },
        data: {
          status: "COMPLETED",
          performedAt: new Date(),
          notes: input.notes ?? visit.notes,
          performedByName: input.performedByName ?? visit.performedByName,
          redeemedByUserId: input.performedByUserId ?? visit.redeemedByUserId,
          mileageIn: input.mileageIn ?? visit.mileageIn,
          ...(gateUpdate
            ? {
                gatekeeperVerified: gateUpdate.verified,
                gatekeeperVerifiedAt: gateUpdate.verified ? new Date() : null,
                gatekeeperPlate: gateUpdate.plate,
                gatekeeperVinLast6: gateUpdate.vinLast6,
                gatekeeperMismatch: gateUpdate.mismatch,
              }
            : {}),
        },
      });
    }

    throw new Error("Invalid visit state.");
  });
}

/** One-step visit: create completed redemption with items (express / RO flows). */
export async function recordServiceVisit(input: {
  shopId: string;
  subscriptionId: string;
  subscriptionEntitlementIds: string[];
  vehicleId?: string | null;
  repairOrderId?: string | null;
  mileageIn?: number | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  gatekeeper?: GatekeeperInput;
}) {
  const sub = await loadSubscriptionForVisit(input.shopId, input.subscriptionId);
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") {
    throw new Error("Subscription is not active.");
  }

  const enrolled = getEnrolledVehicle(sub);
  assertGatekeeperForRedemption(enrolled, input.vehicleId, false, input.gatekeeper);
  const gateFields = resolveGatekeeperFields(enrolled, {
    vehicleId: input.vehicleId,
    plate: input.gatekeeper?.plate,
    vinLast6: input.gatekeeper?.vinLast6,
    confirmCheckbox: input.gatekeeper?.confirmCheckbox,
  });

  const redeemable = getRedeemableEntitlements(sub, sub.plan.entitlements);
  const selected = input.subscriptionEntitlementIds.filter((id) =>
    redeemable.some((r) => r.subscriptionEntitlementId === id && r.eligible),
  );
  if (!selected.length) throw new Error("No eligible services selected.");

  return prisma.$transaction(async (tx) => {
    const r = await tx.planRedemption.create({
      data: {
        shopId: input.shopId,
        subscriptionId: sub.id,
        repairOrderId: input.repairOrderId ?? null,
        vehicleId: input.vehicleId ?? enrolled?.id ?? null,
        mileageIn: input.mileageIn ?? null,
        redeemedByUserId: input.performedByUserId ?? null,
        performedByName: input.performedByName ?? null,
        notes: input.notes ?? null,
        status: "COMPLETED",
        performedAt: new Date(),
        gatekeeperVerified: gateFields.verified,
        gatekeeperVerifiedAt: gateFields.verified ? new Date() : null,
        gatekeeperPlate: gateFields.plate,
        gatekeeperVinLast6: gateFields.vinLast6,
        gatekeeperMismatch: gateFields.mismatch,
        items: {
          create: selected.map((subscriptionEntitlementId) => ({
            shopId: input.shopId,
            subscriptionEntitlementId,
            quantity: 1,
          })),
        },
      },
    });

    await applyEntitlementUpdates(tx, sub, selected);
    return r;
  });
}

export async function voidServiceVisit(input: {
  shopId: string;
  visitId: string;
  reason: string;
}) {
  const visit = await prisma.planRedemption.findFirst({
    where: { id: input.visitId, shopId: input.shopId },
    include: { items: true },
  });
  if (!visit) throw new Error("Visit not found.");
  if (visit.status === "VOIDED") throw new Error("Visit already voided.");
  if (visit.status !== "COMPLETED") {
    throw new Error("Only completed visits can be voided.");
  }

  const sub = await loadSubscriptionForVisit(input.shopId, visit.subscriptionId);
  const peMap = new Map(sub.plan.entitlements.map((p) => [p.id, p]));

  return prisma.$transaction(async (tx) => {
    for (const item of visit.items) {
      const se = sub.entitlements.find((e) => e.id === item.subscriptionEntitlementId);
      if (!se) continue;
      const pe = peMap.get(se.planEntitlementId);
      if (!pe) continue;

      if (pe.kind === "COUNTED" || pe.kind === "COUPON") {
        await tx.subscriptionEntitlement.update({
          where: { id: se.id },
          data: {
            usedCount: { decrement: item.quantity },
            remainingCount: (se.remainingCount ?? 0) + item.quantity,
          },
        });
      } else if (pe.kind === "UNLIMITED" || pe.kind === "INTERVAL") {
        await tx.subscriptionEntitlement.update({
          where: { id: se.id },
          data: { usedCount: { decrement: item.quantity } },
        });
      } else if (pe.kind === "EVERY_VISIT") {
        await tx.subscriptionEntitlement.update({
          where: { id: se.id },
          data: { usedCount: { decrement: item.quantity } },
        });
      }
    }

    return tx.planRedemption.update({
      where: { id: visit.id },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidReason: input.reason.trim() || "Voided by staff",
      },
    });
  });
}
