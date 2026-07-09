/**
 * Two-way SMS UI and server actions. Enabled by default; set SMS_ENABLED=false to
 * hide Text buttons and block sends. When Twilio env vars are missing the backend
 * runs in mock mode (log + store) via getSms() in server/services/sms.ts.
 */
export const SMS_ENABLED =
  process.env.SMS_ENABLED !== "false" && process.env.NEXT_PUBLIC_SMS_ENABLED !== "false";

/** True when all Twilio credentials are present (live send). */
export function twilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}
