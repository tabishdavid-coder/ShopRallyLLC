import "server-only";

import { publicUrl } from "@/lib/app-url";
import { DEFAULT_SMS_OPT_OUT_FOOTER } from "@/lib/sms-constants";

/**
 * SMS sending behind a provider interface. Live uses the Twilio REST API; mock
 * records the message without sending. Live is selected only when both
 * TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set — otherwise mock, so the
 * messaging UI works before the Twilio number finishes verification.
 *
 * Platform credentials live in env; each shop sends from its own twilioPhoneNumber.
 * TWILIO_FROM_NUMBER is a dev-only fallback — never used in production sends.
 */

export type SmsResult = { sid: string; status: string };

export interface SmsProvider {
  readonly mode: "live" | "mock";
  send(to: string, body: string): Promise<SmsResult>;
}

export type TwilioSendConfig = {
  sid: string;
  token: string;
  from?: string;
  messagingServiceSid?: string;
};

type TwilioCredentials = { sid: string; token: string };

function twilioCredentials(): TwilioCredentials | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return { sid, token };
}

export function twilioPlatformConfigured(): boolean {
  return twilioCredentials() !== null;
}

function twilioAuthHeader(creds: TwilioCredentials): string {
  return Buffer.from(`${creds.sid}:${creds.token}`).toString("base64");
}

