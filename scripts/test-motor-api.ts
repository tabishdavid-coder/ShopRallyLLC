/**
 * Smoke-test MOTOR DaaS credentials and a sample labor lookup.
 *
 * Usage (from repo root, with keys in .env / .env.local):
 *   npm run test:motor
 *   npm run test:motor -- "brake pad"
 *
 * Requires MOTOR_PUBLIC_KEY + MOTOR_PRIVATE_KEY (Shared HMAC auth).
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { motorGet } from "../src/server/services/motor/motor-client";
import { isMotorLaborEnabled } from "../src/server/services/motor/motor-config";
import { findMotorLaborSuggestion } from "../src/server/services/motor/motor-labor";
import { resolveMotorBaseVehicleId } from "../src/server/services/motor/motor-vehicle";

async function main() {
  if (!isMotorLaborEnabled()) {
    console.error(
      "MOTOR not enabled. Set MOTOR_PUBLIC_KEY + MOTOR_PRIVATE_KEY in .env.local (MOTOR_ENABLED=true).",
    );
    process.exit(1);
  }

  console.log("1) Hello — YMME years…");
  const years = await motorGet("/Information/YMME/Years", { min: 2015, max: 2026 });
  console.log(years.ok ? `   OK (${years.status})` : `   FAIL ${years.status}: ${years.error}`);

  const vehicle = {
    year: 2010,
    make: "Honda",
    model: "Civic",
    trim: null,
    engine: null,
    vin: "19XFA1F51AE028415",
  };

  console.log("2) Resolve BaseVehicleID…");
  const baseId = await resolveMotorBaseVehicleId(vehicle);
  console.log(baseId ? `   BaseVehicleID=${baseId}` : "   Could not resolve vehicle");

  const term = process.argv[2] ?? "brake pad";
  console.log(`3) Labor lookup: "${term}"…`);
  const suggestion = await findMotorLaborSuggestion(vehicle, term);
  if (suggestion) {
    console.log(
      `   ${suggestion.jobName} — ${suggestion.laborHoursPerUnit}h/${suggestion.unitLabel} × ${suggestion.unitsOnVehicle}`,
    );
  } else {
    console.log("   No MOTOR match (check keys, vehicle, or search term).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
