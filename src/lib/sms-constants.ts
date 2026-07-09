/** Default TCPA opt-out footer appended to outbound shop SMS when not already present. */
export const DEFAULT_SMS_OPT_OUT_FOOTER = "Reply STOP to opt out.";

export type ShopSmsSetupStatus = "not_configured" | "pending_port" | "configured";

/** Derive wizard status from shop SMS fields. */
export function deriveShopSmsSetupStatus(input: {
  landlineNumber: string | null;
  twilioPhoneNumber: string | null;
  smsEnabled: boolean;
}): ShopSmsSetupStatus {
  if (input.smsEnabled && input.twilioPhoneNumber?.trim()) return "configured";
  if (input.landlineNumber?.trim() && !input.twilioPhoneNumber?.trim()) return "pending_port";
  return "not_configured";
}
