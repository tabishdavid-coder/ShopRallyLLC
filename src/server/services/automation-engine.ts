import "server-only";

import { prisma } from "@/db/client";
import { applyAutomationMergeFields } from "@/lib/automations";
import { customerDisplayName } from "@/lib/format";
import { getCampaignContext } from "@/server/campaigns";
import { sendShopEmail } from "@/server/services/shop-email";
import { sendShopSms } from "@/server/services/messaging";
import type {
  AutomationKey,
  AutomationTriggerTiming,
  AutomationTriggerUnit,
  CampaignChannel,
  MarketingAutomation,
} from "@/generated/prisma";

export type AutomationEvent =
  | { type: "RO_COMPLETED"; shopId: string; repairOrderId: string; customerId: string }
  | { type: "INSPECTION_DECLINED"; shopId: string; repairOrderId: string; customerId: string }
  | { type: "APPOINTMENT_CREATED"; shopId: string; appointmentId: string; customerId: string }
  | { type: "APPOINTMENT_UPDATED"; shopId: string; appointmentId: string; customerId: string };

const RO_COMPLETED_KEYS: AutomationKey[] = [
  "REVIEW_REQUEST",
  "RECENT_SERVICE_FOLLOWUP",
  "LOST_CUSTOMER_6MO",
  "LOST_CUSTOMER_12MO",
];

const INSPECTION_DECLINED_KEYS: AutomationKey[] = ["DECLINED_SERVICE_REMINDER"];

const APPOINTMENT_INSTANT_KEYS: AutomationKey[] = ["APPOINTMENT_CONFIRMATION"];

function addOffset(
  base: Date,
  amount: number,
  unit: AutomationTriggerUnit,
): Date {
  const d = new Date(base);
  switch (unit) {
    case "HOURS":
      d.setHours(d.getHours() + amount);
      break;
    case "DAYS":
      d.setDate(d.getDate() + amount);
      break;
    case "MONTHS":
      d.setMonth(d.getMonth() + amount);
      break;
  }
  return d;
}

function subtractOffset(
  base: Date,
  amount: number,
  unit: AutomationTriggerUnit,
): Date {
  const d = new Date(base);
  switch (unit) {
    case "HOURS":
      d.setHours(d.getHours() - amount);
      break;
    case "DAYS":
      d.setDate(d.getDate() - amount);
      break;
    case "MONTHS":
      d.setMonth(d.getMonth() - amount);
      break;
  }
  return d;
}

function channelsForAutomation(automation: MarketingAutomation): CampaignChannel[] {
  const out: CampaignChannel[] = [];
  if (automation.smsEnabled) out.push("SMS");
  if (automation.emailEnabled) out.push("EMAIL");
  if (automation.smsEnabled && automation.emailEnabled) out.push("BOTH");
  return out.length === 2 && automation.smsEnabled && automation.emailEnabled
    ? ["BOTH"]
    : out;
}

