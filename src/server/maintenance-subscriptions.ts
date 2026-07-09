import "server-only";

import { addMonths } from "@/lib/dates";
import { getRedeemableEntitlements } from "@/lib/maintenance-redemption";
import {
  checkVehicleGate,
  enrolledVehicleLabel,
  isPlateOrVinQuery,
  type EnrolledVehicle,
  type VehicleGateResult,
} from "@/lib/maintenance-gatekeeper";
import { prisma } from "@/db/client";
import type {
  EntitlementKind,
  MaintenanceVehicleClass,
  PlanSubscriptionStatus,
  SubscriptionPaymentMode,
} from "@/generated/prisma";

const subscriptionInclude = {
  plan: {
    include: { entitlements: { orderBy: { sortOrder: "asc" as const } } },
  },
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
    },
  },
  vehicles: {
    include: {
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          plate: true,
          plateState: true,
          vin: true,
        },
      },
    },
  },
  entitlements: true,
  redemptions: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: {
      items: true,
      repairOrder: { select: { id: true, number: true } },
    },
  },
  payments: { orderBy: { paidAt: "desc" as const }, take: 12 },
} as const;

export type SubscriptionDetail = NonNullable<Awaited<ReturnType<typeof getSubscriptionDetail>>>;

export type SubscriberListRow = Awaited<ReturnType<typeof listSubscribers>>[number];

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
}

export function subscriptionProgressSummary(
  entitlements: {
    kind: EntitlementKind;
    label: string;
    usedCount: number;
    remainingCount: number | null;
    planEntitlement: { quantity: number | null; label: string };
  }[],
): string {
  const counted = entitlements.find(
    (e) => e.kind === "COUNTED" && e.remainingCount != null && e.planEntitlement.quantity,
  );
  if (!counted) return "Member";
  const total = counted.planEntitlement.quantity ?? 0;
  const used = counted.usedCount;
  const short = counted.planEntitlement.label.split(" ")[0]?.toLowerCase() ?? "service";
  return `${used}/${total} ${short}`;
}

