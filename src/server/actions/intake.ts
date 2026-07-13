"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { formatMinutesLabel, parseTimeToMinutes } from "@/lib/appointments";
import { phoneDigitsKey, phoneMatchKey } from "@/lib/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { customerDisplayName } from "@/lib/format";
import { getShopByBookingSlug, getAvailableTimeSlots, getBookingDaySchedule } from "@/server/booking";
import {
  recordInitialCustomerConsents,
  syncCustomerConsentRecords,
} from "@/server/consent-records";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { sendBookingNotifications } from "@/server/services/booking-notifications";
import { isValidVin, decodeVinForShop } from "@/server/services/vin";
import { lookupPlateService } from "@/server/services/plate-lookup";
import { recordDecodeUsage } from "@/server/services/decode-usage";
import { canUseFeature } from "@/lib/subscription";

const IntakeInput = z.object({
  shopSlug: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().max(160).optional().nullable(),
  vehicleYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  vehicleMake: z.string().trim().max(60).optional().nullable(),
  vehicleModel: z.string().trim().max(60).optional().nullable(),
  vehicleTrim: z.string().trim().max(120).optional().nullable(),
  vehicleEngine: z.string().trim().max(120).optional().nullable(),
  vehicleVin: z.string().trim().max(17).optional().nullable(),
  vehiclePlate: z.string().trim().max(20).optional().nullable(),
  vehiclePlateState: z.string().trim().max(2).optional().nullable(),
  vehicleDescription: z.string().trim().max(200).optional().nullable(),
  serviceId: z.string().trim().max(40).optional().nullable(),
  additionalServiceIds: z.array(z.string().trim().max(40)).max(20).optional(),
  serviceConcerns: z.string().trim().max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  marketingOptIn: z.boolean().optional(),
  transactionalSmsConsent: z.boolean().optional(),
  marketingEmailConsent: z.boolean().optional(),
});

export type IntakeInput = z.infer<typeof IntakeInput>;

export type IntakeResult =
  | {
      ok: true;
      appointmentId: string;
      customerName: string;
      shopName: string;
      shopPhone?: string | null;
      shopAddress?: string | null;
      serviceName?: string;
      serviceConcerns?: string;
      date: string;
      startTime: string;
      durationMins: number;
      notifications: { email: boolean; sms: boolean };
    }
  | { ok: false; error: string };

