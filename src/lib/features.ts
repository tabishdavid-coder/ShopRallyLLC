/**
 * Two-way SMS UI and server actions. Enabled by default; set SMS_ENABLED=false to
 * hide Text buttons and block sends. When Twilio env vars are missing the backend
 * runs in mock mode (log + store) via getSms() in server/services/sms.ts.
 */
export const SMS_ENABLED =
  process.env.SMS_ENABLED !== "false" && process.env.NEXT_PUBLIC_SMS_ENABLED !== "false";

/**
 * True when platform Twilio credentials are present (live send possible).
 * Matches `twilioPlatformConfigured()` in sms.ts — SID + auth token only.
 * Per-shop From number is separate (`Shop.twilioPhoneNumber`); do not require
 * `TWILIO_FROM_NUMBER` (dev-only fallback).
 */
export function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim(),
  );
}
