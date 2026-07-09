import "server-only";

import type { AgreementType } from "@/generated/prisma";
import { checkShopLegalCompliance } from "@/server/legal";

export type ShopLegalCompliance = {
  compliant: boolean;
  missing: AgreementType[];
  pendingReaccept: boolean;
  outdatedTypes: AgreementType[];
};

const EXEMPT_PREFIXES = [
  "/onboarding",
  "/legal",
  "/approve",
  "/invoice",
  "/api",
] as const;

/** Routes that skip the shop legal compliance gate. */
export function isLegalExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  return EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function getShopLegalCompliance(
  shopId: string,
): Promise<ShopLegalCompliance> {
  return checkShopLegalCompliance(shopId);
}