function buildStartEnd(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

/** Public: fetch available slots for the booking form date picker. */
export async function fetchBookingTimeSlots(
  shopSlug: string,
  date: string,
  durationMins?: number,
): Promise<string[]> {
  const shop = await getShopByBookingSlug(shopSlug);
  if (!shop) return [];
  return getAvailableTimeSlots(shop.id, date, durationMins);
}

/** Public: 30-min grid + availability for online booking schedule UI. */
export async function fetchBookingDaySchedule(
  shopSlug: string,
  date: string,
  durationMins?: number,
) {
  const shop = await getShopByBookingSlug(shopSlug);
  if (!shop) return { allSlots: [] as string[], availableSlots: [] as string[], dayEnabled: false };
  return getBookingDaySchedule(shop.id, date, durationMins);
}

/** Public intake: find/create customer + vehicle, create appointment. */
export async function submitIntakeForm(raw: IntakeInput): Promise<IntakeResult> {
  const parsed = IntakeInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const data = parsed.data;

  const shop = await getShopByBookingSlug(data.shopSlug);
  if (!shop) {
    return { ok: false, error: "Online booking is not available for this shop." };
  }

  const fieldConfig = shop.fieldConfig;
  const services = shop.services;

  const hasSelectedService = Boolean(data.serviceId);
  const hasConcerns = Boolean(data.serviceConcerns.trim());

  if (services.length && !hasSelectedService && !hasConcerns) {
    return {
      ok: false,
      error: "Please select a service or describe what you need help with.",
    };
  }

  if (
    fieldConfig.showServiceConcerns &&
    services.length === 0 &&
    !hasConcerns
  ) {
    return { ok: false, error: "Please describe what you need help with." };
  }

  const selectedService = services.find((s) => s.id === data.serviceId);
  const extraServices = (data.additionalServiceIds ?? [])
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && s.id !== data.serviceId));

  if (data.serviceId && services.length && !selectedService) {
    return { ok: false, error: "Please select a valid service." };
  }

  if (fieldConfig.emailRequired && !data.email?.trim()) {
    return { ok: false, error: "Email is required." };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const vinNorm =
    data.vehicleVin?.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "") || null;
  const plateNorm = data.vehiclePlate?.trim().toUpperCase() || null;
  const plateStateNorm = data.vehiclePlateState?.trim().toUpperCase() || null;

  let resolvedVin: string | null = null;
  if (fieldConfig.showVin) {
    if (vinNorm && isValidVin(vinNorm)) {
      resolvedVin = vinNorm;
    } else if (plateNorm) {
      const plateAsVin = plateNorm.replace(/[^A-HJ-NPR-Z0-9]/g, "");
      if (isValidVin(plateAsVin)) resolvedVin = plateAsVin;
    }
  }

  let vehicleYear = data.vehicleYear ?? null;
  let vehicleMake = data.vehicleMake?.trim() || null;
  let vehicleModel = data.vehicleModel?.trim() || null;
  let vehicleTrim = data.vehicleTrim?.trim() || null;
  let vehicleEngine = data.vehicleEngine?.trim() || null;
  let decodedData: unknown | undefined;

  const actualPlate =
    plateNorm && !isValidVin(plateNorm.replace(/[^A-HJ-NPR-Z0-9]/g, "")) ? plateNorm : null;
  const hasPlate = Boolean(actualPlate);

  if (resolvedVin) {
    try {
      const decoded = await decodeVinForShop(shop.id, resolvedVin);
      if (decoded) {
        if (!vehicleYear && decoded.year) vehicleYear = decoded.year;
        if (!vehicleMake && decoded.make) vehicleMake = decoded.make;
        if (!vehicleModel && decoded.model) vehicleModel = decoded.model;
        if (!vehicleTrim && decoded.trim) vehicleTrim = decoded.trim;
        if (!vehicleEngine && decoded.engine) vehicleEngine = decoded.engine;
        decodedData = decoded.raw;
        await recordDecodeUsage(shop.id, "VIN").catch(() => undefined);
      }
    } catch {
      // Non-fatal — proceed with whatever the customer entered.
    }
  } else if (
    actualPlate &&
    plateStateNorm &&
    fieldConfig.showPlateLookup &&
    (await canUseFeature(shop.id, "autodevDecoding"))
  ) {
    try {
      const plateResult = await lookupPlateService(actualPlate, plateStateNorm);
      if (plateResult.ok) {
        const decoded = plateResult.decoded;
        if (plateResult.vin) resolvedVin = plateResult.vin;
        if (!vehicleYear && decoded.year) vehicleYear = decoded.year;
        if (!vehicleMake && decoded.make) vehicleMake = decoded.make;
        if (!vehicleModel && decoded.model) vehicleModel = decoded.model;
        if (!vehicleTrim && decoded.trim) vehicleTrim = decoded.trim;
        if (!vehicleEngine && decoded.engine) vehicleEngine = decoded.engine;
        decodedData = decoded.raw;
        await recordDecodeUsage(shop.id, "PLATE").catch(() => undefined);
      }
    } catch {
      // Non-fatal — plate-only booking still allowed when configured.
    }
  }

  const hasYmm =
    vehicleYear != null && Boolean(vehicleMake) && Boolean(vehicleModel);
  // Submodel (trim) and engine are optional — only YMM is required when vehicle is required.

  if (fieldConfig.vehicleRequired && !hasYmm && !(fieldConfig.showPlateLookup && hasPlate)) {
    return { ok: false, error: "Vehicle year, make, and model are required." };
  }

  const ip = await clientIp();
  if (!checkRateLimit(`intake:${shop.id}:${ip}`, { max: 5, windowMs: 60_000 })) {
    return { ok: false, error: "Too many requests. Please wait a minute and try again." };
  }

  const durationMins = Math.max(
    selectedService?.durationMins ?? shop.apptDefaultDurationMins,
    ...extraServices.map((s) => s.durationMins),
  );

  const slots = await getAvailableTimeSlots(shop.id, data.date, durationMins);
  if (!slots.includes(data.startTime)) {
    return { ok: false, error: "That time slot is no longer available. Please pick another." };
  }

  const { startAt, endAt } = buildStartEnd(data.date, data.startTime, durationMins);

  const phoneKey = phoneMatchKey(data.phone);
  const emailNorm = data.email?.trim().toLowerCase() ?? null;

  let customer = await prisma.customer.findFirst({
    where: {
      shopId: shop.id,
      OR: [
        ...(phoneKey ? [{ phoneDigits: { contains: phoneKey } }] : []),
        ...(emailNorm ? [{ email: { equals: emailNorm, mode: "insensitive" as const } }] : []),
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      notes: true,
      marketingOptIn: true,
      transactionalSmsConsent: true,
      marketingEmailConsent: true,
    },
  });

  const consent = {
    transactionalSmsConsent: data.transactionalSmsConsent === true,
    marketingOptIn: data.marketingOptIn === true,
    marketingEmailConsent: data.marketingEmailConsent === true,
  };

  if (customer) {
    const before = {
      transactionalSmsConsent: customer.transactionalSmsConsent,
      marketingOptIn: customer.marketingOptIn,
      marketingEmailConsent: customer.marketingEmailConsent,
    };
    const afterConsent = {
      transactionalSmsConsent: consent.transactionalSmsConsent || before.transactionalSmsConsent,
      marketingOptIn: consent.marketingOptIn || before.marketingOptIn,
      marketingEmailConsent: consent.marketingEmailConsent || before.marketingEmailConsent,
    };
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: emailNorm ?? undefined,
        phoneDigits: phoneDigitsKey(data.phone),
        ...afterConsent,
      },
    });
    await syncCustomerConsentRecords(shop.id, customer.id, before, afterConsent, "intake_form");
    customer = {
      ...customer,
      firstName: data.firstName,
      lastName: data.lastName,
    };
  } else {
    customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: emailNorm,
        phoneDigits: phoneDigitsKey(data.phone),
        leadSource: "Website",
        marketingOptIn: consent.marketingOptIn,
        transactionalSmsConsent: consent.transactionalSmsConsent,
        marketingEmailConsent: consent.marketingEmailConsent,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        notes: true,
        marketingOptIn: true,
        transactionalSmsConsent: true,
        marketingEmailConsent: true,
      },
    });
    await recordShopAuditEventSafe({
      shopId: shop.id,
      eventType: ShopAuditEventType.CUSTOMER_CREATED,
      summary: `Customer created via online booking (${data.firstName} ${data.lastName})`.trim(),
      metadata: { customerId: customer.id, source: "intake_form" },
      actor: null,
    });
    if (
      consent.transactionalSmsConsent ||
      consent.marketingOptIn ||
      consent.marketingEmailConsent
    ) {
      await recordInitialCustomerConsents(shop.id, customer.id, consent, "intake_form");
    }
  }

  await prisma.customer.updateMany({
    where: { id: customer.id, leadSource: null },
    data: { leadSource: "Website" },
  });

  let vehicleId: string | null = null;

  if (hasYmm) {
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        shopId: shop.id,
        customerId: customer.id,
        year: vehicleYear,
        make: { equals: vehicleMake!, mode: "insensitive" },
        model: { equals: vehicleModel!, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existingVehicle) {
      vehicleId = existingVehicle.id;
      if (resolvedVin || actualPlate) {
        await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            ...(resolvedVin ? { vin: resolvedVin } : {}),
            ...(actualPlate ? { plate: actualPlate, plateState: plateStateNorm ?? undefined } : {}),
            ...(vehicleTrim ? { trim: vehicleTrim } : {}),
            ...(vehicleEngine ? { engine: vehicleEngine } : {}),
            ...(decodedData ? { decodedData: decodedData as object } : {}),
          },
        });
      }
    } else {
      const vehicle = await prisma.vehicle.create({
        data: {
          shopId: shop.id,
          customerId: customer.id,
          year: vehicleYear,
          make: vehicleMake!,
          model: vehicleModel!,
          trim: vehicleTrim ?? undefined,
          engine: vehicleEngine ?? undefined,
          vin: resolvedVin ?? undefined,
          plate: actualPlate ?? undefined,
          plateState: plateStateNorm ?? undefined,
          decodedData: decodedData ? (decodedData as object) : undefined,
        },
        select: { id: true },
      });
      vehicleId = vehicle.id;
    }
  } else if (resolvedVin || actualPlate) {
    const vehicle = await prisma.vehicle.create({
      data: {
        shopId: shop.id,
        customerId: customer.id,
        year: vehicleYear ?? undefined,
        make: vehicleMake ?? undefined,
        model: vehicleModel ?? undefined,
        trim: vehicleTrim ?? undefined,
        engine: vehicleEngine ?? undefined,
        vin: resolvedVin ?? undefined,
        plate: actualPlate ?? undefined,
        plateState: plateStateNorm ?? undefined,
        decodedData: decodedData ? (decodedData as object) : undefined,
      },
      select: { id: true },
    });
    vehicleId = vehicle.id;
  }

  const vehicleNote = data.vehicleDescription?.trim();
  const notesParts: string[] = [];
  const allServiceNames = [
    ...(selectedService ? [selectedService.name] : []),
    ...extraServices.map((s) => s.name),
  ];
  if (allServiceNames.length) notesParts.push(`Services: ${allServiceNames.join(", ")}`);
  if (data.serviceConcerns.trim()) {
    notesParts.push(`Your note: ${data.serviceConcerns.trim()}`);
  }
  if (data.marketingOptIn === true) {
    notesParts.push("SMS marketing: opted in");
  }
  if (vehicleNote && !hasYmm) notesParts.unshift(`Vehicle: ${vehicleNote}`);
  const notes = notesParts.join("\n\n");

  const serviceLabel =
    allServiceNames.length > 1
      ? allServiceNames.join(", ")
      : selectedService?.name;

  const title = hasYmm
    ? `${customerDisplayName(customer)} — ${vehicleYear} ${vehicleMake} ${vehicleModel}`
    : serviceLabel
      ? `${customerDisplayName(customer)} — ${serviceLabel}`
      : `${customerDisplayName(customer)} — Website booking`;

  const appt = await prisma.appointment.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      vehicleId,
      title,
      startAt,
      endAt,
      notes,
      serviceName: serviceLabel ?? null,
      status: "SCHEDULED",
      source: "WEBSITE",
    },
    select: { id: true },
  });

  const timeLabel = formatMinutesLabel(parseTimeToMinutes(data.startTime));
  const activityLine = `Online booking: ${serviceLabel ?? "Appointment"} on ${data.date} at ${timeLabel}`;
  const existingNotes = customer.notes?.trim();
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      notes: existingNotes ? `${existingNotes}\n\n${activityLine}` : activityLine,
    },
  });

  const shopAddress = [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  const vehicleLabel = hasYmm
    ? `${vehicleYear} ${vehicleMake} ${vehicleModel}${resolvedVin ? ` (VIN …${resolvedVin.slice(-6)})` : ""}`
    : vehicleNote || undefined;

  const notifications = await sendBookingNotifications({
    shopId: shop.id,
    shopName: shop.name,
    shopPhone: shop.phone,
    shopEmail: shop.email,
    shopAddress: shopAddress || null,
    notifyEmails: shop.notifyEmails,
    customerId: customer.id,
    customerName: customerDisplayName(customer),
    customerEmail: emailNorm,
    customerPhone: data.phone,
    serviceName: serviceLabel,
    date: data.date,
    startTime: data.startTime,
    durationMins,
    vehicleLabel,
    concerns: data.serviceConcerns.trim() || undefined,
    appointmentId: appt.id,
  });

  revalidatePath("/appointments");
  revalidatePath("/marketing");
  revalidatePath("/customers");

  return {
    ok: true,
    appointmentId: appt.id,
    customerName: customerDisplayName(customer),
    shopName: shop.name,
    shopPhone: shop.phone,
    shopAddress: shopAddress || null,
    serviceName: serviceLabel,
    serviceConcerns: data.serviceConcerns.trim() || undefined,
    date: data.date,
    startTime: data.startTime,
    durationMins,
    notifications: {
      email: notifications.customerEmail,
      sms: notifications.customerSms,
    },
  };
}
