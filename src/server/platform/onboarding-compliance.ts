import "server-only";

import { AgreementType } from "@/generated/prisma";
import {
  checkShopLegalCompliance,
  shopHasCurrentAgreement,
} from "@/server/legal";
import type { OnboardingStep } from "@/server/platform/onboarding";

export type ShopComplianceInput = {
  shopId: string;
  masterId: string;
  platformId: string;
  primaryContactName: string | null;
  msaAcknowledgedAt: Date | null;
  smsEnabled: boolean;
  twilioPhoneNumber: string | null;
  membershipCount: number;
  legalAcceptanceCount: number;
};

/** Compliance checklist steps aligned with multi-tenant SaaS onboarding best practices. */
export async function buildComplianceOnboardingSteps(
  input: ShopComplianceInput,
): Promise<OnboardingStep[]> {
  const [legal, dpaAccepted, smsAddendumAccepted] = await Promise.all([
    checkShopLegalCompliance(input.shopId),
    shopHasCurrentAgreement(input.shopId, AgreementType.DPA),
    shopHasCurrentAgreement(input.shopId, AgreementType.SMS_ADDENDUM),
  ]);

  const msaTosDone = legal.compliant;
  const privacyDone =
    !legal.missing.includes(AgreementType.PRIVACY_POLICY) &&
    !legal.outdatedTypes.includes(AgreementType.PRIVACY_POLICY);

  const smsNeeded = input.smsEnabled || Boolean(input.twilioPhoneNumber);
  const smsPolicyDone = !smsNeeded || smsAddendumAccepted;

  const isolationDone = Boolean(input.masterId && input.platformId);
  const primaryAdminDone =
    Boolean(input.primaryContactName?.trim()) || input.membershipCount > 0;
  const masterKeyDone = Boolean(input.masterId);
  const preGoLiveMsaDone = msaTosDone || Boolean(input.msaAcknowledgedAt);

  return [
    {
      id: "compliance-master-key",
      label: "Master key issued",
      description: "Unique tenant master ID assigned at provision.",
      done: masterKeyDone,
      href: `/platform/shops/${input.shopId}`,
      group: "compliance",
    },
    {
      id: "compliance-msa-tos",
      label: "MSA / TOS accepted",
      description: "Current platform Terms of Service clickwrap on file.",
      done: msaTosDone,
      href: `/platform/shops/${input.shopId}/legal`,
      group: "compliance",
    },
    {
      id: "compliance-privacy",
      label: "Privacy acknowledged",
      description: "Privacy Policy accepted (includes data processing summary).",
      done: privacyDone,
      href: "/legal/privacy",
      group: "compliance",
    },
    {
      id: "compliance-dpa",
      label: "DPA acknowledged",
      description: "Data Processing Agreement signed (required for enterprise / EU).",
      done: dpaAccepted,
      href: "/legal/dpa",
      stub: !dpaAccepted,
      group: "compliance",
    },
    {
      id: "compliance-sms",
      label: "SMS consent policy",
      description: smsNeeded
        ? "SMS & Messaging Addendum accepted before Twilio go-live."
        : "Not required until SMS is enabled.",
      done: smsPolicyDone,
      href: `/platform/shops/${input.shopId}/legal`,
      stub: smsNeeded && !smsAddendumAccepted,
      group: "compliance",
    },
    {
      id: "compliance-isolation",
      label: "Tenant isolation confirmed",
      description: "Shop scoped to platform tenant with unique master ID.",
      done: isolationDone,
      group: "compliance",
    },
    {
      id: "compliance-primary-admin",
      label: "Primary admin identified",
      description: "Owner/GM contact on file or first team member invited.",
      done: primaryAdminDone,
      href: `/platform/shops/${input.shopId}`,
      group: "compliance",
    },
    {
      id: "compliance-msa-commitment",
      label: "Pre-go-live MSA commitment",
      description: "Shop acknowledged MSA at intake or completed full legal acceptance.",
      done: preGoLiveMsaDone,
      href: `/onboarding/legal`,
      group: "compliance",
    },
  ];
}
