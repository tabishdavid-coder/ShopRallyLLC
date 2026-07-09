import { applyLaborHoursFloor, findHoursFloor } from "../src/lib/labor-hours-calibration";
import { expandOperationVariants } from "../src/lib/labor-guide-variants";
import type { LaborGuideHit } from "../src/lib/labor-guide-types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const floor = findHoursFloor("Front Wheel Bearing / Hub Assembly R&R");
assert(floor?.id === "wheel-bearing-hub", "bearing floor");
assert(floor!.minHoursPerUnit === 2.2, "bearing floor 2.2");

const raised = applyLaborHoursFloor({
  jobName: "Wheel Bearing R&R",
  unitLabel: "wheel",
  unitsOnVehicle: 2,
  laborHoursPerUnit: 1.2,
  laborOperations: [],
});
assert(raised.raisedFrom === 1.2, "raised from 1.2");
assert(raised.suggestion.laborHoursPerUnit === 2.2, "raised to 2.2");

const ok = applyLaborHoursFloor({
  jobName: "Wheel Bearing R&R",
  unitLabel: "wheel",
  unitsOnVehicle: 2,
  laborHoursPerUnit: 2.5,
  laborOperations: [],
});
assert(ok.raisedFrom == null, "do not lower 2.5");

const hit = {
  id: "t",
  jobName: "Wheel Bearing R&R",
  queryText: "Wheel Bearing R&R",
  laborOperations: ["hub"],
  laborHoursPerUnit: 2.2,
  unitsOnVehicle: 2,
  unitLabel: "wheel",
  totalHours: 4.4,
  source: "ai_estimate",
  confidenceScore: 0.5,
  notes: null,
  reasoningSummary: null,
} as LaborGuideHit;

const variants = expandOperationVariants(hit);
const front = variants.find((v) => v.label === "Front");
const both = variants.find((v) => v.label === "Front & Rear");
assert(front?.hours === 2.2, `Front should be 2.2 got ${front?.hours}`);
assert(both?.hours === 4.4, `Front & Rear should be 4.4 got ${both?.hours}`);

console.log("OK - bearing floor 2.2; Front 2.2 / Front & Rear 4.4");
