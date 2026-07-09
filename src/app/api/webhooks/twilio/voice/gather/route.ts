import { NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { formToRecord, twilioSignatureValid } from "@/lib/twilio-webhook";
import { resolveShopForInbound } from "@/server/services/messaging";
import { handleVoiceGather } from "@/server/services/voice-after-hours-agent";

export const dynamic = "force-dynamic";

/** Twilio `<Gather>` speech callback for the after-hours voice agent. */
export async function POST(request: Request) {
  const form = await request.formData();
  const params = formToRecord(form);

  const signature = request.headers.get("x-twilio-signature");
  const url = publicUrl("/api/webhooks/twilio/voice/gather");
  if (!twilioSignatureValid(url, params, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From?.trim() ?? "";
  const to = params.To?.trim() ?? "";
  const callSid = params.CallSid?.trim() ?? "";
  const speechResult = params.SpeechResult?.trim() ?? "";

  if (!callSid) {
    return new NextResponse("Missing CallSid", { status: 400 });
  }

  const shopId = await resolveShopForInbound(to);
  if (!shopId) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }

  try {
    const twiml = await handleVoiceGather({
      shopId,
      from,
      to,
      callSid,
      speechResult,
    });
    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("[voice-agent] gather failed:", err);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong. Goodbye.</Say><Hangup/></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  }
}
