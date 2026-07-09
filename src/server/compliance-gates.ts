import "server-only";

import { AgreementType } from "@/generated/prisma";
import { prisma } from "@/db/client";
import {
  canSendMarketingEmail,
  canSendMarketingSms,
  canSendTransactionalSms,
  type ConsentCustomer,
} from "@/lib/data-compliance";
import { checkShopLegalCompliance, shopHasCurrentAgreement } from "@/server/legal";

export type ComplianceGateResult = { ok: false; error: string } | null;

/** Block regulated actions when required shop agreements are missing or outdated. */
export async function requireShopLegalCompliance(
  shopId: string,
): Promise<ComplianceGateResult> {
  const compliance = await checkShopLegalCompliance(shopId);
  if (compliance.compliant) return null;
  return {
    ok: false,
    error:
      "Complete required legal agreements under Settings → Legal (or onboarding) before continuing.",
  };
}

/** Block live SMS when shop has SMS enabled but no current SMS addendum. */
export async function requireSmsAddendum(shopId: string): Promise<ComplianceGateResult> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { smsEnabled: true, twilioPhoneNumber: true },
  });
  const smsActive = Boolean(shop?.smsEnabled || shop?.twilioPhoneNumber);
  if (!smsActive) return null;

  const accepted = await shopHasCurrentAgreement(shopId, AgreementType.SMS_ADDENDUM);
  if (!accepted) {
    return {
      ok: false,
      error:
        "Accept the SMS & Messaging Addendum under Settings → Legal before sending text messages.",
    };
  }
  return null;
}

export function requireTransactionalSmsConsent(
  customer: ConsentCustomer,
): ComplianceGateResult {
  if (!customer.phone?.trim()) {
    return { ok: false, error: "This customer has no phone number on file." };
  }
  if (!canSendTransactionalSms(customer)) {
    return {
      ok: false,
      error:
        "Customer has not opted in to service-related text messages. Update consent on their profile.",
    };
  }
  return null;
}

export function requireMarketingSmsConsent(customer: ConsentCustomer): ComplianceGateResult {
  if (!canSendMarketingSms(customer)) {
    return {
      ok: false,
      error: "Customer has not opted in to promotional text messages.",
    };
  }
  return null;
}

export function requireMarketingEmailConsent(customer: ConsentCustomer): ComplianceGateResult {
  if (!canSendMarketingEmail(customer)) {
    return {
      ok: false,
      error: "Customer has not opted in to promotional email.",
    };
  }
  return null;
}
