"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import { customerDisplayName } from "@/lib/format";
import { getAppointmentSettings } from "@/server/appointments";
import { createRepairOrder } from "@/server/actions/repair-orders";
import { emitAutomationEvent } from "@/server/services/automation-events";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

const APPT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in progress",
  COMPLETED: "completed",
  NO_SHOW: "no-show",
  CANCELED: "canceled",
};

const CreateAppointmentInput = z.object({
  customerId: z.string().min(1),
  vehicleId: z.string().optional().nullable(),
  repairOrderId: z.string().optional().nullable(),
  title: z.string().trim().max(160).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMins: z.number().int().min(15).max(480),
  notes: z.string().trim().max(2000).optional().nullable(),
  technicianId: z.string().optional().nullable(),
  bay: z.string().trim().max(40).optional().nullable(),
});

const UpdateAppointmentInput = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(160).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMins: z.number().int().min(15).max(480).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  technicianId: z.string().optional().nullable(),
  bay: z.string().trim().max(40).optional().nullable(),
  status: z
    .enum([
      "SCHEDULED",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "NO_SHOW",
      "CANCELED",
    ])
    .optional(),
});

export type ActionResult =
  | { ok: true; id?: string; roId?: string; roNumber?: number }
  | { ok: false; error: string };

const PAST_START_ERROR =
  "Choose a start time that is today or in the future.";

function buildStartEnd(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

function sameMinute(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

/** Reject booking/reschedule into the past. Unchanged past schedules on update are allowed. */
function rejectPastStart(
  startAt: Date,
  existingStartAt?: Date,
): ActionResult | null {
  if (existingStartAt && sameMinute(startAt, existingStartAt)) return null;
  if (startAt.getTime() < Date.now()) {
    return { ok: false, error: PAST_START_ERROR };
  }
  return null;
}

async function validateCustomerVehicle(
  shopId: string,
  customerId: string,
  vehicleId: string | null | undefined,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { id: true, firstName: true, lastName: true, company: true },
  });
  if (!customer) return { ok: false as const, error: "Customer not found." };

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, shopId, customerId },
      select: { id: true },
    });
    if (!vehicle) return { ok: false as const, error: "Vehicle not found for this customer." };
  }

  return { ok: true as const, customer };
}

export async function createAppointment(
  raw: z.infer<typeof CreateAppointmentInput>,
): Promise<ActionResult> {
  const parsed = CreateAppointmentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };
  const check = await validateCustomerVehicle(shopId, d.customerId, d.vehicleId);
  if (!check.ok) return check;

  if (d.technicianId) {
    const member = await prisma.membership.findFirst({
      where: { shopId, userId: d.technicianId, active: true },
      select: { userId: true },
    });
    if (!member) return { ok: false, error: "Selected employee is not on this shop." };
  }

  if (d.repairOrderId) {
    const linkedRo = await prisma.repairOrder.findFirst({
      where: { id: d.repairOrderId, shopId, customerId: d.customerId },
      select: { id: true },
    });
    if (!linkedRo) return { ok: false, error: "Repair order not found for this customer." };
  }

  const { startAt, endAt } = buildStartEnd(d.date, d.startTime, d.durationMins);
  const past = rejectPastStart(startAt);
  if (past) return past;
  const title =
    d.title?.trim() ||
    `${customerDisplayName(check.customer)} appointment`;

  const appt = await prisma.appointment.create({
    data: {
      shopId,
      customerId: d.customerId,
      vehicleId: d.vehicleId ?? null,
      repairOrderId: d.repairOrderId ?? null,
      title,
      startAt,
      endAt,
      notes: d.notes ?? null,
      technicianId: d.technicianId ?? null,
      bay: d.bay ?? null,
      status: "SCHEDULED",
      source: d.repairOrderId ? "RO" : "STAFF",
    },
    select: { id: true, customerId: true, repairOrderId: true },
  });

  revalidatePath("/appointments");
  if (appt.repairOrderId) {
    revalidatePath(`/repair-orders/${appt.repairOrderId}`);
  }
  if (appt.customerId) {
    await emitAutomationEvent({
      type: "APPOINTMENT_CREATED",
      shopId,
      appointmentId: appt.id,
      customerId: appt.customerId,
    });
  }
  return { ok: true, id: appt.id };
}

