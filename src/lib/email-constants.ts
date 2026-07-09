/** Derive shop email setup status from Shop fields. */
export type ShopEmailSetupStatus = "not_configured" | "ready" | "disabled";

export function deriveShopEmailSetupStatus(input: {
  emailFromAddress: string | null;
  emailEnabled: boolean;
  platformResendConfigured: boolean;
}): ShopEmailSetupStatus {
  if (!input.emailFromAddress?.trim()) return "not_configured";
  if (!input.emailEnabled) return "disabled";
  if (!input.platformResendConfigured) return "not_configured";
  return "ready";
}
