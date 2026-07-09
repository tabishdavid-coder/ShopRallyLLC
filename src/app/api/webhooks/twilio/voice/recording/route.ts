import { NextResponse } from "next/server";

import { publicUrl } from "@/lib/app-url";
import { formToRecord, twilioSignatureValid } from "@/lib/twilio-webhook";
import { resolveShopForInbound } from "@/server/services/messaging";
import { handleVoiceRecordingStatus } from "@/server/services/voice-after-hours-agent";

export const dynamic = "force-dynamic";

/** Twilio recording status callback — stores recording URL on the call log. */
export async function POST(request: Request) {
  const form = await request.formData();
  const params = formToRecord(form);

  const signature = request.headers.get("x-twilio-signature");
  const url = publicUrl("/api/webhooks/twilio/voice/recording");
  if (!twilioSignatureValid(url, params, signature)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const callSid = params.CallSid?.trim() ?? "";
  const to = params.To?.trim() ?? params.Called?.trim() ?? "";
  const recordingUrl = params.RecordingUrl?.trim();
  const recordingDuration = params.RecordingDuration?.trim();

  if (!callSid) {
    return new NextResponse("Missing CallSid", { status: 400 });
  }

  const shopId = await resolveShopForInbound(to);
  if (!shopId) {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    await handleVoiceRecordingStatus({
      shopId,
      callSid,
      recordingUrl,
      recordingDuration,
    });
  } catch (err) {
    console.warn("[voice-agent] recording callback failed:", err);
  }

  return new NextResponse("OK", { status: 200 });
}
