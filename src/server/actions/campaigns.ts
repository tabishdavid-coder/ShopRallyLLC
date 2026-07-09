"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import {
  getCampaignTemplate,
  type AudienceFilter,
} from "@/lib/campaigns";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import {
  getCampaignContext,
  previewAudienceCount,
} from "@/server/campaigns";
import { requireSmsAddendum, requireShopLegalCompliance } from "@/server/compliance-gates";
import { getShopEmailConfig, isShopEmailReady } from "@/server/services/shop-email";
import {
  enqueueCampaignLaunch,
  prepareCampaignLaunch,
  sendToCampaignCustomer,
} from "@/server/services/campaign-send";
import type { CampaignStatus, CampaignType } from "@/generated/prisma";
import { gates } from "@/server/permission-gates";
import { suggestCampaignMessage } from "@/server/services/ai/campaign-draft";
import { isAiConfigured } from "@/server/services/ai/client";

const AudienceFilterSchema = z.object({
  tags: z.array(z.string()).optional(),
  lastVisitDaysMin: z.number().int().min(0).optional(),
  lastVisitDaysMax: z.number().int().min(0).optional(),
  marketingOptInOnly: z.boolean().optional(),
  customerType: z.enum(["all", "person", "business"]).optional(),
  zipCodes: z.array(z.string()).optional(),
  requirePhone: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  hasDeclinedInspection: z.boolean().optional(),
  offerText: z.string().trim().max(200).optional(),
});

const CreateCampaignInput = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum([
    "REVIEW_REQUEST",
    "APPOINTMENT_REMINDER",
    "DECLINED_SERVICE",
    "PROMO_BLAST",
    "WIN_BACK",
    "OIL_CHANGE_REMINDER",
    "CUSTOM",
  ]),
  channel: z.enum(["SMS", "EMAIL", "BOTH"]),
  audienceFilter: AudienceFilterSchema,
  messageTemplate: z.string().trim().min(1).max(1600),
  emailSubject: z.string().trim().max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireCampaignsAccess(shopId: string): Promise<{ ok: false; error: string } | null> {
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;
  const allowed = await canUseFeature(shopId, "marketing_campaigns");
  if (!allowed) {
    return {
      ok: false,
      error: `Marketing campaigns require ${PLANS.PROFESSIONAL.name} plan or higher. Upgrade in Settings → Subscription.`,
    };
  }
  return null;
}

export async function previewAudienceCountAction(
  filter: AudienceFilter,
): Promise<ActionResult<{ count: number }>> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const count = await previewAudienceCount(shopId, filter);
  return { ok: true, data: { count } };
}

/** Count lapsed customers for each win-back preset segment. */
export async function previewWinbackSegmentCounts(): Promise<
  ActionResult<{ preset: string; days: number; count: number }[]>
> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const { WINBACK_PRESETS, audienceForWinbackPreset } = await import("@/lib/campaigns");
  const counts = await Promise.all(
    WINBACK_PRESETS.map(async (preset) => ({
      preset: preset.id,
      days: preset.days,
      count: await previewAudienceCount(shopId, audienceForWinbackPreset(preset.id)),
    })),
  );
  return { ok: true, data: counts };
}

export async function createCampaign(
  raw: z.infer<typeof CreateCampaignInput>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateCampaignInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };

  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const data = parsed.data;
  const status: CampaignStatus = data.scheduledAt ? "SCHEDULED" : "DRAFT";

  const campaign = await prisma.marketingCampaign.create({
    data: {
      shopId,
      name: data.name,
      type: data.type,
      channel: data.channel,
      audienceFilter: data.audienceFilter,
      messageTemplate: data.messageTemplate,
      emailSubject: data.emailSubject ?? null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status,
    },
    select: { id: true },
  });

  revalidatePath("/marketing/campaigns");
  return { ok: true, data: { id: campaign.id } };
}

const DraftCampaignMessageInput = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum([
    "REVIEW_REQUEST",
    "APPOINTMENT_REMINDER",
    "DECLINED_SERVICE",
    "PROMO_BLAST",
    "WIN_BACK",
    "OIL_CHANGE_REMINDER",
    "CUSTOM",
  ]),
  channel: z.enum(["SMS", "EMAIL", "BOTH"]),
  currentMessage: z.string().trim().max(1600).optional(),
  currentEmailSubject: z.string().trim().max(200).optional(),
});

/** Generate AI campaign copy — Overdrive only; human must review before sending. */
export async function draftCampaignMessage(
  raw: z.infer<typeof DraftCampaignMessageInput>,
): Promise<ActionResult<{ message: string; emailSubject?: string }>> {
  const parsed = DraftCampaignMessageInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid campaign details for drafting." };
  }

  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  if (!(await canUseFeature(shopId, "ai_campaign_drafting"))) {
    return {
      ok: false,
      error: `AI campaign drafting is included on the ${PLANS.ENTERPRISE.name} plan. Upgrade in Billing to unlock.`,
    };
  }

  if (!isAiConfigured()) {
    return {
      ok: false,
      error: "AI drafting is not configured on this platform yet. Edit the template manually.",
    };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, city: true, state: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  try {
    const draft = await suggestCampaignMessage(shopId, {
      shopName: shop.name,
      city: shop.city,
      state: shop.state,
      campaignName: parsed.data.name,
      campaignType: parsed.data.type,
      channel: parsed.data.channel,
      currentMessage: parsed.data.currentMessage,
      currentEmailSubject: parsed.data.currentEmailSubject,
    });
    return { ok: true, data: draft };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a draft.";
    return { ok: false, error: message };
  }
}