export async function updateAppointment(
  raw: z.infer<typeof UpdateAppointmentInput>,
): Promise<ActionResult> {
  const parsed = UpdateAppointmentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };
  const existing = await prisma.appointment.findFirst({
    where: { id: d.id, shopId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      title: true,
      repairOrderId: true,
    },
  });
  if (!existing) return { ok: false, error: "Appointment not found." };

  const data: Record<string, unknown> = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.notes !== undefined) data.notes = d.notes;
  if (d.technicianId !== undefined) data.technicianId = d.technicianId;
  if (d.bay !== undefined) data.bay = d.bay;
  if (d.status !== undefined) data.status = d.status;

  if (d.date && d.startTime && d.durationMins) {
    const { startAt, endAt } = buildStartEnd(d.date, d.startTime, d.durationMins);
    const past = rejectPastStart(startAt, existing.startAt);
    if (past) return past;
    data.startAt = startAt;
    data.endAt = endAt;
  } else if (d.date && d.startTime) {
    const durationMins = Math.round(
      (existing.endAt.getTime() - existing.startAt.getTime()) / 60_000,
    );
    const { startAt, endAt } = buildStartEnd(d.date, d.startTime, durationMins);
    const past = rejectPastStart(startAt, existing.startAt);
    if (past) return past;
    data.startAt = startAt;
    data.endAt = endAt;
  }

  if (d.technicianId !== undefined && d.technicianId !== null) {
    const member = await prisma.membership.findFirst({
      where: { shopId, userId: d.technicianId, active: true },
      select: { userId: true },
    });
    if (!member) return { ok: false, error: "Selected employee is not on this shop." };
  }

  if (Object.keys(data).length === 0) return { ok: true, id: d.id };

  await prisma.appointment.update({ where: { id: d.id }, data });

  const updated = await prisma.appointment.findFirst({
    where: { id: d.id, shopId },
    select: {
      customerId: true,
      title: true,
      status: true,
      repairOrderId: true,
    },
  });

  const title = updated?.title?.trim() || existing.title?.trim() || "Appointment";
  const statusChanged =
    d.status !== undefined && d.status !== existing.status;
  const summary = statusChanged
    ? `Appointment ${APPT_STATUS_LABEL[d.status!] ?? d.status!.toLowerCase()}: ${title}`
    : `Appointment updated: ${title}`;

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: updated?.repairOrderId ?? existing.repairOrderId ?? null,
    eventType: ShopAuditEventType.APPOINTMENT_UPDATED,
    summary,
    metadata: {
      appointmentId: d.id,
      status: updated?.status ?? existing.status,
      previousStatus: existing.status,
      changed: Object.keys(data),
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard/shop-activity");

  if (updated?.customerId) {
    await emitAutomationEvent({
      type: "APPOINTMENT_UPDATED",
      shopId,
      appointmentId: d.id,
      customerId: updated.customerId,
    });
  }

  return { ok: true, id: d.id };
}

export async function updateAppointmentStatus(
  id: string,
  status: z.infer<typeof UpdateAppointmentInput>["status"],
): Promise<ActionResult> {
  if (!status) return { ok: false, error: "Status is required." };
  return updateAppointment({ id, status });
}

export async function cancelAppointment(id: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };
  const existing = await prisma.appointment.findFirst({
    where: { id, shopId },
    select: { id: true, title: true, status: true, repairOrderId: true },
  });
  if (!existing) return { ok: false, error: "Appointment not found." };

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  const title = existing.title?.trim() || "Appointment";
  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: existing.repairOrderId ?? null,
    eventType: ShopAuditEventType.APPOINTMENT_UPDATED,
    summary: `Appointment canceled: ${title}`,
    metadata: {
      appointmentId: id,
      status: "CANCELED",
      previousStatus: existing.status,
      via: "cancel",
    },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard/shop-activity");
  return { ok: true, id };
}

export async function createRepairOrderFromAppointment(
  appointmentId: string,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) return { ok: false, error: denied.error };
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, shopId },
    select: {
      id: true,
      customerId: true,
      vehicleId: true,
      repairOrderId: true,
      notes: true,
    },
  });
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (!appt.customerId) return { ok: false, error: "Appointment has no customer." };
  if (!appt.vehicleId) return { ok: false, error: "Add a vehicle before creating a repair order." };
  if (appt.repairOrderId) {
    const ro = await prisma.repairOrder.findFirst({
      where: { id: appt.repairOrderId, shopId },
      select: { id: true, number: true },
    });
    if (ro) return { ok: true, roId: ro.id, roNumber: ro.number };
  }

  const result = await createRepairOrder({
    customerId: appt.customerId,
    vehicleId: appt.vehicleId,
    odometerNotWorking: false,
    concerns: appt.notes ? [appt.notes] : [],
    appointmentOption: "Drop-off Vehicle",
  });
  if (!result.ok) return result;

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { repairOrderId: result.id, status: "CONFIRMED" },
  });

  revalidatePath("/appointments");
  revalidatePath(`/repair-orders/${result.id}`);
  return { ok: true, roId: result.id, roNumber: result.number };
}

export async function getDefaultAppointmentDuration(): Promise<number> {
  const shopId = await getShopId();
  const denied = await gates.jobBoardView(shopId);
  if (denied) throw new Error(denied.error);
  const settings = await getAppointmentSettings(shopId);
  return settings.apptDefaultDurationMins;
}
