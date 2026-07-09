export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Strip characters that break TTS or exceed reasonable length. */
export function speechSafe(text: string, maxLen = 420): string {
  return text
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function twimlResponse(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export function twimlSay(text: string): string {
  return `<Say voice="Polly.Joanna">${escapeXml(speechSafe(text))}</Say>`;
}

export function twimlHangup(): string {
  return "<Hangup/>";
}

export function twimlDial(number: string): string {
  return `<Dial>${escapeXml(number)}</Dial>`;
}

export type GatherSpeechOptions = {
  actionUrl: string;
  prompt: string;
  recordingCallbackUrl?: string;
};

export function twimlGatherSpeech(opts: GatherSpeechOptions): string {
  const recording =
    opts.recordingCallbackUrl?.trim() ?
      `<Start><Recording recordingStatusCallback="${escapeXml(opts.recordingCallbackUrl)}" recordingStatusCallbackMethod="POST"/></Start>`
    : "";

  return (
    recording +
    `<Gather input="speech" action="${escapeXml(opts.actionUrl)}" method="POST" speechTimeout="auto" timeout="6">` +
    twimlSay(opts.prompt) +
    `</Gather>` +
    twimlSay("Sorry, I didn't hear anything. Goodbye.") +
    twimlHangup()
  );
}

export function twimlAgentTurn(opts: {
  say: string;
  gatherActionUrl: string;
  recordingCallbackUrl?: string;
  consentLine?: string;
  hangupAfter?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.consentLine) {
    parts.push(twimlSay(opts.consentLine));
  }
  parts.push(twimlSay(opts.say));
  if (opts.hangupAfter) {
    parts.push(twimlHangup());
    return twimlResponse(parts.join(""));
  }
  parts.push(
    twimlGatherSpeech({
      actionUrl: opts.gatherActionUrl,
      prompt: "Go ahead whenever you're ready.",
      recordingCallbackUrl: opts.recordingCallbackUrl,
    }),
  );
  return twimlResponse(parts.join(""));
}
