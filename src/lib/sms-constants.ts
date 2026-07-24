/** Default TCPA opt-out footer appended to outbound shop SMS when not already present. */
export const DEFAULT_SMS_OPT_OUT_FOOTER = "Reply STOP to opt out.";

/** Inbound keywords that opt the customer out of marketing SMS (TCPA). */
export const SMS_STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);

export function isSmsStopKeyword(body: string): boolean {
  return SMS_STOP_KEYWORDS.has(body.trim().toUpperCase());
}

export type ShopSmsSetupStatus = "not_configured" | "pending_port" | "configured";

/** Seed/demo numbers — not real Twilio lines; treated as unassigned for provision + status. */
export const SMS_SEED_PLACEHOLDER_NUMBERS = new Set(["+17185550199", "+15185550100"]);

export function isSmsSeedPlaceholderNumber(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return false;
  return SMS_SEED_PLACEHOLDER_NUMBERS.has(phone.trim());
}

/** Effective Twilio number for routing/status (null when seed placeholder). */
export function effectiveTwilioPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone?.trim() || isSmsSeedPlaceholderNumber(phone)) return null;
  return phone.trim();
}

/** Derive wizard status from shop SMS fields. */
export function deriveShopSmsSetupStatus(input: {
  landlineNumber: string | null;
  twilioPhoneNumber: string | null;
  smsEnabled: boolean;
  smsSetupRequestedAt?: Date | null;
}): ShopSmsSetupStatus {
  const twilio = effectiveTwilioPhoneNumber(input.twilioPhoneNumber);
  if (input.smsEnabled && twilio) return "configured";
  if ((input.landlineNumber?.trim() || input.smsSetupRequestedAt) && !twilio) {
    return "pending_port";
  }
  return "not_configured";
}