async function loadMergeContext(
  shopId: string,
  customerId: string,
  repairOrderId?: string,
  appointmentId?: string,
) {
  const ctx = await getCampaignContext(shopId);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      marketingOptIn: true,
    },
  });
  if (!customer) return null;

  let vehicleMakeModel = "your vehicle";
  if (repairOrderId) {
    const ro = await prisma.repairOrder.findFirst({
      where: { id: repairOrderId, shopId },
      select: { vehicle: { select: { year: true, make: true, model: true } } },
    });
    if (ro?.vehicle) {
      vehicleMakeModel = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`.trim();
    }
  }

  let appointmentDate = "";
  let appointmentTime = "";
  if (appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, shopId },
      select: { startAt: true },
    });
    if (appt) {
      appointmentDate = appt.startAt.toLocaleDateString("en-US");
      appointmentTime = appt.startAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }

  return {
    customer,
    vars: {
      first_name: customer.firstName,
      customer_name: customerDisplayName(customer),
      shop_name: ctx.shopName,
      shop_phone: ctx.shopPhone || "our shop",
      booking_link: ctx.bookingLink,
      review_link: ctx.reviewLink,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      vehicle_make_model: vehicleMakeModel,
    },
  };
}

async function alreadySent(
  automationId: string,
  customerId: string,
  limitOne: boolean,
): Promise<boolean> {
  if (!limitOne) return false;
  const prior = await prisma.automationSend.findFirst({
    where: {
      automationId,
      customerId,
      status: { in: ["SENT", "DELIVERED"] },
    },
    select: { id: true },
  });
  return Boolean(prior);
}

async function scheduleSend(
  automation: MarketingAutomation,
  customerId: string,
  channel: CampaignChannel,
  scheduledFor: Date,
) {
  const dup = await prisma.automationSend.findFirst({
    where: {
      automationId: automation.id,
      customerId,
      status: "PENDING",
      scheduledFor,
    },
    select: { id: true },
  });
  if (dup) return;

  await prisma.automationSend.create({
    data: {
      automationId: automation.id,
      customerId,
      channel,
      status: "PENDING",
      scheduledFor,
    },
  });
}

export async function deliverAutomationSend(sendId: string): Promise<boolean> {
  const send = await prisma.automationSend.findUnique({
    where: { id: sendId },
    include: {
      automation: { include: { shop: { select: { id: true } } } },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          email: true,
          marketingOptIn: true,
        },
      },
    },
  });
  if (!send || send.status !== "PENDING") return false;

  const shopId = send.automation.shopId;
  const automation = send.automation;
  const customer = send.customer;

  if (!customer.marketingOptIn) {
    await prisma.automationSend.update({
      where: { id: sendId },
      data: { status: "SKIPPED", error: "Not opted in" },
    });
    return false;
  }

  if (!automation.includeBusinessCustomers && customer.company) {
    await prisma.automationSend.update({
      where: { id: sendId },
      data: { status: "SKIPPED", error: "Business customers excluded" },
    });
    return false;
  }

  const loaded = await loadMergeContext(shopId, customer.id);
  if (!loaded) {
    await prisma.automationSend.update({
      where: { id: sendId },
      data: { status: "FAILED", error: "Customer not found" },
    });
    return false;
  }

  const { vars } = loaded;
  const smsBody = applyAutomationMergeFields(automation.smsMessage, vars);
  let anySent = false;
  let error: string | undefined;

  const sendSms = send.channel === "SMS" || send.channel === "BOTH";
  const sendEmail = send.channel === "EMAIL" || send.channel === "BOTH";

  if (sendSms && customer.phone?.trim()) {
    try {
      await sendShopSms(shopId, customer.phone.trim(), smsBody, { customerId: customer.id });
      anySent = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "SMS failed";
    }
  }

  if (sendEmail && customer.email?.trim()) {
    try {
      const subject = applyAutomationMergeFields(
        automation.emailSubject ?? `Message from ${vars.shop_name}`,
        vars,
      );
      const body = applyAutomationMergeFields(
        automation.emailBody ?? automation.smsMessage,
        vars,
      );
      const res = await sendShopEmail({
        shopId,
        to: customer.email.trim(),
        subject,
        body: `${body}\n\n---\nReply to this email or contact ${vars.shop_name} at ${vars.shop_phone} to update preferences.`,
      });
      if (res.mode === "live" || res.mode === "mock") anySent = true;
      else error = "Email not configured";
    } catch (e) {
      error = e instanceof Error ? e.message : "Email failed";
    }
  }

  await prisma.automationSend.update({
    where: { id: sendId },
    data: {
      status: anySent ? "DELIVERED" : error ? "FAILED" : "SKIPPED",
      sentAt: anySent ? new Date() : null,
      error: error ?? null,
    },
  });

  return anySent;
}

async function triggerAutomation(
  shopId: string,
  key: AutomationKey,
  customerId: string,
  baseDate: Date,
  opts: { repairOrderId?: string; appointmentId?: string },
) {
  const automation = await prisma.marketingAutomation.findUnique({
    where: { shopId_key: { shopId, key } },
  });
  if (!automation || !automation.configured) return;
  if (!automation.smsEnabled && !automation.emailEnabled) return;

  const loaded = await loadMergeContext(
    shopId,
    customerId,
    opts.repairOrderId,
    opts.appointmentId,
  );
  if (!loaded) return;
  const { customer } = loaded;

  if (!customer.marketingOptIn) return;
  if (!automation.includeBusinessCustomers && customer.company) return;
  if (await alreadySent(automation.id, customerId, automation.limitOnePerCustomer)) return;

  const channels = channelsForAutomation(automation);
  if (channels.length === 0) return;

  const channel = channels[0]!;

  if (automation.triggerTiming === "INSTANT") {
    const send = await prisma.automationSend.create({
      data: {
        automationId: automation.id,
        customerId,
        channel,
        status: "PENDING",
        scheduledFor: new Date(),
      },
    });
    await deliverAutomationSend(send.id);
    return;
  }

  const amount = automation.triggerAmount ?? 1;
  const unit = automation.triggerUnit ?? "DAYS";
  let scheduledFor: Date;

  if (automation.triggerTiming === "AFTER") {
    scheduledFor = addOffset(baseDate, amount, unit);
  } else {
    scheduledFor = subtractOffset(baseDate, amount, unit);
  }

  await scheduleSend(automation, customerId, channel, scheduledFor);
}

export async function processAutomationEvent(event: AutomationEvent): Promise<void> {
  switch (event.type) {
    case "RO_COMPLETED": {
      const base = new Date();
      for (const key of RO_COMPLETED_KEYS) {
        await triggerAutomation(event.shopId, key, event.customerId, base, {
          repairOrderId: event.repairOrderId,
        });
      }
      break;
    }
    case "INSPECTION_DECLINED": {
      await triggerAutomation(
        event.shopId,
        "DECLINED_SERVICE_REMINDER",
        event.customerId,
        new Date(),
        { repairOrderId: event.repairOrderId },
      );
      break;
    }
    case "APPOINTMENT_CREATED":
    case "APPOINTMENT_UPDATED": {
      const appt = await prisma.appointment.findFirst({
        where: { id: event.appointmentId, shopId: event.shopId },
        select: { startAt: true, status: true },
      });
      if (!appt || appt.status === "CANCELED" || appt.status === "NO_SHOW") return;

      for (const key of APPOINTMENT_INSTANT_KEYS) {
        await triggerAutomation(event.shopId, key, event.customerId, appt.startAt, {
          appointmentId: event.appointmentId,
        });
      }
      break;
    }
  }
}

/** Hourly: appointment BEFORE reminders + deliver due pending sends. */
export async function runScheduledAutomations(): Promise<{
  appointmentReminders: number;
  delivered: number;
}> {
  let appointmentReminders = 0;
  let delivered = 0;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60 * 60_000);

  const reminderAutomations = await prisma.marketingAutomation.findMany({
    where: {
      key: "APPOINTMENT_REMINDER",
      configured: true,
      triggerTiming: "BEFORE",
      OR: [{ smsEnabled: true }, { emailEnabled: true }],
    },
  });

  for (const automation of reminderAutomations) {
    const amount = automation.triggerAmount ?? 1;
    const unit = automation.triggerUnit ?? "DAYS";
    const targetStart = addOffset(now, amount, unit);
    const targetEnd = addOffset(windowEnd, amount, unit);

    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: automation.shopId,
        startAt: { gte: targetStart, lte: targetEnd },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        customerId: { not: null },
      },
      select: { id: true, customerId: true, startAt: true },
    });

    for (const appt of appointments) {
      if (!appt.customerId) continue;
      const sendAt = subtractOffset(appt.startAt, amount, unit);
      if (sendAt > now) continue;

      const channels = channelsForAutomation(automation);
      if (channels.length === 0) continue;

      const existing = await prisma.automationSend.findFirst({
        where: {
          automationId: automation.id,
          customerId: appt.customerId,
          scheduledFor: sendAt,
        },
        select: { id: true },
      });
      if (existing) continue;

      await scheduleSend(automation, appt.customerId, channels[0]!, sendAt);
      appointmentReminders += 1;
    }
  }

  const due = await prisma.automationSend.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    select: { id: true },
    take: 100,
    orderBy: { scheduledFor: "asc" },
  });

  for (const row of due) {
    const ok = await deliverAutomationSend(row.id);
    if (ok) delivered += 1;
  }

  return { appointmentReminders, delivered };
}

export { INSPECTION_DECLINED_KEYS, RO_COMPLETED_KEYS };
