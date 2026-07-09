/**
 * Quick smoke test for RO authorization email template + send path.
 * Run: npx tsx scripts/test-ro-authorization-email.ts
 */
import { buildRoAuthorizationEmail } from "../src/lib/email-templates/ro-authorization";

const { subject, body } = buildRoAuthorizationEmail({
  roNumber: 453,
  roId: "test-ro-id",
  customerName: "Sydney Difabio",
  vehicleLabel: "2020 Honda Accord Sport",
  shopState: "NY",
  approvedJobs: [
    { name: "Remove & Replace Spark Plugs", approvedAt: new Date("2026-06-29T16:52:00Z") },
    { name: "NYS Inspection", approvedAt: new Date("2026-06-29T16:52:00Z") },
    { name: "Remove & Replace Brake Pads", approvedAt: new Date("2026-06-29T16:52:00Z") },
  ],
  declinedJobNames: [],
});

console.log("Subject:", subject);
console.log("\n--- Body ---\n");
console.log(body);
