import "server-only";

import { prisma } from "@/db/client";
import { checkShopLegalCompliance } from "@/server/legal";
import { shopIdForClerkOrg } from "@/server/clerk-org";

/** Cookie/header flag set when a newly created Clerk org still needs platform legal onboarding. */
export const LEGAL_ONBOARDING_PENDING_COOKIE = "rp_legal_pending";

/**
 * Returns the path new org members should visit before using the CRM.
 * Wire this from middleware once Clerk org creation is live.
 */
export function legalOnboardingPathForNewOrg(_clerkOrgId: string): string {
  return "/onboarding/legal";
}

/**
 * True when the shop linked to a Clerk org has not completed required legal agreements.
 */
export async function shouldRedirectNewOrgToLegal(clerkOrgId: string): Promise<boolean> {
  const shopId = await shopIdForClerkOrg(clerkOrgId);
  if (!shopId) return false;

  const compliance = await checkShopLegalCompliance(shopId);
  return !compliance.compliant;
}

/** Shop id for legal onboarding when entering via Clerk org context only. */
export async function shopIdForLegalOnboarding(clerkOrgId: string): Promise<string | null> {
  return shopIdForClerkOrg(clerkOrgId);
}
