/**
 * Smoke test for voice agent AI JSON parsing (same schema as SMS agent).
 * Run: npx tsx scripts/test-voice-agent-parse.ts
 */
import assert from "node:assert/strict";

import { leadReadyToBook, parseSmsAgentAiResponse } from "../src/lib/sms-agent-ai";

const sample = `{"reply":"Thanks for calling. What is your first and last name?","lead":{"concern":"check engine light"},"readyToBook":false}`;

const parsed = parseSmsAgentAiResponse(sample);
assert.match(parsed.reply, /first and last name/);
assert.equal(parsed.lead.concern, "check engine light");

assert.equal(
  leadReadyToBook({
    firstName: "John",
    lastName: "Smith",
    concern: "brakes",
    preferredDate: "2026-07-02",
    preferredTime: "10:30",
  }),
  true,
);

console.log("voice-agent parse tests passed");
