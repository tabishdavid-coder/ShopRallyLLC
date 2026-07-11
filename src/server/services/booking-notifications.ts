import "server-only";

import { SMS_ENABLED } from "@/lib/features";
import { formatMinutesLabel, parseTimeToMinutes } from "@/lib/appointments";
import { canUseReleasedFeature } from "@/lib/subscription";
import { emailConfigured, getEmail } from "@/server/services/email";
import { sendShopEmail } from "@/server/services/shop-email";
import { recordOutboundMessage } from "@/server/services/messaging";
import { getSms } from "@/server/services/sms";

export type BookingNotificationContext = {
  shopId: string;
  shopName: string;
  shopPhone: string | null;
  shopEmail: string | null;
  shopAddress: string | null;
  notifyEmails: string[];
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  serviceName?: string;
  date: string;
  startTime: string;
  durationMins: number;
  vehicleLabel?: string;
  concerns?: string;
  appointmentId: string;
};

export type BookingNotificationResult = {
  customerEmail: boolean;
  customerSms: boolean;
  shopEmail: boolean;
};

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function appointmentSummary(ctx: BookingNotificationContext): string {
  const timeLabel = formatMinutesLabel(parseTimeToMinutes(ctx.startTime));
  const dateLabel = formatDateLabel(ctx.date);
  const lines = [
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Duration: ${ctx.durationMins} minutes`,
  ];
  if (ctx.serviceName) lines.unshift(`Service: ${ctx.serviceName}`);
  if (ctx.vehicleLabel) lines.push(`Vehicle: ${ctx.vehicleLabel}`);
  if (ctx.concerns?.trim()) lines.push(`Notes: ${ctx.concerns.trim()}`);
  return lines.join("\n");
}

function buildCustomerEmailBody(ctx: BookingNotificationContext): string {
  const summary = appointmentSummary(ctx);
  const contact = [ctx.shopPhone, ctx.shopAddress].filter(Boolean).join("\n");
  return [
    `Hi ${ctx.customerName.split(" ")[0] ?? ctx.customerName},`,
    "",
    `Your appointment at ${ctx.shopName} is confirmed.`,
    "",
    summary,
    "",
    contact ? `Shop contact:\n${contact}` : "",
    "",
    "If you need to reschedule, please call the shop.",
    "",
    `— ${ctx.shopName}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildShopEmailBody(ctx: BookingNotificationContext): string {
  const summary = appointmentSummary(ctx);
  return [
    `New online booking at ${ctx.shopName}`,
    "",
    `Customer: ${ctx.customerName}`,
    `Phone: ${ctx.customerPhone}`,
    ctx.customerEmail ? `Email: ${ctx.customerEmail}` : "",
    "",
    summary,
    "",
    `Appointment ID: ${ctx.appointmentId}`,
    `Customer ID: ${ctx.customerId}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCustomerSmsBody(ctx: BookingNotificationContext): string {
  const timeLabel = formatMinutesLabel(parseTimeToMinutes(ctx.startTime));
  const dateLabel = formatDateLabel(ctx.date);
  const svc = ctx.serviceName ? `${ctx.serviceName} — ` : "";
  return `${ctx.shopName}: You're booked! ${svc}${dateLabel} at ${timeLabel}. Questions? Call ${ctx.shopPhone ?? "the shop"}.`;
}

async function logOutbound(
  shopId: string,
  customerId: string,
  body: string,
  status: string,
  extra?: { twilioSid?: string },
) {
  try {
    await recordOutboundMessage({
      shopId,
      customerId,
      body,
      status,
      twilioSid: extra?.twilioSid,
    });
  } catch (e) {
    console.error("[booking-notifications] failed to record message:", e);
  }
}

/** Send customer + shop notifications after a successful online booking. Never throws. */
export async function sendBookingNotifications(
  ctx: BookingNotificationContext,
): Promise<BookingNotificationResult> {
  const result: BookingNotificationResult = {
    customerEmail: false,
    customerSms: false,
    shopEmail: false,
  };

  const customerSubject = `Appointment confirmed — ${ctx.shopName}`;

  if (ctx.customerEmail?.includes("@")) {
    try {
      const body = buildCustomerEmailBody(ctx);
      const res = await sendShopEmail({
        shopId: ctx.shopId,
        to: ctx.customerEmail,
        subject: customerSubject,
        body,
      });
      if (res.mode === "live" || res.mode === "mock") {
        await logOutbound(
          ctx.shopId,
          ctx.customerId,
          `[email → ${ctx.customerEmail}] ${body}`,
          res.status,
        );
        result.customerEmail = res.mode === "live";
      }
    } catch (e) {
      console.error("[booking-notifications] customer email failed:", e);
      await logOutbound(
        ctx.shopId,
        ctx.customerId,
        `[email → ${ctx.customerEmail}] confirmation failed`,
        "failed",
      );
    }
  }

  if (SMS_ENABLED && ctx.customerPhone.trim()) {
    try {
      if (await canUseReleasedFeature(ctx.shopId, "sms")) {
        const provider = getSms();
        const body = buildCustomerSmsBody(ctx);
        const res = await provider.send(ctx.customerPhone, body);
        await logOutbound(ctx.shopId, ctx.customerId, body, res.status, {
          twilioSid: res.sid,
        });
        result.customerSms = true;
      }
    } catch (e) {
      console.error("[booking-notifications] customer SMS failed:", e);
    }
  }

  const staffRecipients = [
    ...ctx.notifyEmails.filter((e) => e.includes("@")),
    ...(ctx.notifyEmails.length === 0 && ctx.shopEmail?.includes("@")
      ? [ctx.shopEmail]
      : []),
  ];

  if (staffRecipients.length) {
    const shopSubject = `New online booking — ${ctx.customerName}`;
    const shopBody = buildShopEmailBody(ctx);
    for (const to of staffRecipients) {
      try {
        const provider = getEmail();
        const res = await provider.send(to, shopSubject, shopBody);
        await logOutbound(
          ctx.shopId,
          ctx.customerId,
          `[staff email → ${to}] ${shopBody}`,
          res.status,
        );
        result.shopEmail = true;
      } catch (e) {
        console.error(`[booking-notifications] shop email to ${to} failed:`, e);
      }
    }
  } else if (!emailConfigured()) {
    console.log("[booking-notifications] shop notification (no recipients configured):\n", buildShopEmailBody(ctx));
  }

  return result;
}
