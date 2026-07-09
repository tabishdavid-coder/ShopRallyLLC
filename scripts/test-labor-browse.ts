/**
 * Unit test: canned job subcategory filter + classification.
 * Run: npx tsx scripts/test-labor-browse.ts
 */
import { classifyOperation, matchOperationsToSubcategory } from "../src/lib/labor-categories";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function cannedMatchesSubcategory(
  row: { name: string; description?: string | null; category?: string | null },
  subcategoryId: string,
): boolean {
  const text = [row.name, row.description ?? "", row.category ?? ""].join(" ");
  if (subcategoryId === "other-general") return !row.category;
  return matchOperationsToSubcategory(subcategoryId, [{ jobName: text }]).length > 0;
}

const brakePadsJob = {
  name: "Front brake pads & rotors",
  description: "Replace front brake pads and rotors",
  category: "Brakes",
};

assert(cannedMatchesSubcategory(brakePadsJob, "brakes-pads"), "brake pads job should match brakes-pads");
assert(!cannedMatchesSubcategory(brakePadsJob, "brakes-abs"), "brake pads job should NOT match brakes-abs");
assert(!cannedMatchesSubcategory(brakePadsJob, "brakes-parking"), "brake pads job should NOT match parking brake");

assert(
  classifyOperation("front cv axle replacement").subcategoryId === "trans-axle",
  "cv axle → trans-axle",
);
assert(
  classifyOperation("front wheel bearing replacement").subcategoryId === "tires-bearing",
  "wheel bearing → tires-bearing",
);
assert(
  classifyOperation("hub assembly replacement").subcategoryId === "tires-bearing",
  "hub assembly → tires-bearing",
);

console.log("Labor browse subcategory filter checks passed.");
