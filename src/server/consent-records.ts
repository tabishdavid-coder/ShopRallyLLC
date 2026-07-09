import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { CONSENT_DISCLOSURE_VERSION } from "@/lib/data-compliance";
import { getCurrentUser } from "@/lib/platform";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type ConsentSource =
  | "customer_dialog"
  | "intake_form"
  | "import"
  | "staff"
  | "approve_page";

type RecordConsentInput = {
  shopId: string;
  customerId: string;
  channel: "sms" | "email";
  purpose: "transactional" | "marketing";
  granted: boolean;
  source: ConsentSource;
  previousGranted?: boolean;
};

/** Append a consent evidence row when a customer's opt-in state changes. */
export async function recordConsentSnapshot(input: RecordConsentInput) {
  if (input.previousGranted === input.granted) return;

  let collectedByUserId: string | null = null;
  try {
    collectedByUserId = (await getCurrentUser()).id;
  } catch {
    /* public / system paths */
  }

  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")?.trim() ?? null;
    userAgent = h.get("user-agent")?.slice(0, 500) ?? null;
  } catch {
    /* ok outside request */
  }

  await prisma.consentRecord.create({
    data: {
      shopId: input.shopId,
      customerId: input.customerId,
      channel: input.channel,
      purpose: input.purpose,
      granted: input.granted,
      disclosureVersion: CONSENT_DISCLOSURE_VERSION,
      source: input.source,
      collectedByUserId,
      ipAddress,
      userAgent,
      revokedAt: input.granted ? null : new Date(),
    },
  });

  await recordShopAuditEventSafe({
    shopId: input.shopId,
    eventType: input.granted
      ? ShopAuditEventType.CONSENT_GRANTED
      : ShopAuditEventType.CONSENT_REVOKED,
    summary: `${input.purpose} ${input.channel} consent ${input.granted ? "granted" : "revoked"}`,
    metadata: {
      customerId: input.customerId,
      channel: input.channel,
      purpose: input.purpose,
      source: input.source,
    },
  });
}

type CustomerConsentState = {
  transactionalSmsConsent: boolean;
  marketingOptIn: boolean;
  marketingEmailConsent: boolean;
};

/** Write ConsentRecord rows for each changed consent flag on a customer. */
export async function syncCustomerConsentRecords(
  shopId: string,
  customerId: string,
  before: CustomerConsentState,
  after: CustomerConsentState,
  source: ConsentSource,
) {
  await Promise.all([
    recordConsentSnapshot({
      shopId,
      customerId,
      channel: "sms",
      purpose: "transactional",
      granted: after.transactionalSmsConsent,
      previousGranted: before.transactionalSmsConsent,
      source,
    }),
    recordConsentSnapshot({
      shopId,
      customerId,
      channel: "sms",
      purpose: "marketing",
      granted: after.marketingOptIn,
      previousGranted: before.marketingOptIn,
      source,
    }),
    recordConsentSnapshot({
      shopId,
      customerId,
      channel: "email",
      purpose: "marketing",
      granted: after.marketingEmailConsent,
      previousGranted: before.marketingEmailConsent,
      source,
    }),
  ]);
}

/** Initial consent rows when creating a customer with any opt-in checked. */
export async function recordInitialCustomerConsents(
  shopId: string,
  customerId: string,
  state: CustomerConsentState,
  source: ConsentSource,
) {
  const empty = {
    transactionalSmsConsent: false,
    marketingOptIn: false,
    marketingEmailConsent: false,
  };
  await syncCustomerConsentRecords(shopId, customerId, empty, state, source);
}
