import "server-only";

import { prisma } from "@/db/client";
import { customerDisplayName } from "@/lib/format";
import {
  appointmentCardTitle,
  durationMinsBetween,
  vehicleShortLabel,
} from "@/lib/appointments";
import type { AppointmentStatus } from "@/generated/prisma";
import {
  apptHoursEnvelope,
  parseApptWeeklyHours,
  type ApptWeeklyHours,
} from "@/lib/appt-hours";

export type AppointmentSettings = {
  apptDayStart: string;
  apptDayEnd: string;
  apptDefaultDurationMins: number;
  weeklyHours: ApptWeeklyHours;
};

export type AppointmentRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMins: number;
  status: AppointmentStatus;
  notes: string | null;
  bay: string | null;
  repairOrderId: string | null;
  repairOrderNumber: number | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  vehicle: {
    id: string;
    label: string;
  } | null;
  technician: { id: string; name: string } | null;
};

const appointmentSelect = {
  id: true,
  title: true,
  startAt: true,
  endAt: true,
  status: true,
  notes: true,
  bay: true,
  repairOrderId: true,
  technicianId: true,
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
    },
  },
  vehicle: {
    select: { id: true, year: true, make: true, model: true, trim: true },
  },
} as const;

function mapAppointment(
  a: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date;
    status: AppointmentStatus;
    notes: string | null;
    bay: string | null;
    repairOrderId: string | null;
    technicianId: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      company: string | null;
      phone: string | null;
    } | null;
    vehicle: {
      id: string;
      year: number | null;
      make: string | null;
      model: string | null;
      trim: string | null;
    } | null;
  },
  technicians: Map<string, string>,
  roNumbers: Map<string, number>,
): AppointmentRow {
  const customerName = a.customer ? customerDisplayName(a.customer) : "—";
  return {
    id: a.id,
    title: a.title,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    durationMins: durationMinsBetween(a.startAt, a.endAt),
    status: a.status,
    notes: a.notes,
    bay: a.bay,
    repairOrderId: a.repairOrderId,
    repairOrderNumber: a.repairOrderId ? (roNumbers.get(a.repairOrderId) ?? null) : null,
    customer: a.customer
      ? { id: a.customer.id, name: customerName, phone: a.customer.phone }
      : null,
    vehicle: a.vehicle
      ? { id: a.vehicle.id, label: vehicleShortLabel(a.vehicle) }
      : null,
    technician: a.technicianId
      ? { id: a.technicianId, name: technicians.get(a.technicianId) ?? "Staff" }
      : null,
  };
}

export async function getAppointmentSettings(
  shopId: string,
): Promise<AppointmentSettings> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      apptDayStart: true,
      apptDayEnd: true,
      apptDefaultDurationMins: true,
      apptWeeklyHours: true,
    },
  });
  const weeklyHours = parseApptWeeklyHours(shop?.apptWeeklyHours, {
    dayStart: shop?.apptDayStart,
    dayEnd: shop?.apptDayEnd,
  });
  const envelope = apptHoursEnvelope(weeklyHours);
  return {
    apptDayStart: envelope.dayStart,
    apptDayEnd: envelope.dayEnd,
    apptDefaultDurationMins: shop?.apptDefaultDurationMins ?? 60,
    weeklyHours,
  };
}

export async function listAppointments(input: {
  shopId: string;
  rangeStart: Date;
  rangeEnd: Date;
  q?: string;
}): Promise<AppointmentRow[]> {
  const term = input.q?.trim();
  const rows = await prisma.appointment.findMany({
    where: {
      shopId: input.shopId,
      startAt: { lt: input.rangeEnd },
      endAt: { gt: input.rangeStart },
      status: { not: "CANCELED" },
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { notes: { contains: term, mode: "insensitive" } },
              {
                customer: {
                  OR: [
                    { firstName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                    { company: { contains: term, mode: "insensitive" } },
                    { phone: { contains: term, mode: "insensitive" } },
                  ],
                },
              },
              {
                vehicle: {
                  OR: [
                    { make: { contains: term, mode: "insensitive" } },
                    { model: { contains: term, mode: "insensitive" } },
                    { plate: { contains: term, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { startAt: "asc" },
    select: appointmentSelect,
  });

  const techIds = [...new Set(rows.map((r) => r.technicianId).filter(Boolean))] as string[];
  const roIds = [...new Set(rows.map((r) => r.repairOrderId).filter(Boolean))] as string[];

  const [techUsers, ros] = await Promise.all([
    techIds.length
      ? prisma.user.findMany({
          where: { id: { in: techIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    roIds.length
      ? prisma.repairOrder.findMany({
          where: { shopId: input.shopId, id: { in: roIds } },
          select: { id: true, number: true },
        })
      : [],
  ]);

  const technicians = new Map(
    techUsers.map((u) => [
      u.id,
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Staff",
    ]),
  );
  const roNumbers = new Map(ros.map((r) => [r.id, r.number]));

  return rows.map((r) => mapAppointment(r, technicians, roNumbers));
}

export async function getAppointmentById(
  shopId: string,
  id: string,
): Promise<AppointmentRow | null> {
  const row = await prisma.appointment.findFirst({
    where: { id, shopId },
    select: appointmentSelect,
  });
  if (!row) return null;

  const techIds = row.technicianId ? [row.technicianId] : [];
  const roIds = row.repairOrderId ? [row.repairOrderId] : [];

  const [techUsers, ros] = await Promise.all([
    techIds.length
      ? prisma.user.findMany({
          where: { id: { in: techIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
    roIds.length
      ? prisma.repairOrder.findMany({
          where: { shopId, id: { in: roIds } },
          select: { id: true, number: true },
        })
      : [],
  ]);

  const technicians = new Map(
    techUsers.map((u) => [
      u.id,
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Staff",
    ]),
  );
  const roNumbers = new Map(ros.map((r) => [r.id, r.number]));

  return mapAppointment(row, technicians, roNumbers);
}

export { appointmentCardTitle };
