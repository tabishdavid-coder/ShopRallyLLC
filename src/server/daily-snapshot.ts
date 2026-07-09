import "server-only";

import { prisma } from "@/db/client";
import { RoActivityType } from "@/generated/prisma";
import type { DailySnapshotData, DailySnapshotEvent, SnapshotDayView } from "@/lib/daily-snapshot";
import { customerDisplayName } from "@/lib/format";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const ACTIVITY_TYPE_LABEL: Record<RoActivityType, string> = {
  NOTE: "Note",
  PHONE_CALL: "Phone call",
  EMAIL: "Email",
  OTHER: "Other",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  CHECK: "Check",
  OTHER: "Other",
  STORE_CREDIT: "Store credit",
};

function vehicleLabel(v: { year: number | null; make: string | null; model: string | null }): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
}

/** Shop-wide activity feed for a single calendar day (defaults to today). */
export async function getDailySnapshot(
  shopId: string,
  day = new Date(),
  view: SnapshotDayView = "today",
): Promise<DailySnapshotData> {
  const start = startOfDay(day);
  const end = endOfDay(day);

  const dayLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [rosOpened, rosCompleted, activities] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        number: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
        vehicle: { select: { year: true, make: true, model: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.repairOrder.findMany({
      where: { shopId, completedAt: { gte: start, lte: end } },
      select: {
        id: true,
        number: true,
        completedAt: true,
        totalCents: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
        vehicle: { select: { year: true, make: true, model: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 100,
    }),
    prisma.roActivity.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        repairOrder: {
          select: {
            id: true,
            number: true,
            customer: { select: { firstName: true, lastName: true, company: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const [payments, appointments, messages] = await Promise.all([
    prisma.payment.findMany({
      where: {
        invoice: { shopId },
        paidAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        amountCents: true,
        method: true,
        paidAt: true,
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
      take: 100,
    }),
    prisma.appointment.findMany({
      where: { shopId, startAt: { gte: start, lte: end } },
      select: {
        id: true,
        title: true,
        startAt: true,
        status: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
        vehicle: { select: { year: true, make: true, model: true } },
      },
      orderBy: { startAt: "asc" },
      take: 100,
    }),
    prisma.message.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        direction: true,
        body: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
        repairOrder: {
          select: {
            id: true,
            number: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const events: DailySnapshotEvent[] = [];

  for (const ro of rosOpened) {
    const customerName = customerDisplayName(ro.customer);
    events.push({
      id: `ro-open-${ro.id}`,
      kind: "ro_opened",
      occurredAt: ro.createdAt.toISOString(),
      title: `RO #${ro.number} opened`,
      detail: `${customerName} · ${vehicleLabel(ro.vehicle)}`,
      repairOrderId: ro.id,
      roNumber: ro.number,
      customerName,
    });
  }

  for (const ro of rosCompleted) {
    const customerName = customerDisplayName(ro.customer);
    events.push({
      id: `ro-done-${ro.id}`,
      kind: "ro_completed",
      occurredAt: ro.completedAt!.toISOString(),
      title: `RO #${ro.number} completed`,
      detail: `${customerName} · ${formatCentsShort(ro.totalCents)}`,
      repairOrderId: ro.id,
      roNumber: ro.number,
      customerName,
      amountCents: ro.totalCents,
    });
  }

  for (const a of activities) {
    const customerName = customerDisplayName(a.repairOrder.customer);
    events.push({
      id: `act-${a.id}`,
      kind: "activity",
      occurredAt: a.createdAt.toISOString(),
      title: `${ACTIVITY_TYPE_LABEL[a.type]} on RO #${a.repairOrder.number}`,
      detail: a.description,
      repairOrderId: a.repairOrder.id,
      roNumber: a.repairOrder.number,
      customerName,
    });
  }

  for (const p of payments) {
    const ro = p.invoice.repairOrder;
    const customerName = customerDisplayName(ro.customer);
    const method = PAYMENT_METHOD_LABELS[p.method] ?? p.method;
    events.push({
      id: `pay-${p.id}`,
      kind: "payment",
      occurredAt: p.paidAt.toISOString(),
      title: `${formatCentsShort(p.amountCents)} ${method} · RO #${ro.number}`,
      detail: customerName,
      repairOrderId: ro.id,
      roNumber: ro.number,
      customerName,
      amountCents: p.amountCents,
    });
  }

  for (const appt of appointments) {
    const customerName = appt.customer ? customerDisplayName(appt.customer) : "Walk-in";
    const time = appt.startAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    events.push({
      id: `appt-${appt.id}`,
      kind: "appointment",
      occurredAt: appt.startAt.toISOString(),
      title: appt.title,
      detail: `${time} · ${customerName}${
        appt.vehicle ? ` · ${vehicleLabel(appt.vehicle)}` : ""
      }`,
    });
  }

  for (const m of messages) {
    const customerName = customerDisplayName(m.customer);
    const inbound = m.direction === "INBOUND";
    events.push({
      id: `msg-${m.id}`,
      kind: inbound ? "message_in" : "message_out",
      occurredAt: m.createdAt.toISOString(),
      title: inbound ? `SMS from ${customerName}` : `SMS to ${customerName}`,
      detail: m.body.length > 120 ? `${m.body.slice(0, 117)}…` : m.body,
      repairOrderId: m.repairOrder?.id,
      roNumber: m.repairOrder?.number,
      customerName,
    });
  }

  events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const collectedCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return {
    dayLabel,
    dayStart: start.toISOString(),
    dayEnd: end.toISOString(),
    view,
    summary: {
      collectedCents,
      paymentCount: payments.length,
      rosOpened: rosOpened.length,
      rosCompleted: rosCompleted.length,
      appointments: appointments.length,
      messages: messages.length,
      activityNotes: activities.length,
    },
    events,
  };
}

function formatCentsShort(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
