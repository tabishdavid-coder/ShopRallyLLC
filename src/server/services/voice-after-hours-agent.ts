import "server-only";

import type { Prisma } from "@/generated/prisma";

import { prisma } from "@/db/client";
import { parseBookingSettings } from "@/lib/booking-settings";
import { publicUrl } from "@/lib/app-url";
import { normalizePhoneE164 } from "@/lib/phone";
import { isShopOpenNow } from "@/lib/shop-hours";
import { leadReadyToBook, type SmsAgentLeadDraft } from "@/lib/sms-agent-ai";
import {
  twimlAgentTurn,
  twimlDial,
  twimlHangup,
  twimlResponse,
  twimlSay,
} from "@/lib/twilio-voice-twiml";
import { canUseReleasedFeature } from "@/lib/subscription";
import { isAiConfigured } from "@/server/services/ai/client";
import { suggestVoiceAgentReply } from "@/server/services/ai/voice-agent";
import {
  createAppointmentFromLead,
  findOrCreateCustomerForPhone,
  mergeLead,
} from "@/server/services/receptionist-booking";

const SESSION_TTL_MS = 86_400_000;
const CONSENT_LINE =
  "This call may be recorded for scheduling purposes. By continuing, you consent to recording.";

type SessionState = {
  lead: SmsAgentLeadDraft;
  transcript: { role: "user" | "assistant"; text: string }[];
  bookedAppointmentId?: string;
  consentGiven?: boolean;
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
    consentGiven: o.consentGiven === true,
  };
}

function transcriptToText(transcript: SessionState["transcript"]): string {
  return transcript
    .map((row) => `${row.role === "user" ? "Caller" : "Shop"}: ${row.text}`)
    .join("\n");
}

export async function shouldRunVoiceAfterHoursAgent(shopId: string): Promise<boolean> {
  if (
    process.env.AI_VOICE_AGENT_ALWAYS_ON === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return true;
  }

  const allowed = await canUseReleasedFeature(shopId, "ai_receptionist");
  if (!allowed || !isAiConfigured()) return false;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      aiVoiceAgentEnabled: true,
      twilioPhoneNumber: true,
      timezone: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  if (!shop?.aiVoiceAgentEnabled || !shop.twilioPhoneNumber) return false;

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  return !isShopOpenNow({ timezone: shop.timezone, bookingSettings });
}

