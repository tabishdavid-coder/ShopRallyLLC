import "server-only";

import type { AutomationKey, Prisma } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { AUTOMATION_TEMPLATES, getAutomationTemplate } from "@/lib/automations";

export type AutomationListItem = {
  id: string;
  key: AutomationKey;
  name: string;
  description: string;
  triggerTiming: string;
  triggerAmount: number | null;
  triggerUnit: string | null;
  triggerLabel: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  configured: boolean;
  sentCount30d: number;
  scheduledCount30d: number;
  icon: string;
};

export type AutomationDetail = AutomationListItem & {
  smsMessage: string;
  emailSubject: string | null;
  emailBody: string | null;
  includeBusinessCustomers: boolean;
  limitOnePerCustomer: boolean;
  includeBookingLinkCta: boolean;
};

const THIRTY_DAYS_MS = 30 * 86_400_000;

async function countSends(automationId: string, kind: "sent" | "scheduled"): Promise<number> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
  const thirtyDaysAhead = new Date(now.getTime() + THIRTY_DAYS_MS);

  if (kind === "sent") {
    return prisma.automationSend.count({
      where: {
        automationId,
        status: { in: ["SENT", "DELIVERED"] },
        sentAt: { gte: thirtyDaysAgo },
      },
    });
  }

  return prisma.automationSend.count({
    where: {
      automationId,
      status: "PENDING",
      scheduledFor: { gte: now, lte: thirtyDaysAhead },
    },
  });
}

/** Ensure all default shop automations exist for the shop. */
export async function ensureAutomationDefaults(shopId: string): Promise<void> {
  const existing = await prisma.marketingAutomation.findMany({
    where: { shopId },
    select: { key: true },
  });
  const have = new Set(existing.map((e) => e.key));

  const toCreate: Prisma.MarketingAutomationCreateManyInput[] = [];
  for (const tpl of AUTOMATION_TEMPLATES) {
    if (have.has(tpl.key)) continue;
    toCreate.push({
      shopId,
      key: tpl.key,
      name: tpl.name,
      triggerTiming: tpl.triggerTiming,
      triggerAmount: tpl.triggerAmount ?? null,
      triggerUnit: tpl.triggerUnit ?? null,
      smsMessage: tpl.defaultSmsMessage,
      emailSubject: tpl.defaultEmailSubject ?? null,
      emailBody: tpl.defaultEmailBody ?? null,
      emailEnabled: tpl.defaultEmailEnabled ?? false,
      smsEnabled: tpl.defaultSmsEnabled ?? false,
      includeBusinessCustomers: tpl.includeBusinessCustomers ?? true,
      limitOnePerCustomer: tpl.limitOnePerCustomer ?? false,
      includeBookingLinkCta: tpl.includeBookingLinkCta ?? true,
      configured: tpl.defaultConfigured ?? false,
    });
  }

  if (toCreate.length > 0) {
    try {
      await prisma.marketingAutomation.createMany({ data: toCreate, skipDuplicates: true });
    } catch (e) {
      // Concurrent requests can race on the (shopId, key) unique index.
      const code = (e as { code?: string })?.code;
      if (code !== "P2002") throw e;
    }
  }
}

export async function listAutomations(shopId: string): Promise<AutomationListItem[]> {
  await ensureAutomationDefaults(shopId);

  const rows = await prisma.marketingAutomation.findMany({
    where: { shopId },
    orderBy: { key: "asc" },
  });

  const items: AutomationListItem[] = [];
  for (const row of rows) {
    const tpl = getAutomationTemplate(row.key);
    const [sentCount30d, scheduledCount30d] = await Promise.all([
      countSends(row.id, "sent"),
      countSends(row.id, "scheduled"),
    ]);

    items.push({
      id: row.id,
      key: row.key,
      name: row.name,
      description: tpl?.description ?? "",
      triggerTiming: row.triggerTiming,
      triggerAmount: row.triggerAmount,
      triggerUnit: row.triggerUnit,
      triggerLabel: tpl?.triggerLabel ?? "",
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      configured: row.configured,
      sentCount30d,
      scheduledCount30d,
      icon: tpl?.icon ?? "calendar",
    });
  }

  return items;
}

export async function getAutomation(
  shopId: string,
  id: string,
): Promise<AutomationDetail | null> {
  await ensureAutomationDefaults(shopId);

  const row = await prisma.marketingAutomation.findFirst({
    where: { id, shopId },
  });
  if (!row) return null;

  const tpl = getAutomationTemplate(row.key);
  const [sentCount30d, scheduledCount30d] = await Promise.all([
    countSends(row.id, "sent"),
    countSends(row.id, "scheduled"),
  ]);

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: tpl?.description ?? "",
    triggerTiming: row.triggerTiming,
    triggerAmount: row.triggerAmount,
    triggerUnit: row.triggerUnit,
    triggerLabel: tpl?.triggerLabel ?? "",
    emailEnabled: row.emailEnabled,
    smsEnabled: row.smsEnabled,
    configured: row.configured,
    sentCount30d,
    scheduledCount30d,
    icon: tpl?.icon ?? "calendar",
    smsMessage: row.smsMessage,
    emailSubject: row.emailSubject,
    emailBody: row.emailBody,
    includeBusinessCustomers: row.includeBusinessCustomers,
    limitOnePerCustomer: row.limitOnePerCustomer,
    includeBookingLinkCta: row.includeBookingLinkCta,
  };
}

export async function getAutomationByKey(shopId: string, key: AutomationKey) {
  await ensureAutomationDefaults(shopId);
  return prisma.marketingAutomation.findUnique({
    where: { shopId_key: { shopId, key } },
  });
}

export type ScheduledMessageRow = {
  id: string;
  automationName: string;
  customerName: string;
  channel: string;
  scheduledFor: Date;
  status: string;
};

export async function listScheduledMessages(shopId: string): Promise<ScheduledMessageRow[]> {
  await ensureAutomationDefaults(shopId);

  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + THIRTY_DAYS_MS);

  const rows = await prisma.automationSend.findMany({
    where: {
      automation: { shopId },
      status: "PENDING",
      scheduledFor: { gte: now, lte: thirtyDaysAhead },
    },
    orderBy: { scheduledFor: "asc" },
    take: 100,
    include: {
      automation: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true, company: true } },
    },
  });

  const { customerDisplayName } = await import("@/lib/format");

  return rows.map((r) => ({
    id: r.id,
    automationName: r.automation.name,
    customerName: customerDisplayName(r.customer),
    channel: r.channel,
    scheduledFor: r.scheduledFor!,
    status: r.status,
  }));
}

export type AutomationSendHistoryRow = {
  id: string;
  automationName: string;
  customerName: string;
  channel: string;
  status: string;
  sentAt: Date | null;
  scheduledFor: Date | null;
  error: string | null;
};

export async function listAutomationSendHistory(
  shopId: string,
  limit = 50,
): Promise<AutomationSendHistoryRow[]> {
  await ensureAutomationDefaults(shopId);

  const rows = await prisma.automationSend.findMany({
    where: { automation: { shopId } },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      automation: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true, company: true } },
    },
  });

  const { customerDisplayName } = await import("@/lib/format");

  return rows.map((r) => ({
    id: r.id,
    automationName: r.automation.name,
    customerName: customerDisplayName(r.customer),
    channel: r.channel,
    status: r.status,
    sentAt: r.sentAt,
    scheduledFor: r.scheduledFor,
    error: r.error,
  }));
}

export async function isAutomationNameUnique(
  shopId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const existing = await prisma.marketingAutomation.findFirst({
    where: {
      shopId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !existing;
}
