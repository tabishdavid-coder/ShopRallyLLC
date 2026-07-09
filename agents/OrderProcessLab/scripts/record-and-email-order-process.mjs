/**
 * Record Order Process walkthrough, then email to owner.
 *
 * Usage:
 *   node agents/OrderProcessLab/scripts/record-and-email-order-process.mjs
 *   node agents/OrderProcessLab/scripts/record-and-email-order-process.mjs --slow
 *   node agents/OrderProcessLab/scripts/record-and-email-order-process.mjs --to=tabish.david@gmail.com
 *
 * Prerequisite: npm run dev on :3004
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runNode(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...extraArgs], {
      stdio: "inherit",
      cwd: path.join(__dirname, "../../.."),
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(script)} exited ${code}`));
    });
  });
}

async function main() {
  const passthrough = process.argv.slice(2).filter((a) => !a.startsWith("--to="));
  const toArg = process.argv.find((a) => a.startsWith("--to="));
  const emailArgs = toArg ? [toArg] : [`--to=tabish.david@gmail.com`];

  console.log("=== Step 1/2: Record walkthrough ===");
  await runNode(path.join(__dirname, "record-order-process.mjs"), passthrough);

  console.log("\n=== Step 2/2: Email video ===");
  await runNode(path.join(__dirname, "email-order-process-video.mjs"), emailArgs);

  console.log("\nDone — check agents/OrderProcessLab/output/");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
