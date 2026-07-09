/**
 * Record animated intake redesign prototype → webm + catbox upload
 *
 * Usage:
 *   node agents/OrderProcessLab/scripts/record-intake-redesign-mockup.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = path.join(__dirname, "..");
const OUT = path.join(LAB_ROOT, "output");
const PROTOTYPE = path.join(LAB_ROOT, "prototype", "intake-redesign.html");

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();

  const fileUrl = `file:///${PROTOTYPE.replace(/\\/g, "/")}?autoplay=1`;
  await page.goto(fileUrl, { waitUntil: "load", timeout: 30_000 });

  await page.waitForFunction(() => window.__demoComplete === true, { timeout: 120_000 });
  await page.waitForTimeout(1500);

  const video = page.video();
  await page.close();
  await ctx.close();
  await browser.close();

  let videoPath = null;
  if (video) {
    const raw = await video.path();
    const dest = path.join(OUT, `intake-redesign-mockup-${stamp}.webm`);
    const fs = await import("node:fs/promises");
    await fs.rename(raw, dest).catch(async () => fs.copyFile(raw, dest));
    videoPath = dest;
    console.log(`video saved ${dest}`);
  }

  await writeFile(
    path.join(OUT, `intake-redesign-meta-${stamp}.json`),
    JSON.stringify({ recordedAt: new Date().toISOString(), video: videoPath, prototype: PROTOTYPE }, null, 2),
  );

  if (videoPath) {
    console.log("\n=== Uploading remote link ===");
    const up = spawnSync(process.execPath, [path.join(__dirname, "upload-remote-link.mjs"), `--file=${videoPath}`], {
      stdio: "inherit",
      cwd: path.join(__dirname, "../../.."),
    });
    if (up.status !== 0) process.exit(up.status ?? 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