async function upsertSession(
  shopId: string,
  callSid: string,
  phone: string,
  customerId: string,
  state: SessionState,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.aiVoiceAgentSession.upsert({
    where: { callSid },
    create: {
      shopId,
      callSid,
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

async function ensureCallLog(input: {
  shopId: string;
  callSid: string;
  from: string;
  to: string;
  status: string;
  customerId?: string;
  consentGiven?: boolean;
}) {
  await prisma.voiceCallLog.upsert({
    where: { callSid: input.callSid },
    create: {
      shopId: input.shopId,
      callSid: input.callSid,
      fromPhone: normalizePhoneE164(input.from),
      toPhone: normalizePhoneE164(input.to),
      status: input.status,
      customerId: input.customerId,
      consentGiven: input.consentGiven ?? false,
    },
    update: {
      status: input.status,
      customerId: input.customerId ?? undefined,
      consentGiven: input.consentGiven ?? undefined,
    },
  });
}

function gatherUrl(): string {
  return publicUrl("/api/webhooks/twilio/voice/gather");
}

function recordingUrl(): string {
  return publicUrl("/api/webhooks/twilio/voice/recording");
}

export async function handleInboundVoiceCall(input: {
  shopId: string;
  from: string;
  to: string;
  callSid: string;
}): Promise<string> {
  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    select: {
      name: true,
      landlineNumber: true,
      timezone: true,
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  if (!shop) {
    return twimlResponse(twimlSay("Sorry, this number is not configured.") + twimlHangup());
  }

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const openNow = isShopOpenNow({ timezone: shop.timezone, bookingSettings });

  await ensureCallLog({
    shopId: input.shopId,
    callSid: input.callSid,
    from: input.from,
    to: input.to,
    status: openNow ? "forwarded" : "ringing",
  });

  if (openNow) {
    const landline = shop.landlineNumber?.trim();
    if (landline) {
      return twimlResponse(twimlSay(`Connecting you to ${shop.name}.`) + twimlDial(landline));
    }
    return twimlResponse(
      twimlSay(`Thanks for calling ${shop.name}. Please call back during business hours.`) +
        twimlHangup(),
    );
  }

  if (!(await shouldRunVoiceAfterHoursAgent(input.shopId))) {
    return twimlResponse(
      twimlSay(
        `Thanks for calling ${shop.name}. We're closed right now. Please call back during business hours or text us if SMS is enabled.`,
      ) + twimlHangup(),
    );
  }

  const customer = await findOrCreateCustomerForPhone(
    input.shopId,
    input.from,
    "AI Voice Agent",
    "Voice",
    "Lead",
  );

  await ensureCallLog({
    shopId: input.shopId,
    callSid: input.callSid,
    from: input.from,
    to: input.to,
    status: "agent",
    customerId: customer.id,
    consentGiven: true,
  });

  const greeting = `Thanks for calling ${shop.name}. We're closed right now, but I can help schedule service or take a message. What can I help you with today?`;

  await upsertSession(input.shopId, input.callSid, normalizePhoneE164(input.from), customer.id, {
    lead: {},
    transcript: [{ role: "assistant", text: greeting }],
    consentGiven: true,
  });

  return twimlAgentTurn({
    consentLine: CONSENT_LINE,
    say: greeting,
    gatherActionUrl: gatherUrl(),
    recordingCallbackUrl: recordingUrl(),
  });
}

export async function handleVoiceGather(input: {
  shopId: string;
  from: string;
  to: string;
  callSid: string;
  speechResult: string;
}): Promise<string> {
  const speech = input.speechResult.trim();
  const phoneE164 = normalizePhoneE164(input.from);

  const sessionRow = await prisma.aiVoiceAgentSession.findUnique({
    where: { callSid: input.callSid },
  });
  if (!sessionRow || sessionRow.shopId !== input.shopId) {
    return twimlResponse(twimlSay("Sorry, this session expired. Goodbye.") + twimlHangup());
  }

  let session = parseSessionState(sessionRow.state);
  if (session.bookedAppointmentId) {
    return twimlResponse(
      twimlSay("We already have your appointment on file. Goodbye, and thank you for calling.") +
        twimlHangup(),
    );
  }

  if (!speech) {
    return twimlAgentTurn({
      say: "I didn't catch that. Could you repeat what you need help with?",
      gatherActionUrl: gatherUrl(),
      recordingCallbackUrl: recordingUrl(),
    });
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
  if (!shop) {
    return twimlResponse(twimlSay("Sorry, something went wrong. Goodbye.") + twimlHangup());
  }

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  session.transcript.push({ role: "user", text: speech });

  let turn;
  try {
    turn = await suggestVoiceAgentReply(input.shopId, {
      inboundSpeech: speech,
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
    console.warn("[voice-agent]", err);
    return twimlResponse(
      twimlSay(
        `Thanks for calling ${shop.name}. We're closed — a team member will follow up during business hours. Goodbye.`,
      ) + twimlHangup(),
    );
  }

  session.lead = mergeLead(session.lead, turn.lead);

  if (turn.lead.firstName?.trim() && turn.lead.lastName?.trim() && sessionRow.customerId) {
    await prisma.customer.update({
      where: { id: sessionRow.customerId },
      data: {
        firstName: turn.lead.firstName.trim(),
        lastName: turn.lead.lastName.trim(),
      },
    });
  }

  let reply = turn.reply;
  let hangup = false;

  if (turn.readyToBook && leadReadyToBook(session.lead)) {
    const customerId = sessionRow.customerId;
    if (customerId) {
      const booked = await createAppointmentFromLead(
        input.shopId,
        customerId,
        session.lead,
        "VOICE_AGENT",
      );
      if (booked.ok) {
        session.bookedAppointmentId = booked.appointmentId;
        reply = `${reply} You're on the schedule. We'll confirm by phone or text if anything changes. Goodbye.`;
        hangup = true;
        await prisma.voiceCallLog.update({
          where: { callSid: input.callSid },
          data: {
            appointmentId: booked.appointmentId,
            summary: transcriptToText([
              ...session.transcript,
              { role: "assistant", text: reply },
            ]).slice(0, 4000),
            status: "completed",
          },
        });
      } else if (booked.reason.includes("not available")) {
        reply = `${reply} That time isn't open. What other day or time works for you?`;
        session.lead.preferredTime = undefined;
        session.lead.preferredDate = undefined;
      }
    }
  }

  session.transcript.push({ role: "assistant", text: reply });
  await upsertSession(
    input.shopId,
    input.callSid,
    phoneE164,
    sessionRow.customerId!,
    session,
  );

  if (hangup) {
    return twimlAgentTurn({
      say: reply,
      gatherActionUrl: gatherUrl(),
      hangupAfter: true,
    });
  }

  return twimlAgentTurn({
    say: reply,
    gatherActionUrl: gatherUrl(),
    recordingCallbackUrl: recordingUrl(),
  });
}

export async function handleVoiceRecordingStatus(input: {
  shopId: string;
  callSid: string;
  recordingUrl?: string;
  recordingDuration?: string;
}): Promise<void> {
  const duration = input.recordingDuration ? Number.parseInt(input.recordingDuration, 10) : null;
  await prisma.voiceCallLog.updateMany({
    where: { shopId: input.shopId, callSid: input.callSid },
    data: {
      recordingUrl: input.recordingUrl?.trim() || undefined,
      durationSeconds: Number.isFinite(duration) ? duration : undefined,
      status: "completed",
    },
  });
}
