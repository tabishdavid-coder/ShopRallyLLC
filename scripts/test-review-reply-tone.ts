/**
 * Smoke test for review reply tone parsing.
 * Run: npx tsx scripts/test-review-reply-tone.ts
 */
import assert from "node:assert/strict";

import {
  parseReviewReplyTone,
  reviewReplyToneInstruction,
  reviewReplyVariantInstruction,
} from "../src/lib/review-reply-tone";

assert.equal(parseReviewReplyTone("friendly"), "friendly");
assert.equal(parseReviewReplyTone("formal"), "formal");
assert.equal(parseReviewReplyTone(undefined), "friendly");
assert.equal(parseReviewReplyTone("invalid"), "friendly");

assert.match(reviewReplyToneInstruction("friendly"), /warm/i);
assert.match(reviewReplyToneInstruction("formal"), /formal/i);
assert.match(reviewReplyVariantInstruction("shorter"), /shorter/i);

console.log("review-reply tone tests passed");
