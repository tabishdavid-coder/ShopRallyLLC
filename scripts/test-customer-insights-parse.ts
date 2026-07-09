/**
 * Smoke test for customer insights AI JSON parsing.
 * Run: npx tsx scripts/test-customer-insights-parse.ts
 */
import assert from "node:assert/strict";

import { parseCustomerInsightsAiResponse } from "../src/lib/customer-insights-ai";

const sample = `
{
  "bullets": [
    "3 repair orders — last visit 2026-03-12.",
    "Open balance $0 — good standing.",
    "2 yellow inspection items on RO #1042 worth a follow-up call."
  ],
  "suggestedAction": {
    "type": "call",
    "label": "Call about inspection items",
    "rationale": "Customer has attention items on the latest RO and may approve deferred work."
  }
}
`;

const parsed = parseCustomerInsightsAiResponse(sample);
assert.equal(parsed.bullets.length, 3);
assert.equal(parsed.suggestedAction.type, "call");

try {
  parseCustomerInsightsAiResponse("nope");
  assert.fail("expected throw");
} catch (err) {
  assert.match(String(err), /valid customer insights JSON/);
}

console.log("customer-insights parse tests passed");
