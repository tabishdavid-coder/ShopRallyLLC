"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import {
  PaymentMethod,
  TireOrderSource,
  TireOrderStatus,
} from "@/generated/prisma";
import { customerDisplayName } from "@/lib/format";
import { phoneDigitsKey, phoneMatchKey } from "@/lib/phone";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { getAppointmentSettings } from "@/server/appointments";
import { getWeldonTire, type TireSupplierOrderPayload } from "@/server/services/weldon";
import { gates } from "@/server/permission-gates";

export type TireActionResult =
  | { ok: true; id: string; number: number }
  | { ok: false; error: string };

const CustomerFields = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().max(160).optional().nullable(),
  marketingOptIn: z.boolean().optional(),
});

const VehicleFields = z.object({
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  make: z.string().trim().max(60).optional().nullable(),
  model: z.string().trim().max(60).optional().nullable(),
  vin: z.string().trim().max(17).optional().nullable(),
  plate: z.string().trim().max(20).optional().nullable(),
});

const ScheduleFields = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  durationMins: z.number().int().min(15).max(480).optional().nullable(),
});

const TireSpecFields = z.object({
  tireSizeFront: z.string().trim().max(40).optional().nullable(),
  tireSizeRear: z.string().trim().max(40).optional().nullable(),
  tireBrand: z.string().trim().max(80).optional().nullable(),
  tireQuantity: z.number().int().min(1).max(8).default(4),
  tireType: z.string().trim().max(40).optional().nullable(),
  dropOffType: z.string().trim().max(40).optional().nullable(),
  estimatedTotalCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

const CreateTireOrderInput = CustomerFields.merge(VehicleFields)
  .merge(ScheduleFields)
  .merge(TireSpecFields)
  .extend({
    depositCents: z.number().int().min(0).default(0),
    recordDepositNow: z.boolean().optional(),
    depositMethod: z.enum(["CARD", "CASH", "CHECK", "OTHER"]).optional(),
    depositReference: z.string().trim().max(120).optional().nullable(),
    source: z.enum(["CRM", "WEBSITE"]).default("CRM"),
    websiteSubmissionId: z.string().trim().max(120).optional().nullable(),
    existingCustomerId: z.string().optional().nullable(),
    existingVehicleId: z.string().optional().nullable(),
  });

export type CreateTireOrderInput = z.infer<typeof CreateTireOrderInput>;

function buildStartEnd(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

async function nextTireOrderNumber(shopId: string): Promise<number> {
  const last = await prisma.tireOrder.findFirst({
    where: { shopId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 1000) + 1;
}

async function resolveCustomer(
  shopId: string,
  data: z.infer<typeof CreateTireOrderInput>,
) {
  if (data.existingCustomerId) {
    const existing = await prisma.customer.findFirst({
      where: { id: data.existingCustomerId, shopId },
      select: { id: true, firstName: true, lastName: true, company: true },
    });
    if (!existing) return { ok: false as const, error: "Customer not found." };
    return { ok: true as const, customer: existing };
  }

  const phoneKey = phoneMatchKey(data.phone);
  if (phoneKey) {
    const match = await prisma.customer.findFirst({
      where: { shopId, phoneDigits: phoneKey },
      select: { id: true, firstName: true, lastName: true, company: true },
    });
    if (match) return { ok: true as const, customer: match };
  }

  const created = await prisma.customer.create({
    data: {
      shopId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
      marketingOptIn: data.marketingOptIn ?? false,
      leadSource: data.source === "WEBSITE" ? "Website — Tires" : "CRM — Tires",
      tags: ["Tires"],
      phoneDigits: phoneDigitsKey(data.phone),
    },
    select: { id: true, firstName: true, lastName: true, company: true },
  });
  return { ok: true as const, customer: created };
}

async function resolveVehicle(
  shopId: string,
  customerId: string,
  data: z.infer<typeof CreateTireOrderInput>,
) {
  if (data.existingVehicleId) {
    const existing = await prisma.vehicle.findFirst({
      where: { id: data.existingVehicleId, shopId, customerId },
      select: { id: true, year: true, make: true, model: true },
    });
    if (!existing) return { ok: false as const, error: "Vehicle not found." };
    return { ok: true as const, vehicle: existing };
  }

  const hasYmm = data.year || data.make || data.model;
  if (!hasYmm) return { ok: true as const, vehicle: null };

  const created = await prisma.vehicle.create({
    data: {
      shopId,
      customerId,
      year: data.year ?? undefined,
      make: data.make ?? undefined,
      model: data.model ?? undefined,
      vin: data.vin?.trim().toUpperCase() || undefined,
      plate: data.plate?.trim().toUpperCase() || undefined,
    },
    select: { id: true, year: true, make: true, model: true },
  });
  return { ok: true as const, vehicle: created };
}

function deriveStatus(opts: {
  hasAppointment: boolean;
  depositPaid: boolean;
  source: TireOrderSource;
}): TireOrderStatus {
  // Website deposits queue for manager approval before buying from Weldon/supplier.
  if (opts.source === "WEBSITE" && opts.depositPaid) {
    return "PENDING_SUPPLIER_APPROVAL";
  }
  if (opts.hasAppointment && opts.depositPaid) return "SCHEDULED";
  if (opts.depositPaid) return "DEPOSIT_RECEIVED";
  return "LEAD";
}

/** CRM or website intake: customer + vehicle + optional appointment + tire order. */
export async function createTireOrder(
  raw: CreateTireOrderInput,
): Promise<TireActionResult> {
  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const result = await createTireOrderForShop(shopId, raw);
  if (result.ok) {
    revalidatePath("/tires");
    revalidatePath("/appointments");
    revalidatePath("/customers");
  }
  return result;
}

const UpdateTireOrderStatusInput = z.object({
  id: z.string().min(1),
  status: z.enum([
    "LEAD",
    "DEPOSIT_RECEIVED",
    "PENDING_SUPPLIER_APPROVAL",
    "ORDERED",
    "SCHEDULED",
    "INSTALLED",
    "COMPLETE",
    "CANCELED",
  ]),
});

export async function updateTireOrderStatus(
  raw: z.infer<typeof UpdateTireOrderStatusInput>,
): Promise<TireActionResult> {
  const parsed = UpdateTireOrderStatusInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.tireOrder.findFirst({
    where: { id: parsed.data.id, shopId },
    select: { id: true, number: true },
  });
  if (!existing) return { ok: false, error: "Tire order not found." };

  await prisma.tireOrder.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status as TireOrderStatus },
  });

  revalidatePath("/tires");
  revalidatePath(`/tires/${parsed.data.id}`);
  return { ok: true, id: existing.id, number: existing.number };
}

const RecordTireDepositInput = z.object({
  id: z.string().min(1),
  depositCents: z.number().int().min(1),
  depositMethod: z.enum(["CARD", "CASH", "CHECK", "OTHER"]),
  depositReference: z.string().trim().max(120).optional().nullable(),
});

export async function recordTireDeposit(
  raw: z.infer<typeof RecordTireDepositInput>,
): Promise<TireActionResult> {
  const parsed = RecordTireDepositInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check deposit details." };

  const shopId = await getShopId();
  const denied = await gates.paymentsCollect(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.tireOrder.findFirst({
    where: { id: parsed.data.id, shopId },
    select: { id: true, number: true, status: true, appointmentId: true },
  });
  if (!existing) return { ok: false, error: "Tire order not found." };

  const nextStatus: TireOrderStatus =
    existing.appointmentId
      ? "SCHEDULED"
      : existing.status === "LEAD"
        ? "DEPOSIT_RECEIVED"
        : existing.status;

  await prisma.tireOrder.update({
    where: { id: parsed.data.id },
    data: {
      depositCents: parsed.data.depositCents,
      depositPaidAt: new Date(),
      depositMethod: parsed.data.depositMethod as PaymentMethod,
      depositReference: parsed.data.depositReference?.trim() || null,
      status: nextStatus,
    },
  });

  revalidatePath("/tires");
  revalidatePath(`/tires/${parsed.data.id}`);
  return { ok: true, id: existing.id, number: existing.number };
}

const UpdateTireOrderNotesInput = z.object({
  id: z.string().min(1),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export async function updateTireOrderNotes(
  raw: z.infer<typeof UpdateTireOrderNotesInput>,
): Promise<TireActionResult> {
  const parsed = UpdateTireOrderNotesInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid notes." };

  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.tireOrder.findFirst({
    where: { id: parsed.data.id, shopId },
    select: { id: true, number: true },
  });
  if (!existing) return { ok: false, error: "Tire order not found." };

  await prisma.tireOrder.update({
    where: { id: parsed.data.id },
    data: { notes: parsed.data.notes?.trim() || null },
  });

  revalidatePath(`/tires/${parsed.data.id}`);
  return { ok: true, id: existing.id, number: existing.number };
}

/** Shared create path for CRM actions and the public website API stub. */
export async function createTireOrderForShop(
  shopId: string,
  raw: CreateTireOrderInput,
): Promise<TireActionResult> {
  // Bypass getShopId — used by API route with shop resolved from slug.
  const parsed = CreateTireOrderInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!data.tireSizeFront?.trim() && !data.tireBrand?.trim()) {
    return { ok: false, error: "Enter at least a tire size or brand preference." };
  }

  if (data.websiteSubmissionId) {
    const dup = await prisma.tireOrder.findFirst({
      where: { shopId, websiteSubmissionId: data.websiteSubmissionId },
      select: { id: true, number: true },
    });
    if (dup) return { ok: true, id: dup.id, number: dup.number };
  }

  const customerRes = await resolveCustomer(shopId, data);
  if (!customerRes.ok) return customerRes;

  const vehicleRes = await resolveVehicle(shopId, customerRes.customer.id, data);
  if (!vehicleRes.ok) return vehicleRes;

  const hasSchedule = Boolean(data.date && data.startTime);
  if (hasSchedule && (!data.date || !data.startTime)) {
    return { ok: false, error: "Select both a date and time for the appointment." };
  }

  let appointmentId: string | null = null;
  if (hasSchedule && data.date && data.startTime) {
    const settings = await getAppointmentSettings(shopId);
    const durationMins = data.durationMins ?? settings.apptDefaultDurationMins;
    const { startAt, endAt } = buildStartEnd(data.date, data.startTime, durationMins);
    const vehicleLabel = vehicleRes.vehicle
      ? `${vehicleRes.vehicle.year ?? ""} ${vehicleRes.vehicle.make ?? ""} ${vehicleRes.vehicle.model ?? ""}`.trim()
      : "";
    const title = vehicleLabel
      ? `${customerDisplayName(customerRes.customer)} — Tire install (${vehicleLabel})`
      : `${customerDisplayName(customerRes.customer)} — Tire install`;

    const noteParts: string[] = [];
    if (data.tireSizeFront) noteParts.push(`Size: ${data.tireSizeFront}`);
    if (data.tireSizeRear && data.tireSizeRear !== data.tireSizeFront) {
      noteParts.push(`Rear: ${data.tireSizeRear}`);
    }
    if (data.tireBrand) noteParts.push(`Brand: ${data.tireBrand}`);
    if (data.dropOffType) noteParts.push(`Drop-off: ${data.dropOffType}`);

    const appt = await prisma.appointment.create({
      data: {
        shopId,
        customerId: customerRes.customer.id,
        vehicleId: vehicleRes.vehicle?.id ?? null,
        title,
        startAt,
        endAt,
        notes: noteParts.join(" · ") || null,
        serviceName: "Tire install",
        status: "SCHEDULED",
        source: "TIRES",
      },
      select: { id: true },
    });
    appointmentId = appt.id;
  }

  const depositPaid =
    data.recordDepositNow === true &&
    data.depositCents > 0 &&
    Boolean(data.depositMethod);

  const status = deriveStatus({
    hasAppointment: Boolean(appointmentId),
    depositPaid,
    source: data.source as TireOrderSource,
  });

  const number = await nextTireOrderNumber(shopId);

  const order = await prisma.tireOrder.create({
    data: {
      shopId,
      number,
      customerId: customerRes.customer.id,
      vehicleId: vehicleRes.vehicle?.id ?? null,
      appointmentId,
      status,
      source: data.source as TireOrderSource,
      tireSizeFront: data.tireSizeFront?.trim() || null,
      tireSizeRear: data.tireSizeRear?.trim() || null,
      tireBrand: data.tireBrand?.trim() || null,
      tireQuantity: data.tireQuantity,
      tireType: data.tireType?.trim() || null,
      dropOffType: data.dropOffType?.trim() || null,
      estimatedTotalCents: data.estimatedTotalCents ?? null,
      depositCents: data.depositCents,
      depositPaidAt: depositPaid ? new Date() : null,
      depositMethod: depositPaid ? (data.depositMethod as PaymentMethod) : null,
      depositReference: depositPaid ? data.depositReference?.trim() || null : null,
      websiteSubmissionId: data.websiteSubmissionId?.trim() || null,
      notes: data.notes?.trim() || null,
    },
    select: { id: true, number: true },
  });

  return { ok: true, id: order.id, number: order.number };
}

function buildSupplierPayload(
  order: {
    id: string;
    number: number;
    shopId: string;
    tireSizeFront: string | null;
    tireSizeRear: string | null;
    tireBrand: string | null;
    tireQuantity: number;
    tireType: string | null;
    estimatedTotalCents: number | null;
    supplierQuoteCents: number | null;
    depositCents: number;
    customer: {
      firstName: string;
      lastName: string;
      company: string | null;
      phone: string | null;
      email: string | null;
    };
    vehicle: {
      year: number | null;
      make: string | null;
      model: string | null;
      vin: string | null;
    } | null;
  },
): TireSupplierOrderPayload {
  return {
    tireOrderId: order.id,
    tireOrderNumber: order.number,
    shopId: order.shopId,
    customer: {
      name: customerDisplayName(order.customer),
      phone: order.customer.phone,
      email: order.customer.email,
    },
    vehicle: {
      year: order.vehicle?.year,
      make: order.vehicle?.make,
      model: order.vehicle?.model,
      vin: order.vehicle?.vin,
    },
    tires: {
      sizeFront: order.tireSizeFront,
      sizeRear: order.tireSizeRear,
      brand: order.tireBrand,
      quantity: order.tireQuantity,
      type: order.tireType,
    },
    estimatedRetailCents: order.estimatedTotalCents,
    supplierQuoteCents: order.supplierQuoteCents,
    depositCents: order.depositCents,
  };
}

const ApproveTireSupplierOrderInput = z.object({
  id: z.string().min(1),
  supplierQuoteCents: z.number().int().min(0).optional().nullable(),
});

/** Manager approves supplier buy — submits to Weldon (or manual stub) and marks ORDERED. */
export async function approveTireSupplierOrder(
  raw: z.infer<typeof ApproveTireSupplierOrderInput>,
): Promise<TireActionResult & { message?: string }> {
  const parsed = ApproveTireSupplierOrderInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid approval request." };

  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const user = await getCurrentUser();

  const order = await prisma.tireOrder.findFirst({
    where: { id: parsed.data.id, shopId },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
        },
      },
      vehicle: {
        select: { year: true, make: true, model: true, vin: true },
      },
    },
  });
  if (!order) return { ok: false, error: "Tire order not found." };
  if (order.status !== "PENDING_SUPPLIER_APPROVAL") {
    return { ok: false, error: "This order is not awaiting supplier approval." };
  }

  const quoteCents = parsed.data.supplierQuoteCents ?? order.supplierQuoteCents;
  const payload = buildSupplierPayload({ ...order, supplierQuoteCents: quoteCents ?? null });

  let result;
  try {
    result = await getWeldonTire().submitOrder(payload);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Supplier order submission failed.",
    };
  }

  const nextStatus: TireOrderStatus = order.appointmentId ? "SCHEDULED" : "ORDERED";

  await prisma.tireOrder.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      supplierApprovedBy: user.id,
      supplierApprovedAt: new Date(),
      supplierQuoteCents: quoteCents ?? null,
      supplierOrderRef: result.orderRef ?? null,
      supplierOrderPayload: payload as object,
      supplierRejectedAt: null,
      supplierRejectionNote: null,
    },
  });

  revalidatePath("/tires");
  revalidatePath(`/tires/${order.id}`);
  return { ok: true, id: order.id, number: order.number, message: result.message };
}

const RejectTireSupplierOrderInput = z.object({
  id: z.string().min(1),
  note: z.string().trim().min(1).max(2000),
});

/** Manager rejects or requests changes — returns order to deposit-received for follow-up. */
export async function rejectTireSupplierOrder(
  raw: z.infer<typeof RejectTireSupplierOrderInput>,
): Promise<TireActionResult> {
  const parsed = RejectTireSupplierOrderInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a reason for rejection." };

  const shopId = await getShopId();
  const denied = await gates.ordersManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const order = await prisma.tireOrder.findFirst({
    where: { id: parsed.data.id, shopId },
    select: { id: true, number: true, status: true },
  });
  if (!order) return { ok: false, error: "Tire order not found." };
  if (order.status !== "PENDING_SUPPLIER_APPROVAL") {
    return { ok: false, error: "This order is not awaiting supplier approval." };
  }

  await prisma.tireOrder.update({
    where: { id: order.id },
    data: {
      status: "DEPOSIT_RECEIVED",
      supplierRejectedAt: new Date(),
      supplierRejectionNote: parsed.data.note,
    },
  });

  revalidatePath("/tires");
  revalidatePath(`/tires/${order.id}`);
  return { ok: true, id: order.id, number: order.number };
}
