import { NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { formToRecord, twilioSignatureValid } from "@/lib/twilio-webhook";
import { rateLimitRouteAsync } from "@/lib/rate-limit";
import { recordInboundSms, resolveShopForInbound } from "@/server/services/messaging";
import {
  handleSmsAfterHoursAgent,
  shouldRunSmsAfterHoursAgent,
} from "@/server/services/sms-after-hours-agent";

export const dynamic = "force-dynamic";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twimlMessage(body: string): NextResponse {
  return new NextResponse(`<Response><Message>${escapeXml(body)}</Message></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function emptyTwiml(): NextResponse {
  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Twilio inbound SMS webhook.
 * Configure in Twilio Console → Phone Numbers → your number → Messaging:
 *   Webhook URL: https://YOUR_DOMAIN/api/webhooks/twilio/sms
 *   HTTP POST
 */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const limited = await rateLimitRouteAsync("twilio-sms-webhook", ip, 300, 60_000);
  if (!limited.ok) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const form = await request.formData();
  const params = formToRecord(form);

  const signature = request.headers.get("x-twilio-signature");
  const url = publicUrl("/api/webhooks/twilio/sms");
  if (!twilioSignatureValid(url, params, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From?.trim() ?? "";
  const to = params.To?.trim() ?? "";
  const body = params.Body?.trim() ?? "";
  const sid = params.MessageSid?.trim();

  if (!from || !body) {
    return new NextResponse("Missing From or Body", { status: 400 });
  }

  const shopId = await resolveShopForInbound(to);
  if (!shopId) {
    console.warn(`[sms inbound] No shop resolved for To=${to}`);
    return emptyTwiml();
  }

  if (await shouldRunSmsAfterHoursAgent(shopId)) {
    try {
      const agent = await handleSmsAfterHoursAgent({
        shopId,
        from,
        to,
        body,
        twilioSid: sid,
      });
      if (agent.handled) {
        return agent.reply ? twimlMessage(agent.reply) : emptyTwiml();
      }
    } catch (err) {
      console.error("[sms-agent] webhook handler failed:", err);
      return twimlMessage(
        "Thanks for your message. We're closed — a team member will follow up during business hours.",
      );
    }
  }

  await recordInboundSms({ shopId, from, to, body, twilioSid: sid });
  return emptyTwiml();
}
