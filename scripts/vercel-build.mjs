/**
 * Vercel production build.
 * Prisma generate is required for Next compile.
 * migrate deploy is best-effort: Neon P1001 flakes must not block marketing deploys
 * (MARKETING_ONLY production does not serve CRM write paths).
 */
import { spawnSync } from "node:child_process";

function run(label, command) {
  console.log(`\n[vercel-build] ${label}`);
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

if (run("prisma generate", "npx prisma generate") !== 0) {
  process.exit(1);
}

const migrateStatus = run("prisma migrate deploy", "npx prisma migrate deploy");
if (migrateStatus !== 0) {
  console.warn(
    "[vercel-build] prisma migrate deploy failed — continuing build (Neon connectivity flake).",
  );
}

if (run("next build", "next build") !== 0) {
  process.exit(1);
}
