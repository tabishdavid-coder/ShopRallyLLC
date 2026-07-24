import "server-only";

import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { parseBookingSettings } from "@/lib/booking-settings";
import { normalizePhoneE164 } from "@/lib/phone";
import { isShopOpenNow } from "@/lib/shop-hours";
import { leadReadyToBook, type SmsAgentLeadDraft } from "@/lib/sms-agent-ai";
import { isSmsStopKeyword } from "@/lib/sms-constants";
import { canUseReleasedFeature } from "@/lib/subscription";
import { isAiConfigured } from "@/server/services/ai/client";
import { suggestSmsAgentReply } from "@/server/services/ai/sms-agent";
import {
  createAppointmentFromLead,
  findOrCreateCustomerForPhone,
  mergeLead,
} from "@/server/services/receptionist-booking";
import {
  findActiveRepairOrderId,
  findCustomerByPhone,
  recordInboundSms,
} from "@/server/services/messaging";

const SESSION_TTL_MS = 86_400_000;

type SessionState = {
  lead: SmsAgentLeadDraft;
  transcript: { role: "user" | "assistant"; text: string }[];
  bookedAppointmentId?: string;
};

function parseSessionState(raw: unknown): SessionState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { lead: {}, transcript: [] };
  }
  const o = raw as Record<string, unknown>;
  const lead =
    o.lead && typeof o.lead === "object" && !Array.isArray(o.lead)
      ? (o.lead as SmsAgentLeadDraft)
      : {};
  const transcript = Array.isArray(o.transcript)
    ? o.transcript
        .filter(
          (row): row is { role: "user" | "assistant"; text: string } =>
            !!row &&
            typeof row === "object" &&
            (row as { role?: unknown }).role !== undefined &&
            typeof (row as { text?: unknown }).text === "string" &&
            ((row as { role: string }).role === "user" ||
              (row as { role: string }).role === "assistant"),
        )
        .slice(-12)
    : [];
  return {
    lead,
    transcript,
    bookedAppointmentId:
      typeof o.bookedAppointmentId === "string" ? o.bookedAppointmentId : undefined,
  };
}

function transcriptToText(transcript: SessionState["transcript"]): string {
  return transcript
    .map((row) => `${row.role === "user" ? "Customer" : "Shop"}: ${row.text}`)
    .join("\n");
}

export async function shouldRunSmsAfterHoursAgent(shopId: string): Promise<boolean> {
  if (
    process.env.AI_SMS_AGENT_ALWAYS_ON === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return true;
  }

  const allowed = await canUseReleasedFeature(shopId, "ai_receptionist");
  if (!allowed || !isAiConfigured()) return false;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      aiSmsAgentEnabled: true,
      smsEnabled: true,
      timezone: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  if (!shop?.aiSmsAgentEnabled || !shop.smsEnabled) return false;

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  return !isShopOpenNow({ timezone: shop.timezone, bookingSettings });
}

async function upsertSession(
  shopId: string,
  phone: string,
  customerId: string,
  state: SessionState,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.aiSmsAgentSession.upsert({
    where: { shopId_phone: { shopId, phone } },
    create: {
      shopId,
      phone,
      customerId,
      state: state as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      customerId,
      state: state as unknown as Prisma.InputJsonValue,
      expiresAt,
    },
  });
}

export type SmsAfterHoursResult = {
  reply: string | null;
  handled: boolean;
};

/** Handle inbound SMS with Elite after-hours agent; returns TwiML reply text when handled. */
export async function handleSmsAfterHoursAgent(input: {
  shopId: string;
  from: string;
  to: string;
  body: string;
  twilioSid?: string;
}): Promise<SmsAfterHoursResult> {
  const bodyTrim = input.body.trim();
  const bodyUpper = bodyTrim.toUpperCase();

  if (isSmsStopKeyword(bodyUpper)) {
    const customer = await findCustomerByPhone(input.shopId, input.from);
    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { marketingOptIn: false },
      });
    }
    return {
      handled: true,
      reply:
        "You have been unsubscribed from marketing texts. Reply during business hours for help.",
    };
  }

  const customer = await findOrCreateCustomerForPhone(
    input.shopId,
    input.from,
    "AI SMS Agent",
    "SMS",
    "Lead",
  );
  const phoneE164 = normalizePhoneE164(input.from);

  await recordInboundSms({
    shopId: input.shopId,
    from: input.from,
    to: input.to,
    body: bodyTrim,
    twilioSid: input.twilioSid,
  });

  const sessionRow = await prisma.aiSmsAgentSession.findUnique({
    where: { shopId_phone: { shopId: input.shopId, phone: phoneE164 } },
  });
  let session = parseSessionState(sessionRow?.state);
  if (session.bookedAppointmentId) {
    return {
      handled: true,
      reply:
        "Thanks — we already have your appointment request on file. We'll see you soon or call if anything changes.",
    };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    select: {
      name: true,
      phone: true,
      bookingSlug: true,
      code: true,
      onlineBookingEnabled: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  if (!shop) return { handled: false, reply: null };

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  session.transcript.push({ role: "user", text: bodyTrim });

  let turn;
  try {
    turn = await suggestSmsAgentReply(input.shopId, {
      inboundMessage: bodyTrim,
      priorLead: session.lead,
      recentTranscript: transcriptToText(session.transcript.slice(0, -1)),
      shop: {
        shopName: shop.name,
        shopPhone: shop.phone,
        bookingSlug: shop.bookingSlug ?? shop.code.toLowerCase(),
        onlineBookingEnabled: shop.onlineBookingEnabled,
        services: bookingSettings.services.map((s) => s.name).slice(0, 8),
      },
    });
  } catch (err) {
    console.warn("[sms-agent]", err);
    return {
      handled: true,
      reply: `Thanks for texting ${shop.name}. We're closed right now — a team member will follow up during business hours.`,
    };
  }

  session.lead = mergeLead(session.lead, turn.lead);

  if (turn.lead.firstName?.trim() && turn.lead.lastName?.trim()) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: turn.lead.firstName.trim(),
        lastName: turn.lead.lastName.trim(),
      },
    });
  }

  let reply = turn.reply;

  if (turn.readyToBook && leadReadyToBook(session.lead)) {
    const booked = await createAppointmentFromLead(
      input.shopId,
      customer.id,
      session.lead,
      "SMS_AGENT",
    );
    if (booked.ok) {
      session.bookedAppointmentId = booked.appointmentId;
      reply = `${reply}\n\nYou're on the schedule — we'll confirm by text or call if anything changes.`;
    } else if (booked.reason.includes("not available")) {
      reply = `${reply}\n\nThat time isn't open — what other day or time works for you?`;
      session.lead.preferredTime = undefined;
      session.lead.preferredDate = undefined;
    }
  }

  session.transcript.push({ role: "assistant", text: reply });

  await upsertSession(input.shopId, phoneE164, customer.id, session);

  const repairOrderId = await findActiveRepairOrderId(input.shopId, customer.id);
  await prisma.message.create({
    data: {
      shopId: input.shopId,
      customerId: customer.id,
      repairOrderId,
      direction: "OUTBOUND",
      body: reply,
      status: "sent",
      fromNumber: normalizePhoneE164(input.to),
      toNumber: phoneE164,
      sentAt: new Date(),
    },
  });

  return { handled: true, reply };
}
