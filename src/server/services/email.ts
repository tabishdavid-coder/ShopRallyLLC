import "server-only";

/**
 * Email sending behind a provider interface. Live uses the Resend HTTP API; mock
 * records the message without sending.
 *
 * Platform env (required for live sends):
 *   RESEND_API_KEY — Resend API key (platform-operated; each shop sends from its
 *                    own verified domain/address configured in Settings → Email)
 *
 * Legacy EMAIL_FROM is used for internal platform mail (marketing lead alerts,
 * booking staff notify via getEmail()). Prefer sendPlatformEmail() for ops inbox
 * notifications. Customer-facing CRM sends use sendShopEmail().
 */

export type EmailResult = { id: string; status: string };

export type SendEmailOptions = {
  from?: string;
  replyTo?: string;
  html?: string;
};

export interface EmailProvider {
  readonly mode: "live" | "mock";
  send(to: string, subject: string, body: string, opts?: SendEmailOptions): Promise<EmailResult>;
}

export type ResendSendInput = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/** Whether the platform Resend API key is set. */
export function resendPlatformConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function defaultFromAddress(): string | null {
  return process.env.EMAIL_FROM?.trim() || null;
}

/** Low-level Resend HTTP send — used by shop-email and legacy getEmail(). */
export async function sendViaResend(input: ResendSendInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const payload: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  };
  if (input.html) payload.html = input.html;
  if (input.replyTo) payload.reply_to = input.replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { id?: string; message?: string; name?: string };
  if (!res.ok || !json.id) {
    throw new Error(json.message ?? json.name ?? `Email send failed (${res.status}).`);
  }
  return { id: json.id, status: "sent" };
}

class ResendEmailProvider implements EmailProvider {
  readonly mode = "live" as const;
  constructor(private cfg: { apiKey: string; from: string }) {}

  async send(
    to: string,
    subject: string,
    body: string,
    opts?: SendEmailOptions,
  ): Promise<EmailResult> {
    return sendViaResend({
      from: opts?.from ?? this.cfg.from,
      to,
      subject,
      text: body,
      html: opts?.html,
      replyTo: opts?.replyTo,
    });
  }
}

class MockEmailProvider implements EmailProvider {
  readonly mode = "mock" as const;
  async send(to: string, subject: string, body: string): Promise<EmailResult> {
    console.log(`[mock email] → ${to} | ${subject}\n${body}`);
    return { id: `mock-email-${Math.abs(hash(to + subject))}`, status: "mock" };
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

let cached: EmailProvider | null = null;

/** Legacy platform email provider — prefer sendShopEmail() for customer-facing sends. */
export function getEmail(): EmailProvider {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = defaultFromAddress();
  cached = apiKey && from ? new ResendEmailProvider({ apiKey, from }) : new MockEmailProvider();
  return cached;
}

/** Whether legacy platform email (RESEND + EMAIL_FROM) is configured. */
export function emailConfigured(): boolean {
  return resendPlatformConfigured() && Boolean(defaultFromAddress());
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
