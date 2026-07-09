/**
 * Smoke test for SEO content AI JSON parsing (no Anthropic call).
 * Run: npx tsx scripts/test-seo-content-parse.ts
 */
import assert from "node:assert/strict";

import { parseSeoContentAiResponse } from "../src/lib/seo-content-ai";

const sample = `
Here is your SEO content:
{
  "metaTitle": "In & Out AutoHaus | Auto Repair Schenectady NY",
  "metaDescription": "Trusted auto repair in Schenectady — brakes, oil changes, diagnostics. Schedule service at In & Out AutoHaus today.",
  "services": [
    { "title": "Brake Repair", "description": "Full brake inspections and pad replacement for Schenectady drivers." }
  ],
  "keywords": ["auto repair schenectady", "brake repair schenectady"]
}
`;

const parsed = parseSeoContentAiResponse(sample);
assert.equal(parsed.metaTitle.includes("AutoHaus"), true);
assert.equal(parsed.services.length, 1);
assert.equal(parsed.keywords.length, 2);

try {
  parseSeoContentAiResponse("not json");
  assert.fail("expected throw");
} catch (err) {
  assert.match(String(err), /valid SEO content JSON/);
}

console.log("seo-content parse tests passed");