const UpdateCampaignInput = CreateCampaignInput.extend({
  id: z.string().min(1),
});

export async function updateCampaign(
  raw: z.infer<typeof UpdateCampaignInput>,
): Promise<ActionResult> {
  const parsed = UpdateCampaignInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };

  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const data = parsed.data;
  const existing = await prisma.marketingCampaign.findFirst({
    where: { id: data.id, shopId },
    select: { status: true },
  });
  if (!existing) return { ok: false, error: "Campaign not found." };
  if (existing.status === "COMPLETED") {
    return { ok: false, error: "Completed campaigns cannot be edited." };
  }

  await prisma.marketingCampaign.update({
    where: { id: data.id },
    data: {
      name: data.name,
      type: data.type,
      channel: data.channel,
      audienceFilter: data.audienceFilter,
      messageTemplate: data.messageTemplate,
      emailSubject: data.emailSubject ?? null,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "SCHEDULED" : existing.status === "SCHEDULED" ? "DRAFT" : existing.status,
    },
  });

  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${data.id}`);
  return { ok: true };
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const existing = await prisma.marketingCampaign.findFirst({
    where: { id, shopId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Campaign not found." };

  await prisma.marketingCampaign.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
  });

  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${id}`);
  return { ok: true };
}

export async function duplicateCampaign(id: string): Promise<ActionResult<{ id: string }>> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const source = await prisma.marketingCampaign.findFirst({ where: { id, shopId } });
  if (!source) return { ok: false, error: "Campaign not found." };

  const copy = await prisma.marketingCampaign.create({
    data: {
      shopId,
      name: `${source.name} (copy)`,
      type: source.type,
      channel: source.channel,
      audienceFilter: source.audienceFilter ?? {},
      messageTemplate: source.messageTemplate,
      emailSubject: source.emailSubject,
      status: "DRAFT",
    },
    select: { id: true },
  });

  revalidatePath("/marketing/campaigns");
  return { ok: true, data: { id: copy.id } };
}

/** Enqueue async batched send via Inngest (returns immediately). */
export async function launchCampaign(
  id: string,
): Promise<ActionResult<{ queued: boolean; customerCount: number }>> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const legal = await requireShopLegalCompliance(shopId);
  if (legal) return legal;

  const prep = await prepareCampaignLaunch(id, shopId);
  if (!prep.ok) return prep;

  const campaign = await prisma.marketingCampaign.findFirst({
    where: { id, shopId },
    select: { channel: true },
  });
  if (
    campaign &&
    (campaign.channel === "SMS" || campaign.channel === "BOTH")
  ) {
    const addendum = await requireSmsAddendum(shopId);
    if (addendum) return addendum;
  }

  await enqueueCampaignLaunch(id, shopId);

  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${id}`);
  return { ok: true, data: { queued: true, customerCount: prep.customerCount } };
}

export async function sendTestCampaign(
  messageTemplate: string,
  channel: import("@/generated/prisma").CampaignChannel,
  emailSubject?: string,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const gate = await requireCampaignsAccess(shopId);
  if (gate) return gate;

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      name: true,
      phone: true,
      email: true,
    },
  });

  const ctx = await getCampaignContext(shopId);
  const recordCustomer = await prisma.customer.findFirst({
    where: { shopId },
    select: { id: true },
  });

  const testCustomer = {
    id: recordCustomer?.id ?? shopId,
    firstName: "Test",
    lastName: "Customer",
    company: null as string | null,
    phone: shop.phone,
    email: shop.email,
    marketingOptIn: true,
    transactionalSmsConsent: true,
    marketingEmailConsent: true,
    deletedAt: null,
    anonymizedAt: null,
  };

  if (channel === "EMAIL" || channel === "BOTH") {
    const emailConfig = await getShopEmailConfig(shopId);
    if (!isShopEmailReady(emailConfig)) {
      return {
        ok: false,
        error: "Configure and enable shop email at Settings → Email before sending.",
      };
    }
    if (!shop.email && !emailConfig.emailFromAddress) {
      return { ok: false, error: "Set a test recipient email or shop contact email." };
    }
  }

  if (channel === "SMS" || channel === "BOTH") {
    if (!shop.phone) {
      return { ok: false, error: "Set a shop phone in Settings to send a test SMS." };
    }
  }

  const outcome = await sendToCampaignCustomer(
    shopId,
    {
      channel,
      messageTemplate,
      emailSubject: emailSubject ?? null,
      audienceFilter: {},
    },
    testCustomer,
    ctx,
    { lastService: "Oil Change" },
  );

  if (outcome.sms === "failed" || outcome.email === "failed") {
    return { ok: false, error: outcome.error ?? "Test send failed." };
  }

  return { ok: true };
}

export async function createCampaignFromTemplate(
  type: CampaignType,
): Promise<ActionResult<{ id: string }>> {
  const template = getCampaignTemplate(type);
  if (!template) return { ok: false, error: "Unknown template." };

  return createCampaign({
    name: template.name,
    type: template.type,
    channel: template.channel,
    audienceFilter: template.defaultAudience,
    messageTemplate: template.defaultMessage,
    emailSubject: template.defaultEmailSubject,
  });
}
