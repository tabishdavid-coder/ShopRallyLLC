import { NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { formToRecord, twilioSignatureValid } from "@/lib/twilio-webhook";
import { resolveShopForInbound } from "@/server/services/messaging";
import { handleInboundVoiceCall } from "@/server/services/voice-after-hours-agent";

export const dynamic = "force-dynamic";

/**
 * Twilio inbound Voice webhook.
 * Configure in Twilio Console → Phone Numbers → your number → Voice:
 *   Webhook URL: https://YOUR_DOMAIN/api/webhooks/twilio/voice
 *   HTTP POST
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const params = formToRecord(form);

  const signature = request.headers.get("x-twilio-signature");
  const url = publicUrl("/api/webhooks/twilio/voice");
  if (!twilioSignatureValid(url, params, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From?.trim() ?? "";
  const to = params.To?.trim() ?? "";
  const callSid = params.CallSid?.trim() ?? "";

  if (!from || !callSid) {
    return new NextResponse("Missing From or CallSid", { status: 400 });
  }

  const shopId = await resolveShopForInbound(to);
  if (!shopId) {
    console.warn(`[voice inbound] No shop resolved for To=${to}`);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  try {
    const twiml = await handleInboundVoiceCall({ shopId, from, to, callSid });
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[voice-agent] inbound failed:", err);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong. Please try again later.</Say><Hangup/></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }
}
