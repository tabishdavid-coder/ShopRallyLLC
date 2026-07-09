#!/usr/bin/env tsx
/**
 * POST a simulated Twilio Voice inbound webhook to a local dev server.
 * Signature check is skipped when TWILIO_AUTH_TOKEN is unset (non-production).
 *
 * Usage:
 *   npx tsx scripts/test-voice-webhook-local.ts +15551234567 +15559876543
 *   APP_URL=http://localhost:3000 npx tsx scripts/test-voice-webhook-local.ts
 */
const base = process.env.APP_URL?.trim() || "http://localhost:3000";
const from = process.argv[2] ?? "+15551234567";
const to = process.argv[3] ?? process.env.TWILIO_FROM_NUMBER ?? "+15185550100";
const callSid = `CA_test_${Date.now()}`;

async function main() {
  const url = `${base.replace(/\/$/, "")}/api/webhooks/twilio/voice`;
  const body = new URLSearchParams({
    CallSid: callSid,
    From: from,
    To: to,
    CallStatus: "ringing",
    Direction: "inbound",
  });

  console.log(`POST ${url}`);
  console.log(`  From=${from} To=${to} CallSid=${callSid}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  console.log(`\nStatus: ${res.status}`);
  console.log(text.slice(0, 1200));
  if (!res.ok) process.exitCode = 1;
  else if (!text.includes("<Response")) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