export async function listSubscribers(
  shopId: string,
  opts?: { status?: PlanSubscriptionStatus; search?: string; customerId?: string },
) {
  const q = opts?.search?.trim();
  const rows = await prisma.planSubscription.findMany({
    where: {
      shopId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.customerId ? { customerId: opts.customerId } : {}),
      ...(q
        ? {
            OR: [
              { customer: { firstName: { contains: q, mode: "insensitive" } } },
              { customer: { lastName: { contains: q, mode: "insensitive" } } },
              { customer: { phone: { contains: q } } },
              { plan: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      plan: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true, company: true, phone: true } },
      vehicles: {
        include: {
          vehicle: { select: { year: true, make: true, model: true } },
        },
      },
      entitlements: true,
      _count: { select: { redemptions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const planEntMap = new Map<string, { kind: EntitlementKind; label: string; quantity: number | null }>();
  const planIds = [...new Set(rows.map((r) => r.planId))];
  if (planIds.length) {
    const ents = await prisma.planEntitlement.findMany({
      where: { planId: { in: planIds } },
      select: { id: true, planId: true, kind: true, label: true, quantity: true },
    });
    for (const e of ents) planEntMap.set(e.id, e);
  }

  return rows.map((sub) => {
    const vehicle = sub.vehicles[0]?.vehicle;
    const entRows = sub.entitlements.map((e) => {
      const pe = planEntMap.get(e.planEntitlementId);
      return {
        kind: pe?.kind ?? ("COUNTED" as EntitlementKind),
        label: pe?.label ?? "",
        usedCount: e.usedCount,
        remainingCount: e.remainingCount,
        planEntitlement: { quantity: pe?.quantity ?? null, label: pe?.label ?? "" },
      };
    });
    return {
      id: sub.id,
      status: sub.status,
      paymentMode: sub.paymentMode,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt,
      createdAt: sub.createdAt,
      planId: sub.planId,
      customerId: sub.customerId,
      planName: sub.plan.name,
      customerName: sub.customer.company?.trim()
        ? sub.customer.company
        : `${sub.customer.lastName} ${sub.customer.firstName}`.trim(),
      phone: sub.customer.phone,
      vehicleLabel: vehicle ? vehicleLabel(vehicle) : "—",
      progress: subscriptionProgressSummary(entRows),
      redemptionCount: sub._count.redemptions,
      memberPortalToken: sub.memberPortalToken,
    };
  });
}

export async function getSubscriptionDetail(shopId: string, subscriptionId: string) {
  await ensureSubscriptionEntitlements(shopId, subscriptionId);

  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    include: subscriptionInclude,
  });
  if (!sub) return null;

  const planEntitlements = await prisma.planEntitlement.findMany({
    where: { planId: sub.planId },
  });
  const peById = new Map(planEntitlements.map((e) => [e.id, e]));

  const entitlements = sub.entitlements
    .map((e) => {
      const pe = peById.get(e.planEntitlementId);
      if (!pe) return null;
      return {
        ...e,
        kind: pe.kind,
        label: pe.label,
        quantity: pe.quantity,
        intervalDays: pe.intervalDays,
      };
    })
    .filter(Boolean) as typeof sub.entitlements &
    { kind: string; label: string; quantity: number | null; intervalDays: number | null }[];

  return { ...sub, entitlements };
}

export async function getSubscriptionByPortalToken(token: string) {
  const sub = await prisma.planSubscription.findUnique({
    where: { memberPortalToken: token },
    include: subscriptionInclude,
  });
  if (!sub) return null;

  await ensureSubscriptionEntitlements(sub.shopId, sub.id);

  const refreshed = await prisma.planSubscription.findUnique({
    where: { memberPortalToken: token },
    include: subscriptionInclude,
  });
  if (!refreshed) return null;

  const planEntitlements = await prisma.planEntitlement.findMany({
    where: { planId: refreshed.planId },
  });
  const peById = new Map(planEntitlements.map((e) => [e.id, e]));

  const entitlements = refreshed.entitlements
    .map((e) => {
      const pe = peById.get(e.planEntitlementId);
      if (!pe) return null;
      return { ...e, kind: pe.kind, label: pe.label, quantity: pe.quantity };
    })
    .filter(Boolean) as (typeof refreshed.entitlements[number] & {
      kind: EntitlementKind;
      label: string;
      quantity: number | null;
    })[];

  return { ...refreshed, entitlements };
}

export async function findActiveSubscriptionsForVehicle(shopId: string, vehicleId: string) {
  const links = await prisma.subscriptionVehicle.findMany({
    where: { shopId, vehicleId },
    select: { subscriptionId: true },
  });
  if (!links.length) return [];

  const subs = await prisma.planSubscription.findMany({
    where: {
      shopId,
      id: { in: links.map((l) => l.subscriptionId) },
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    include: {
      plan: { include: { entitlements: { orderBy: { sortOrder: "asc" } } } },
      entitlements: true,
      vehicles: { include: { vehicle: true } },
    },
  });
  return subs;
}

export type MemberLookupRow = Awaited<ReturnType<typeof lookupSubscriptionByPhoneOrPlate>>[number];

export function getEnrolledVehicle(
  sub: { vehicles: { vehicle: EnrolledVehicle }[] },
): EnrolledVehicle | null {
  return sub.vehicles[0]?.vehicle ?? null;
}

export function buildMemberVehicleGate(
  sub: { vehicles: { vehicle: EnrolledVehicle }[] },
  query: string,
  scannedVehicleId?: string | null,
): VehicleGateResult {
  const enrolled = getEnrolledVehicle(sub);
  return checkVehicleGate(enrolled, {
    vehicleId: scannedVehicleId,
    query: isPlateOrVinQuery(query) ? query : undefined,
    requireExplicitConfirm: !isPlateOrVinQuery(query) && !scannedVehicleId,
  });
}

async function assertVehicleBelongsToCustomer(
  shopId: string,
  customerId: string,
  vehicleIds: string[],
) {
  if (!vehicleIds.length) {
    throw new Error("A vehicle is required to enroll in a maintenance plan.");
  }
  if (vehicleIds.length !== 1) {
    throw new Error("Maintenance plans are locked to exactly one vehicle.");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleIds[0], shopId, customerId },
    select: { id: true },
  });
  if (!vehicle) {
    throw new Error("Selected vehicle does not belong to this customer.");
  }
}

export async function lookupSubscriptionByPhoneOrPlate(shopId: string, query: string) {
  const q = query.trim();
  if (!q) return [];

  const digits = q.replace(/\D/g, "");
  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      OR: [
        ...(digits.length >= 7 ? [{ phoneDigits: { contains: digits } }] : []),
        { phone: { contains: q } },
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
      ],
    },
    select: { id: true },
    take: 5,
  });

  const vehicles = await prisma.vehicle.findMany({
    where: {
      shopId,
      OR: [
        { plate: { contains: q, mode: "insensitive" } },
        { vin: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, customerId: true },
    take: 5,
  });

  const scannedVehicleId = vehicles.length === 1 ? vehicles[0]!.id : null;

  const tokenMatch = await prisma.planSubscription.findMany({
    where: {
      shopId,
      memberPortalToken: { contains: q, mode: "insensitive" },
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    select: { customerId: true },
    take: 3,
  });

  const customerIds = [
    ...new Set([
      ...customers.map((c) => c.id),
      ...vehicles.map((v) => v.customerId),
      ...tokenMatch.map((t) => t.customerId),
    ]),
  ];
  if (!customerIds.length) return [];

  const rows = await prisma.planSubscription.findMany({
    where: {
      shopId,
      customerId: { in: customerIds },
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    include: {
      plan: { include: { entitlements: { orderBy: { sortOrder: "asc" } } } },
      customer: { select: { firstName: true, lastName: true, company: true, phone: true } },
      vehicles: { include: { vehicle: true } },
      entitlements: true,
    },
    take: 10,
  });

  return rows.map((sub) => ({
    ...sub,
    vehicleGate: buildMemberVehicleGate(sub, q, scannedVehicleId),
    enrolledVehicle: getEnrolledVehicle(sub),
  }));
}

/** @deprecated Alias — use lookupSubscriptionByPhoneOrPlate */
export const lookupMemberForVisit = lookupSubscriptionByPhoneOrPlate;

function initialRemaining(kind: EntitlementKind, quantity: number | null): number | null {
  if (kind === "COUNTED" || kind === "COUPON") return quantity ?? 1;
  return null;
}

function subscriptionEntitlementDefaults(
  shopId: string,
  subscriptionId: string,
  pe: {
    id: string;
    kind: EntitlementKind;
    quantity: number | null;
    creditCents: number | null;
  },
) {
  return {
    shopId,
    subscriptionId,
    planEntitlementId: pe.id,
    usedCount: 0,
    remainingCount: initialRemaining(pe.kind, pe.quantity),
    creditBalanceCents: pe.kind === "CREDIT" ? pe.creditCents : null,
    nextEligibleAt: pe.kind === "INTERVAL" || pe.kind === "UNLIMITED" ? new Date() : null,
  };
}

/** Ensure subscription rows exist for every plan entitlement (repairs stale IDs after plan sync). */
export async function ensureSubscriptionEntitlements(shopId: string, subscriptionId: string) {
  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    select: { planId: true },
  });
  if (!sub) return;

  const planEntitlements = await prisma.planEntitlement.findMany({
    where: { planId: sub.planId, shopId },
    orderBy: { sortOrder: "asc" },
  });
  if (!planEntitlements.length) return;

  const existing = await prisma.subscriptionEntitlement.findMany({
    where: { subscriptionId, shopId },
    include: { redemptions: { select: { id: true }, take: 1 } },
  });

  const validPeIds = new Set(planEntitlements.map((pe) => pe.id));
  const linkedPeIds = new Set(
    existing.filter((e) => validPeIds.has(e.planEntitlementId)).map((e) => e.planEntitlementId),
  );
  const missingPlanEnts = planEntitlements.filter((pe) => !linkedPeIds.has(pe.id));
  let orphaned = existing.filter((e) => !validPeIds.has(e.planEntitlementId));

  await prisma.$transaction(async (tx) => {
    const remapCount = Math.min(missingPlanEnts.length, orphaned.length);
    for (let i = 0; i < remapCount; i++) {
      const pe = missingPlanEnts[i]!;
      const orphan = orphaned[i]!;
      await tx.subscriptionEntitlement.update({
        where: { id: orphan.id },
        data: { planEntitlementId: pe.id },
      });
      linkedPeIds.add(pe.id);
    }

    orphaned = orphaned.slice(remapCount);
    const stillMissing = planEntitlements.filter((pe) => !linkedPeIds.has(pe.id));

    if (stillMissing.length) {
      await tx.subscriptionEntitlement.createMany({
        data: stillMissing.map((pe) =>
          subscriptionEntitlementDefaults(shopId, subscriptionId, pe),
        ),
      });
    }

    for (const orphan of orphaned) {
      if (orphan.usedCount === 0 && orphan.redemptions.length === 0) {
        await tx.subscriptionEntitlement.delete({ where: { id: orphan.id } });
      }
    }
  });
}

export async function activateSubscriptionEntitlements(
  shopId: string,
  subscriptionId: string,
  _planId: string,
) {
  await ensureSubscriptionEntitlements(shopId, subscriptionId);
}

export async function createPendingPlanSubscription(input: {
  shopId: string;
  planId: string;
  customerId: string;
  vehicleIds: string[];
  paymentMode: SubscriptionPaymentMode;
  vehicleClass?: MaintenanceVehicleClass | null;
  enrolledByUserId?: string | null;
}) {
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: input.planId, shopId: input.shopId, active: true },
  });
  if (!plan) throw new Error("Plan not found.");

  await assertVehicleBelongsToCustomer(input.shopId, input.customerId, input.vehicleIds);

  const startsAt = new Date();
  const endsAt = addMonths(startsAt, plan.termMonths);

  return prisma.planSubscription.create({
    data: {
      shopId: input.shopId,
      planId: plan.id,
      customerId: input.customerId,
      status: "PENDING",
      paymentMode: input.paymentMode,
      vehicleClass: input.vehicleClass ?? null,
      startsAt,
      endsAt,
      autoRenew: plan.autoRenew,
      enrolledByUserId: input.enrolledByUserId ?? null,
      vehicles: {
        create: input.vehicleIds.map((vehicleId) => ({
          shopId: input.shopId,
          vehicleId,
        })),
      },
    },
  });
}

