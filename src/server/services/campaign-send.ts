import "server-only";

import { prisma } from "@/db/client";
import { applyMergeFields, expandWinbackTemplate, parseAudienceFilter } from "@/lib/campaigns";
import { customerDisplayName } from "@/lib/format";
import {
  canSendMarketingEmail,
  canSendMarketingSms,
} from "@/lib/data-compliance";
import { inngest } from "@/inngest/client";
import {
  getCampaignContext,
  resolveAudienceCustomers,
  resolveLastServiceByCustomer,
} from "@/server/campaigns";
import { sendShopEmail } from "@/server/services/shop-email";
import { sendShopSms } from "@/server/services/messaging";
import { ShopAuditEventType, type CampaignChannel, type CampaignSendStatus } from "@/generated/prisma";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export const CAMPAIGN_BATCH_SIZE = 50;
export const CAMPAIGN_AUDIENCE_CAP = 2000;

export const CAMPAIGN_LAUNCH_EVENT = "marketing/campaign.launch";

const EMAIL_UNSUBSCRIBE_FOOTER =
  "\n\n---\nYou received this message from {shop_name}. Reply STOP to opt out of texts, or contact us at {shop_phone} to update your email preferences.";

type CampaignCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  marketingOptIn: boolean;
  transactionalSmsConsent: boolean;
  marketingEmailConsent: boolean;
  deletedAt: Date | null;
  anonymizedAt: Date | null;
};

type CampaignRow = {
  id: string;
  shopId: string;
  channel: CampaignChannel;
  messageTemplate: string;
  emailSubject: string | null;
  audienceFilter: unknown;
  status: string;
};

function mergeVarsForCustomer(
  customer: { firstName: string; lastName: string; company?: string | null },
  ctx: {
    shopName: string;
    shopPhone: string;
    bookingLink: string;
    reviewLink: string;
  },
) {
  return {
    customer_name: customerDisplayName(customer),
    shop_name: ctx.shopName,
    booking_link: ctx.bookingLink,
    review_link: ctx.reviewLink,
    shop_phone: ctx.shopPhone || "our shop",
  };
}

function appendEmailFooter(body: string, vars: Record<string, string>): string {
  const footer = applyMergeFields(EMAIL_UNSUBSCRIBE_FOOTER, vars);
  if (body.includes("update your email preferences")) return body;
  return `${body}${footer}`;
}

export async function sendToCampaignCustomer(
  shopId: string,
  campaign: Pick<CampaignRow, "channel" | "messageTemplate" | "emailSubject" | "audienceFilter">,
  customer: CampaignCustomer,
  ctx: {
    shopName: string;
    shopPhone: string;
    bookingLink: string;
    reviewLink: string;
  },
  opts?: { lastService?: string },
): Promise<{
  sms?: "sent" | "failed" | "skipped";
  email?: "sent" | "failed" | "skipped";
  error?: string;
}> {
  const filter = parseAudienceFilter(campaign.audienceFilter);
  const vars = mergeVarsForCustomer(customer, ctx);
  const expanded = expandWinbackTemplate(campaign.messageTemplate, {
    offerText: filter.offerText,
    lastService: opts?.lastService,
  });
  const body = applyMergeFields(expanded, vars);
  const result: {
    sms?: "sent" | "failed" | "skipped";
    email?: "sent" | "failed" | "skipped";
    error?: string;
  } = {};

  const sendSms = campaign.channel === "SMS" || campaign.channel === "BOTH";
  const sendEmail = campaign.channel === "EMAIL" || campaign.channel === "BOTH";

  if (sendSms) {
    if (!customer.phone?.trim()) {
      result.sms = "skipped";
      result.error = "No phone";
    } else if (!canSendMarketingSms(customer)) {
      result.sms = "skipped";
      result.error = "No marketing SMS consent";
    } else {
      try {
        await sendShopSms(shopId, customer.phone.trim(), body, {
          customerId: customer.id,
          skipAudit: true,
        });
        result.sms = "sent";
      } catch (e) {
        result.sms = "failed";
        result.error = e instanceof Error ? e.message : "SMS failed";
      }
    }
  }

  if (sendEmail) {
    if (!customer.email?.trim()) {
      result.email = "skipped";
    } else if (!canSendMarketingEmail(customer)) {
      result.email = "skipped";
      result.error = "No marketing email consent";
    } else {
      try {
        const subject = applyMergeFields(
          campaign.emailSubject ?? `Message from ${ctx.shopName}`,
          vars,
        );
        const emailBody = appendEmailFooter(body, vars);
        const res = await sendShopEmail({
          shopId,
          to: customer.email.trim(),
          subject,
          body: emailBody,
        });
        if (res.mode === "live" || res.mode === "mock") {
          result.email = "sent";
        } else {
          result.email = "failed";
          result.error = "Shop email is not configured for live sends.";
        }
      } catch (e) {
        result.email = "failed";
        result.error = e instanceof Error ? e.message : "Email failed";
      }
    }
  }

  return result;
}

