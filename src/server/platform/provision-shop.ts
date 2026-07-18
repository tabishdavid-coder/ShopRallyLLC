import "server-only";

import { prisma } from "@/db/client";
import type { PlatformShopFormValues } from "@/lib/platform-shop-form";
import { laborRateCentsFromDollars, slugifyShopName } from "@/lib/platform-shop-form";
import { defaultSignupSubscription, TRIAL_DAYS } from "@/lib/subscription";
import { assignUniqueMasterId } from "@/server/shop-master-id";
import {
  BillingStatus,
  PlatformAuditEventType,
  ShopProvisionMethod,
  ShopStatus,
  type ShopPlan,
} from "@/generated/prisma";

export type ProvisionShopInput = PlatformShopFormValues & {
  status: ShopStatus;
  intakeTokenId?: string;
  provisionMethod?: ShopProvisionMethod;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  msaAcknowledged?: boolean;
};

export type ProvisionShopResult = {
  shopId: string;
  masterId: string;
  name: string;
};

async function assertUniqueShopFields(input: {
  code: string;
  bookingSlug: string;
}) {
  const code = input.code.toUpperCase();
  const existingCode = await prisma.shop.findFirst({
    where: { code },
    select: { id: true, name: true },
  });
  if (existingCode) {
    throw new Error(`Shop code "${code}" is already used by ${existingCode.name}.`);
  }

  const slug = input.bookingSlug || slugifyShopName("");
  const existingSlug = await prisma.shop.findFirst({
    where: { bookingSlug: slug },
    select: { id: true, name: true },
  });
  if (existingSlug) {
    throw new Error(`Booking slug "${slug}" is already taken. Choose a different slug.`);
  }
}

function resolveTrialEndsAt(
  billingStatus: BillingStatus,
  status: ShopStatus,
  trialEndsAtRaw: string | null | undefined,
): Date | null {
  if (trialEndsAtRaw) {
    const d = new Date(trialEndsAtRaw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (billingStatus === BillingStatus.TRIAL || status === ShopStatus.TRIAL) {
    const d = new Date();
    d.setDate(d.getDate() + TRIAL_DAYS);
    return d;
  }
  return null;
}

/** Create a shop tenant with master ID and default matrices. Used by platform add + intake. */
export async function provisionPlatformShop(
  platformId: string,
  input: ProvisionShopInput,
): Promise<ProvisionShopResult> {
  const bookingSlug = input.bookingSlug?.trim() || slugifyShopName(input.name);
  if (!bookingSlug) throw new Error("Could not derive a booking slug from the shop name.");

  await assertUniqueShopFields({ code: input.code, bookingSlug });

  const signupDefaults = defaultSignupSubscription();
  const billingStatus = input.billingStatus ?? signupDefaults.billingStatus;
  const plan: ShopPlan = input.plan ?? signupDefaults.plan;
  const trialEndsAt = resolveTrialEndsAt(billingStatus, input.status, input.trialEndsAt);

  const { masterId, masterIdCreatedAt } = await assignUniqueMasterId(input.code);
  const laborRateCents = laborRateCentsFromDollars(input.laborRateDollars);
  const shopEmail = input.shopEmail.trim();
  const contactEmail = input.email.trim();

  const msaAcknowledgedAt = input.msaAcknowledged ? new Date() : null;
  const auditEventType =
    input.provisionMethod === ShopProvisionMethod.INTAKE_FORM
      ? PlatformAuditEventType.SHOP_INTAKE_SUBMITTED
      : PlatformAuditEventType.SHOP_CREATED;

  const shop = await prisma.$transaction(async (tx) => {
    const created = await tx.shop.create({
      data: {
        platformId,
        name: input.name.trim(),
        code: input.code.toUpperCase(),
        bookingSlug,
        masterId,
        masterIdCreatedAt,
        provisionMethod: input.provisionMethod ?? null,
        createdByUserId: input.createdByUserId ?? null,
        msaAcknowledgedAt,
        legalEntityName: input.legalEntityName?.trim() || null,
        status: input.status,
        plan,
        billingStatus,
        trialEndsAt,
        primaryContactName: input.primaryContactName.trim(),
        phone: input.phone.trim(),
        email: contactEmail,
        // Shop-owned email defaults — identity prefilled; shop must Enable (or pass test) to go live.
        emailFromName: input.name.trim(),
        emailFromAddress: shopEmail || null,
        emailReplyTo: shopEmail || contactEmail || null,
        emailEnabled: false,
        authorizationNotifyEmail: contactEmail,
        landlineNumber: input.phone.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim().toUpperCase(),
        zip: input.zip.trim(),
        timezone: input.timezone.trim(),
        laborRateCents,
        lastActiveAt: input.status === ShopStatus.PENDING ? null : new Date(),
        partMatrix: {
          create: [
            { minCents: 0, maxCents: 499, multiplier: 4, sortOrder: 0 },
            { minCents: 500, maxCents: 999, multiplier: 3, sortOrder: 1 },
            { minCents: 1000, maxCents: null, multiplier: 2.5, sortOrder: 2 },
          ],
        },
        laborMatrix: {
          create: [
            { minHours: 0, maxHours: 1, multiplier: 1, sortOrder: 0 },
            { minHours: 1, maxHours: 3, multiplier: 1, sortOrder: 1 },
            { minHours: 3, maxHours: null, multiplier: 0.9, sortOrder: 2 },
          ],
        },
      },
      select: { id: true, name: true },
    });

    if (input.intakeTokenId) {
      await tx.shopIntakeToken.update({
        where: { id: input.intakeTokenId },
        data: { shopId: created.id, usedAt: new Date() },
      });
    }

    await tx.platformAuditEvent.create({
      data: {
        platformId,
        shopId: created.id,
        eventType: auditEventType,
        actorUserId: input.createdByUserId ?? null,
        actorEmail: input.createdByEmail ?? null,
        method: input.provisionMethod ?? null,
        metadata: {
          shopName: created.name,
          shopCode: input.code.toUpperCase(),
          masterId,
          status: input.status,
          msaAcknowledged: Boolean(msaAcknowledgedAt),
        },
      },
    });

    return created;
  });

  return { shopId: shop.id, masterId, name: shop.name };
}