export async function fulfillPlanSubscriptionPayment(opts: {
  shopId: string;
  subscriptionId: string;
  planId: string;
  amountCents: number;
  stripePaymentId: string;
  stripeSubscriptionId?: string | null;
  periodStart: Date;
  periodEnd: Date;
}) {
  const existing = await prisma.subscriptionPayment.findFirst({
    where: { stripePaymentId: opts.stripePaymentId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    const sub = await tx.planSubscription.findFirst({
      where: { id: opts.subscriptionId, shopId: opts.shopId },
      select: { status: true },
    });
    if (!sub) throw new Error("Subscription not found.");

    if (sub.status !== "ACTIVE") {
      await tx.planSubscription.update({
        where: { id: opts.subscriptionId },
        data: {
          status: "ACTIVE",
          stripeSubscriptionId: opts.stripeSubscriptionId ?? undefined,
          stripePaymentIntentId: opts.stripePaymentId,
        },
      });

      const entCount = await tx.subscriptionEntitlement.count({
        where: { subscriptionId: opts.subscriptionId },
      });
      if (entCount === 0) {
        await activateSubscriptionEntitlements(opts.shopId, opts.subscriptionId, opts.planId);
      }
    }

    if (!existing) {
      await tx.subscriptionPayment.create({
        data: {
          shopId: opts.shopId,
          subscriptionId: opts.subscriptionId,
          amountCents: opts.amountCents,
          method: "CARD",
          stripePaymentId: opts.stripePaymentId,
          periodStart: opts.periodStart,
          periodEnd: opts.periodEnd,
        },
      });
    }
  });
}

export type EnrollSubscriptionInput = {
  shopId: string;
  planId: string;
  customerId: string;
  vehicleIds: string[];
  paymentMode: SubscriptionPaymentMode;
  vehicleClass?: MaintenanceVehicleClass | null;
  amountCents: number;
  enrolledByUserId?: string | null;
  /** mock | stripe */
  paymentSource?: "mock" | "stripe" | "manual";
};

export async function enrollSubscription(input: EnrollSubscriptionInput) {
  const plan = await prisma.maintenancePlan.findFirst({
    where: { id: input.planId, shopId: input.shopId, active: true },
    include: { entitlements: true },
  });
  if (!plan) throw new Error("Plan not found.");

  await assertVehicleBelongsToCustomer(input.shopId, input.customerId, input.vehicleIds);

  const startsAt = new Date();
  const endsAt = addMonths(startsAt, plan.termMonths);

  const sub = await prisma.planSubscription.create({
    data: {
      shopId: input.shopId,
      planId: plan.id,
      customerId: input.customerId,
      status: "ACTIVE",
      paymentMode: input.paymentMode,
      vehicleClass: input.vehicleClass ?? null,
      startsAt,
      endsAt,
      autoRenew: plan.autoRenew,
      enrolledByUserId: input.enrolledByUserId ?? null,
      vehicles: {
        create: input.vehicleIds.map((vehicleId) => ({
          shopId: input.shopId,
          vehicleId,
        })),
      },
      payments: {
        create: {
          shopId: input.shopId,
          amountCents: input.amountCents,
          method: input.paymentMode === "MANUAL" ? "CASH" : "CARD",
          stripePaymentId:
            input.paymentSource === "mock" ? `mock_${Date.now()}` : null,
          periodStart: startsAt,
          periodEnd: endsAt,
        },
      },
    },
  });

  await activateSubscriptionEntitlements(input.shopId, sub.id, plan.id);
  return sub;
}

export { getRedeemableEntitlements };

export async function redeemSubscriptionServices(input: {
  shopId: string;
  subscriptionId: string;
  subscriptionEntitlementIds: string[];
  vehicleId?: string | null;
  repairOrderId?: string | null;
  mileageIn?: number | null;
  redeemedByUserId?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  gatekeeper?: {
    plate?: string | null;
    vinLast6?: string | null;
    confirmCheckbox?: boolean;
    vehicleId?: string | null;
  };
}) {
  const { recordServiceVisit } = await import("@/server/maintenance-service-visits");
  return recordServiceVisit({
    shopId: input.shopId,
    subscriptionId: input.subscriptionId,
    subscriptionEntitlementIds: input.subscriptionEntitlementIds,
    vehicleId: input.vehicleId,
    repairOrderId: input.repairOrderId,
    mileageIn: input.mileageIn,
    performedByUserId: input.redeemedByUserId,
    performedByName: input.performedByName,
    notes: input.notes,
    gatekeeper: input.gatekeeper,
  });
}

export async function getRoMaintenancePanelData(
  shopId: string,
  vehicleId: string,
  customerId?: string,
) {
  const matching = await findActiveSubscriptionsForVehicle(shopId, vehicleId);

  let mismatched: {
    subscriptionId: string;
    planName: string;
    status: string;
    enrolledVehicleId: string;
    enrolledVehicleLabel: string;
    entitlements: (typeof matching)[number]["entitlements"];
    planEntitlements: (typeof matching)[number]["plan"]["entitlements"];
  }[] = [];

  if (customerId) {
    const customerSubs = await prisma.planSubscription.findMany({
      where: {
        shopId,
        customerId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
      include: {
        plan: { include: { entitlements: { orderBy: { sortOrder: "asc" } } } },
        entitlements: true,
        vehicles: { include: { vehicle: true } },
      },
    });

    const matchingIds = new Set(matching.map((s) => s.id));
    mismatched = customerSubs
      .filter((s) => !matchingIds.has(s.id))
      .map((s) => {
        const enrolled = getEnrolledVehicle(s);
        return {
          subscriptionId: s.id,
          planName: s.plan.name,
          status: s.status,
          enrolledVehicleId: enrolled?.id ?? "",
          enrolledVehicleLabel: enrolled ? enrolledVehicleLabel(enrolled) : "—",
          entitlements: s.entitlements,
          planEntitlements: s.plan.entitlements,
        };
      });
  }

  return {
    matching: matching.map((sub) => {
      const enrolled = getEnrolledVehicle(sub);
      return {
        subscriptionId: sub.id,
        planName: sub.plan.name,
        status: sub.status,
        enrolledVehicleId: enrolled?.id ?? vehicleId,
        enrolledVehicleLabel: enrolled ? enrolledVehicleLabel(enrolled) : "—",
        vehicleVerified: enrolled?.id === vehicleId,
        entitlements: sub.entitlements,
        planEntitlements: sub.plan.entitlements,
      };
    }),
    mismatched,
  };
}

export async function getCustomerSubscriptions(shopId: string, customerId: string) {
  return prisma.planSubscription.findMany({
    where: { shopId, customerId },
    include: {
      plan: { include: { entitlements: { orderBy: { sortOrder: "asc" } } } },
      vehicles: {
        include: {
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              plate: true,
              plateState: true,
              vin: true,
            },
          },
        },
      },
      entitlements: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Lightweight care-plan rows for the customer context drawer. */
export async function listCustomerCarePlanRows(shopId: string, customerId: string) {
  const rows = await prisma.planSubscription.findMany({
    where: { shopId, customerId },
    include: {
      plan: { select: { name: true } },
      vehicles: {
        include: {
          vehicle: { select: { year: true, make: true, model: true } },
        },
      },
      entitlements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const planIds = [...new Set(rows.map((r) => r.planId))];
  const planEntMap = new Map<string, { kind: EntitlementKind; label: string; quantity: number | null }>();
  if (planIds.length) {
    const ents = await prisma.planEntitlement.findMany({
      where: { planId: { in: planIds } },
      select: { id: true, planId: true, kind: true, label: true, quantity: true },
    });
    for (const e of ents) planEntMap.set(e.id, e);
  }

  return rows.map((sub) => {
    const vehicle = sub.vehicles[0]?.vehicle;
    const entRows = sub.entitlements.map((e) => {
      const pe = planEntMap.get(e.planEntitlementId);
      return {
        kind: pe?.kind ?? ("COUNTED" as EntitlementKind),
        label: pe?.label ?? "",
        usedCount: e.usedCount,
        remainingCount: e.remainingCount,
        planEntitlement: { quantity: pe?.quantity ?? null, label: pe?.label ?? "" },
      };
    });
    return {
      id: sub.id,
      status: sub.status,
      planName: sub.plan.name,
      vehicleLabel: vehicle ? vehicleLabel(vehicle) : "—",
      endsAt: sub.endsAt.toISOString(),
      progress: subscriptionProgressSummary(entRows),
      paymentMode: sub.paymentMode,
    };
  });
}
