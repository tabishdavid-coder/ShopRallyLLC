import "server-only";

import type { ROStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "—";
}

const OPEN_RO_STATUSES: ROStatus[] = ["ESTIMATE", "APPROVED", "IN_PROGRESS", "COMPLETED"];

export type MessageThreadContextRo = {
  id: string;
  number: number;
  status: ROStatus;
  vehicleLabel: string;
  totalCents: number;
  balanceCents: number | null;
};

export type MessageThreadContext = {
  customerId: string;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  transactionalSmsConsent: boolean;
  marketingOptIn: boolean;
  tags: string[];
  lastInboundAt: string | null;
  openRepairOrders: MessageThreadContextRo[];
  primaryVehicle: {
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    plate: string | null;
    plateState: string | null;
  } | null;
  nextAppointment: {
    id: string;
    title: string;
    startAt: string;
    vehicleLabel: string | null;
  } | null;
  lifetimeTotalCents: number;
  openBalanceCents: number;
};

/** Customer + RO + appointment snapshot for the Messages context rail. */
export async function getMessageThreadContext(
  shopId: string,
  customerId: string,
): Promise<MessageThreadContext | null> {
  const now = new Date();

  const [customer, lastInbound, nextAppt] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: customerId, shopId },
      select: {
        id: true,
        email: true,
        phone: true,
        altPhone: true,
        tags: true,
        transactionalSmsConsent: true,
        marketingOptIn: true,
        vehicles: {
          orderBy: [{ year: "desc" }, { make: "asc" }],
          take: 1,
          select: {
            year: true,
            make: true,
            model: true,
            trim: true,
            plate: true,
            plateState: true,
          },
        },
        repairOrders: {
          where: { status: { in: OPEN_RO_STATUSES } },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            number: true,
            status: true,
            totalCents: true,
            vehicle: { select: { year: true, make: true, model: true } },
            invoice: { select: { balanceCents: true } },
          },
        },
      },
    }),
    prisma.message.findFirst({
      where: { shopId, customerId, direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.appointment.findFirst({
      where: {
        shopId,
        customerId,
        startAt: { gte: now },
        status: { not: "CANCELED" },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        vehicle: { select: { year: true, make: true, model: true } },
      },
    }),
  ]);

  if (!customer) return null;

  const openRepairOrders: MessageThreadContextRo[] = customer.repairOrders.map((ro) => ({
    id: ro.id,
    number: ro.number,
    status: ro.status,
    vehicleLabel: ro.vehicle ? vehicleLabel(ro.vehicle) : "—",
    totalCents: ro.totalCents,
    balanceCents: ro.invoice?.balanceCents ?? null,
  }));

  const allRos = await prisma.repairOrder.findMany({
    where: { shopId, customerId },
    select: { totalCents: true, invoice: { select: { balanceCents: true } } },
  });
  const lifetimeTotalCents = allRos.reduce((s, ro) => s + ro.totalCents, 0);
  const openBalanceCents = allRos.reduce((s, ro) => s + (ro.invoice?.balanceCents ?? 0), 0);

  return {
    customerId: customer.id,
    email: customer.email,
    phone: customer.phone,
    altPhone: customer.altPhone,
    transactionalSmsConsent: customer.transactionalSmsConsent,
    marketingOptIn: customer.marketingOptIn,
    tags: customer.tags,
    lastInboundAt: lastInbound?.createdAt.toISOString() ?? null,
    openRepairOrders,
    primaryVehicle: customer.vehicles[0] ?? null,
    nextAppointment: nextAppt
      ? {
          id: nextAppt.id,
          title: nextAppt.title,
          startAt: nextAppt.startAt.toISOString(),
          vehicleLabel: nextAppt.vehicle ? vehicleLabel(nextAppt.vehicle) : null,
        }
      : null,
    lifetimeTotalCents,
    openBalanceCents,
  };
}