function outcomeToStatus(outcome: Awaited<ReturnType<typeof sendToCampaignCustomer>>): {
  status: CampaignSendStatus;
  sent: boolean;
  delivered: boolean;
  failed: boolean;
} {
  const anySent = outcome.sms === "sent" || outcome.email === "sent";
  const anyFailed = outcome.sms === "failed" || outcome.email === "failed";
  const allSkipped =
    (outcome.sms === "skipped" || !outcome.sms) &&
    (outcome.email === "skipped" || !outcome.email) &&
    !anySent;

  if (anyFailed && !anySent) return { status: "FAILED", sent: false, delivered: false, failed: true };
  if (anySent) return { status: "DELIVERED", sent: true, delivered: true, failed: false };
  if (allSkipped) return { status: "SKIPPED", sent: false, delivered: false, failed: false };
  return { status: "SKIPPED", sent: false, delivered: false, failed: false };
}

/** Validate campaign and mark ACTIVE before batched send. */
export async function prepareCampaignLaunch(
  campaignId: string,
  shopId: string,
): Promise<{ ok: true; customerCount: number } | { ok: false; error: string }> {
  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, shopId },
  });
  if (!campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.status === "COMPLETED") {
    return { ok: false, error: "Campaign already completed." };
  }
  if (campaign.status === "ACTIVE") {
    return { ok: false, error: "Campaign is already running." };
  }

  if (campaign.type === "REVIEW_REQUEST") {
    const ctx = await getCampaignContext(shopId);
    if (!ctx.googleReviewsConnected) {
      return {
        ok: false,
        error: "Connect Google Reviews first at Marketing → Reviews.",
      };
    }
  }

  const filter = parseAudienceFilter(campaign.audienceFilter);
  const customers = await resolveAudienceCustomers(shopId, filter, CAMPAIGN_AUDIENCE_CAP);
  if (customers.length === 0) {
    return { ok: false, error: "No customers match this audience." };
  }

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "ACTIVE", launchedAt: new Date() },
  });

  const campaignRow = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, shopId },
    select: { name: true, channel: true },
  });
  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.CAMPAIGN_LAUNCHED,
    summary: `Campaign launched${campaignRow?.name ? `: ${campaignRow.name}` : ""}`,
    metadata: {
      campaignId,
      channel: campaignRow?.channel,
      audienceSize: customers.length,
    },
  });

  return { ok: true, customerCount: customers.length };
}

/** Process one batch of campaign sends (shared by action + Inngest). */
export async function sendCampaignBatch(
  campaignId: string,
  shopId: string,
  offset = 0,
  batchSize = CAMPAIGN_BATCH_SIZE,
): Promise<{ processed: number; sent: number; failed: number; hasMore: boolean }> {
  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id: campaignId, shopId },
  });
  if (!campaign || campaign.status !== "ACTIVE") {
    return { processed: 0, sent: 0, failed: 0, hasMore: false };
  }

  const filter = parseAudienceFilter(campaign.audienceFilter);
  const customers = await resolveAudienceCustomers(shopId, filter, CAMPAIGN_AUDIENCE_CAP);
  const batch = customers.slice(offset, offset + batchSize);
  if (batch.length === 0) {
    await finalizeCampaign(campaignId);
    return { processed: 0, sent: 0, failed: 0, hasMore: false };
  }

  const ctx = await getCampaignContext(shopId);
  const lastServices = await resolveLastServiceByCustomer(
    shopId,
    batch.map((c) => c.id),
  );
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const customer of batch) {
    const existing = await prisma.campaignSend.findFirst({
      where: { campaignId, customerId: customer.id },
      select: { id: true },
    });
    if (existing) continue;

    const outcome = await sendToCampaignCustomer(
      shopId,
      {
        channel: campaign.channel,
        messageTemplate: campaign.messageTemplate,
        emailSubject: campaign.emailSubject,
        audienceFilter: campaign.audienceFilter,
      },
      customer,
      ctx,
      { lastService: lastServices.get(customer.id) },
    );

    const mapped = outcomeToStatus(outcome);
    if (mapped.sent) sent += 1;
    if (mapped.failed) failed += 1;

    await prisma.campaignSend.create({
      data: {
        campaignId,
        customerId: customer.id,
        channel: campaign.channel,
        status: mapped.status,
        sentAt: mapped.sent ? now : null,
        openedAt: mapped.delivered ? now : null,
        error: outcome.error ?? null,
      },
    });
  }

  if (sent > 0 || failed > 0) {
    await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: sent },
        deliveredCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });
  }

  const hasMore = offset + batchSize < customers.length;
  if (!hasMore) {
    await finalizeCampaign(campaignId);
  }

  return { processed: batch.length, sent, failed, hasMore };
}

async function finalizeCampaign(campaignId: string) {
  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function enqueueCampaignLaunch(campaignId: string, shopId: string) {
  await inngest.send({
    name: CAMPAIGN_LAUNCH_EVENT,
    data: { campaignId, shopId, offset: 0 },
  });
}

/** Find scheduled campaigns due for dispatch. */
export async function dispatchDueScheduledCampaigns(): Promise<{ dispatched: number }> {
  const due = await prisma.marketingCampaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true, shopId: true },
    take: 20,
  });

  let dispatched = 0;
  for (const row of due) {
    const prep = await prepareCampaignLaunch(row.id, row.shopId);
    if (!prep.ok) {
      await prisma.marketingCampaign.update({
        where: { id: row.id },
        data: { status: "DRAFT" },
      });
      continue;
    }
    await enqueueCampaignLaunch(row.id, row.shopId);
    dispatched += 1;
  }

  return { dispatched };
}