async function twilioRequest<T>(
  creds: TwilioCredentials,
  path: string,
  init?: RequestInit & { form?: URLSearchParams },
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Basic ${twilioAuthHeader(creds)}`,
    ...(init?.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.form ?? init?.body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as T & { message?: string; code?: number };
  if (!res.ok) {
    throw new Error(
      json.message
        ? `Twilio: ${json.message}${json.code ? ` (${json.code})` : ""}`
        : `Twilio request failed (${res.status}).`,
    );
  }
  return json;
}

class TwilioSmsProvider implements SmsProvider {
  readonly mode = "live" as const;
  constructor(private cfg: TwilioSendConfig) {}

  async send(to: string, body: string): Promise<SmsResult> {
    const form = new URLSearchParams({ To: to, Body: body });
    if (this.cfg.messagingServiceSid) {
      form.set("MessagingServiceSid", this.cfg.messagingServiceSid);
    } else if (this.cfg.from) {
      form.set("From", this.cfg.from);
    } else {
      throw new Error("Twilio send requires a From number or Messaging Service SID.");
    }

    const json = await twilioRequest<{ sid?: string; status?: string }>(
      { sid: this.cfg.sid, token: this.cfg.token },
      "/Messages.json",
      { method: "POST", form },
    );
    if (!json.sid) throw new Error("Twilio send failed — no message SID returned.");
    return { sid: json.sid, status: json.status ?? "queued" };
  }
}

class MockSmsProvider implements SmsProvider {
  readonly mode = "mock" as const;
  async send(to: string, body: string): Promise<SmsResult> {
    console.log(`[mock SMS] → ${to}: ${body}`);
    return { sid: `mock-${Math.abs(hash(to + body))}`, status: "mock" };
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

let cachedDefault: SmsProvider | null = null;

export type ShopSmsFromConfig = {
  twilioPhoneNumber?: string | null;
  twilioMessagingServiceSid?: string | null;
};

/** Append TCPA opt-out footer when the body does not already mention STOP. */
export function appendOptOutFooter(body: string, footer?: string | null): string {
  const trimmed = body.trim();
  const optOut = (footer?.trim() || DEFAULT_SMS_OPT_OUT_FOOTER).trim();
  if (!optOut) return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower.includes("stop") && (lower.includes("opt out") || lower.includes("opt-out"))) {
    return trimmed;
  }
  return `${trimmed}\n\n${optOut}`;
}

/** Resolve SMS provider for a shop. Pass shop from-number / messaging service when configured. */
export function getSms(shopConfig?: ShopSmsFromConfig | string | null): SmsProvider {
  const creds = twilioCredentials();
  const fromNumber =
    typeof shopConfig === "string" || shopConfig === null || shopConfig === undefined
      ? shopConfig
      : shopConfig.twilioPhoneNumber;
  const messagingServiceSid =
    typeof shopConfig === "object" && shopConfig !== null
      ? shopConfig.twilioMessagingServiceSid?.trim() ||
        process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ||
        undefined
      : process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || undefined;

  const from =
    fromNumber?.trim() ||
    (shopConfig === undefined ? process.env.TWILIO_FROM_NUMBER?.trim() : undefined);

  if (!creds || (!from && !messagingServiceSid)) return new MockSmsProvider();
  if (!fromNumber && !messagingServiceSid && cachedDefault) return cachedDefault;

  const provider = new TwilioSmsProvider({
    sid: creds.sid,
    token: creds.token,
    from,
    messagingServiceSid,
  });
  if (!fromNumber && !messagingServiceSid) cachedDefault = provider;
  return provider;
}

/** Search for an available US local SMS number (platform admin provisioning). */
export async function searchAvailableLocalNumber(areaCode?: string): Promise<string | null> {
  const creds = twilioCredentials();
  if (!creds) throw new Error("Twilio credentials not configured.");

  const params = new URLSearchParams({ SmsEnabled: "true", Limit: "5" });
  if (areaCode?.trim()) params.set("AreaCode", areaCode.trim());

  const json = await twilioRequest<{ available_phone_numbers?: { phone_number: string }[] }>(
    creds,
    `/AvailablePhoneNumbers/US/Local.json?${params}`,
  );
  return json.available_phone_numbers?.[0]?.phone_number ?? null;
}

/** Purchase a number and configure inbound SMS + Voice webhooks. */
export async function purchaseAndConfigureNumber(
  phoneNumber: string,
  smsWebhookUrl = publicUrl("/api/webhooks/twilio/sms"),
  voiceWebhookUrl = publicUrl("/api/webhooks/twilio/voice"),
): Promise<{ sid: string; phoneNumber: string }> {
  const creds = twilioCredentials();
  if (!creds) throw new Error("Twilio credentials not configured.");

  const form = new URLSearchParams({
    PhoneNumber: phoneNumber,
    SmsUrl: smsWebhookUrl,
    SmsMethod: "POST",
    VoiceUrl: voiceWebhookUrl,
    VoiceMethod: "POST",
  });

  const json = await twilioRequest<{ sid: string; phone_number: string }>(
    creds,
    "/IncomingPhoneNumbers.json",
    { method: "POST", form },
  );
  return { sid: json.sid, phoneNumber: json.phone_number };
}

/** Platform admin: buy a local number and return E.164. Does not assign to a shop. */
export async function provisionTwilioNumber(areaCode?: string): Promise<string> {
  const candidate = await searchAvailableLocalNumber(areaCode);
  if (!candidate) {
    throw new Error(
      areaCode
        ? `No SMS numbers available in area code ${areaCode}.`
        : "No SMS numbers available — try a specific area code.",
    );
  }
  const { phoneNumber } = await purchaseAndConfigureNumber(candidate);
  return phoneNumber;
}

/** Find an owned incoming number SID by E.164. */
async function findIncomingPhoneNumberSid(
  creds: TwilioCredentials,
  phoneNumber: string,
): Promise<string | null> {
  const params = new URLSearchParams({ PhoneNumber: phoneNumber, PageSize: "1" });
  const json = await twilioRequest<{ incoming_phone_numbers?: { sid: string }[] }>(
    creds,
    `/IncomingPhoneNumbers.json?${params}`,
  );
  return json.incoming_phone_numbers?.[0]?.sid ?? null;
}

/** Push SMS + Voice webhook URLs to an existing Twilio number (ops backfill). */
export async function syncTwilioNumberWebhooks(
  phoneNumber: string,
  smsWebhookUrl = publicUrl("/api/webhooks/twilio/sms"),
  voiceWebhookUrl = publicUrl("/api/webhooks/twilio/voice"),
): Promise<{ sid: string; phoneNumber: string }> {
  const creds = twilioCredentials();
  if (!creds) throw new Error("Twilio credentials not configured.");

  const normalized = phoneNumber.trim();
  const sid = await findIncomingPhoneNumberSid(creds, normalized);
  if (!sid) {
    throw new Error(
      `Twilio number ${normalized} was not found in this platform account. Assign or port it in Twilio first.`,
    );
  }

  const form = new URLSearchParams({
    SmsUrl: smsWebhookUrl,
    SmsMethod: "POST",
    VoiceUrl: voiceWebhookUrl,
    VoiceMethod: "POST",
  });

  await twilioRequest<{ sid: string; phone_number: string }>(
    creds,
    `/IncomingPhoneNumbers/${sid}.json`,
    { method: "POST", form },
  );

  return { sid, phoneNumber: normalized };
}
