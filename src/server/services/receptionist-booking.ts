import "server-only";

import { prisma } from "@/db/client";
import { parseTimeToMinutes } from "@/lib/appointments";
import { parseBookingSettings } from "@/lib/booking-settings";
import { customerDisplayName } from "@/lib/format";
import { phoneDigitsKey, normalizePhoneE164 } from "@/lib/phone";
import { leadReadyToBook, type SmsAgentLeadDraft } from "@/lib/sms-agent-ai";
import { getAvailableTimeSlots } from "@/server/booking";
import { sendBookingNotifications } from "@/server/services/booking-notifications";
import { findCustomerByPhone } from "@/server/services/messaging";

function buildStartEnd(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const mins = parseTimeToMinutes(startTime);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, Math.floor(mins / 60), mins % 60, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

export async function findOrCreateCustomerForPhone(
  shopId: string,
  fromPhone: string,
  leadSource: string,
  placeholderFirst = "Phone",
  placeholderLast = "Lead",
) {
  const existing = await findCustomerByPhone(shopId, fromPhone);
  if (existing) return existing;

  return prisma.customer.create({
    data: {
      shopId,
      firstName: placeholderFirst,
      lastName: placeholderLast,
      phone: normalizePhoneE164(fromPhone),
      phoneDigits: phoneDigitsKey(fromPhone),
      leadSource,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      altPhone: true,
      marketingOptIn: true,
    },
  });
}

export async function createAppointmentFromLead(
  shopId: string,
  customerId: string,
  lead: SmsAgentLeadDraft,
  source: "SMS_AGENT" | "VOICE_AGENT",
): Promise<{ ok: true; appointmentId: string } | { ok: false; reason: string }> {
  if (!leadReadyToBook(lead)) {
    return { ok: false, reason: "Missing booking fields." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      apptDefaultDurationMins: true,
      bookingSettings: true,
    },
  });
  if (!shop) return { ok: false, reason: "Shop not found." };

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      firstName: true,
      lastName: true,
      company: true,
      email: true,
      phone: true,
    },
  });
  if (!customer) return { ok: false, reason: "Customer not found." };

  const durationMins = shop.apptDefaultDurationMins;
  const date = lead.preferredDate!;
  const startTime = lead.preferredTime!;
  const slots = await getAvailableTimeSlots(shopId, date, durationMins);
  if (!slots.includes(startTime)) {
    return {
      ok: false,
      reason: "That time is not available. Ask for another day or time.",
    };
  }

  const channelLabel = source === "VOICE_AGENT" ? "After-hours voice intake" : "After-hours SMS intake";
  const { startAt, endAt } = buildStartEnd(date, startTime, durationMins);
  const title = `${customerDisplayName(customer)} — ${lead.concern!.trim()}`;
  const appt = await prisma.appointment.create({
    data: {
      shopId,
      customerId,
      title,
      startAt,
      endAt,
      notes: `${channelLabel}\n\nConcern: ${lead.concern!.trim()}`,
      serviceName: lead.concern!.trim().slice(0, 120),
      status: "SCHEDULED",
      source,
    },
    select: { id: true },
  });

  try {
    const notifyEmails =
      (shop.bookingSettings &&
      typeof shop.bookingSettings === "object" &&
      !Array.isArray(shop.bookingSettings) &&
      Array.isArray((shop.bookingSettings as { notifyEmails?: unknown }).notifyEmails)
        ? ((shop.bookingSettings as { notifyEmails: string[] }).notifyEmails ?? [])
        : []) ?? [];

    await sendBookingNotifications({
      shopId,
      shopName: shop.name,
      shopPhone: shop.phone,
      shopEmail: shop.email,
      shopAddress: [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ") || null,
      notifyEmails,
      customerId,
      customerName: customerDisplayName(customer),
      customerEmail: customer.email,
      customerPhone: customer.phone ?? "",
      serviceName: lead.concern!.trim(),
      date,
      startTime,
      durationMins,
      concerns: lead.concern!.trim(),
      appointmentId: appt.id,
    });
  } catch (err) {
    console.warn(`[${source.toLowerCase()}] booking notification failed:`, err);
  }

  return { ok: true, appointmentId: appt.id };
}

export function mergeLead(prior: SmsAgentLeadDraft, next: SmsAgentLeadDraft): SmsAgentLeadDraft {
  return {
    firstName: next.firstName?.trim() || prior.firstName,
    lastName: next.lastName?.trim() || prior.lastName,
    concern: next.concern?.trim() || prior.concern,
    preferredDate: next.preferredDate?.trim() || prior.preferredDate,
    preferredTime: next.preferredTime?.trim() || prior.preferredTime,
  };
}

export { leadReadyToBook, type SmsAgentLeadDraft };
