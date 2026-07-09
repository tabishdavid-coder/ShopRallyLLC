/**
 * Smoke test for SMS agent AI JSON parsing.
 * Run: npx tsx scripts/test-sms-agent-parse.ts
 */
import assert from "node:assert/strict";

import { leadReadyToBook, parseSmsAgentAiResponse } from "../src/lib/sms-agent-ai";

const sample = `{"reply":"Hi! What is your first and last name?","lead":{"concern":"brake noise"},"readyToBook":false}`;

const parsed = parseSmsAgentAiResponse(sample);
assert.match(parsed.reply, /first and last name/);
assert.equal(parsed.lead.concern, "brake noise");

assert.equal(
  leadReadyToBook({
    firstName: "Jane",
    lastName: "Doe",
    concern: "oil change",
    preferredDate: "2026-07-01",
    preferredTime: "09:00",
  }),
  true,
);

console.log("sms-agent parse tests passed");
