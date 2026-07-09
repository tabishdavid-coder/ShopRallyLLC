/**
 * Record RO subform redesign walkthrough (updated CRM dialog shell)
 *
 * Usage:
 *   node agents/OrderProcessLab/scripts/record-ro-subforms-redesign.mjs --slow
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = path.join(__dirname, "..");
const OUT = path.join(LAB_ROOT, "output");
const STORYBOARD = path.join(OUT, "storyboard-subforms");
const BASE = process.env.ORDER_PROCESS_BASE ?? "http://localhost:3004";
const DEMO_SHOP_COOKIE = "rp_active_shop";
const DEMO_SHOP_ID = "shop_demo";

const args = process.argv.slice(2);
const slow = args.includes("--slow");
const PAUSE = slow ? 1400 : 700;

async function pause(page, ms = PAUSE) {
  await page.waitForTimeout(ms);
}

async function hideDesignChrome(page) {
  await page.evaluate(() => {
    sessionStorage.setItem("karvio-design-dock", "closed");
    const styleId = "karvio-recording-hide-design";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        aside.fixed.bottom-0.right-0.top-0,
        .fixed.bottom-5.right-5,
        div.relative.z-\\[90\\].shrink-0.border-b.border-brand-light\\/40.bg-brand-navy {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  });
}

async function shot(page, name, note) {
  const file = path.join(STORYBOARD, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`screenshot ${name} — ${note}`);
}

async function openFirstRoEstimate(page) {
  await page.goto(`${BASE}/job-board`, { waitUntil: "networkidle", timeout: 120_000 });
  await hideDesignChrome(page);
  await shot(page, "01-job-board", "Job board entry");
  await page.locator('[class*="cursor-grab"]').first().click();
  await page.waitForURL(/\/repair-orders\/[^/]+\/estimate/, { timeout: 60_000 });
  await hideDesignChrome(page);
  await pause(page, 1200);
  await shot(page, "02-estimate", "Estimate workspace");
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await mkdir(OUT, { recursive: true });
  await mkdir(STORYBOARD, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript(() => {
    sessionStorage.setItem("karvio-design-dock", "closed");
  });
  await ctx.addCookies([
    { name: "sidebar_state", value: "true", url: BASE },
    { name: DEMO_SHOP_COOKIE, value: DEMO_SHOP_ID, url: BASE },
  ]);

  const page = await ctx.newPage();
  const log = [];

  try {
    await openFirstRoEstimate(page);
    log.push({ step: "estimate-open", url: page.url() });

    // Concerns tab → customer concern dialog
    await page.getByRole("tab", { name: /concerns/i }).click();
    await pause(page);
    await page.getByText(/click to add customer concern/i).click();
    await page.getByRole("heading", { name: /customer concern/i }).waitFor({ timeout: 15_000 });
    await pause(page, 900);
    await shot(page, "03-customer-concern", "Customer concern — CRM shell");
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await pause(page, 600);

    // Technician concern dialog
    await page.getByText(/click to add technician finding/i).click();
    await page.getByRole("heading", { name: /technician concern/i }).waitFor({ timeout: 15_000 });
    await pause(page, 900);
    await shot(page, "04-tech-concern", "Technician concern — CRM sections");
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await pause(page, 600);
    log.push({ step: "concern-dialogs" });

    // Edit vehicle dialog from header cards (skip if RO locked)
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(page, 400);
    const editVehicle = page.getByRole("button", { name: /edit vehicle/i });
    if (await editVehicle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editVehicle.click();
      await page.getByRole("heading", { name: /edit vehicle/i }).waitFor({ timeout: 15_000 });
      await pause(page, 900);
      await shot(page, "05-edit-vehicle", "Edit vehicle — Identity + details sections");
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await pause(page, 600);
      log.push({ step: "edit-vehicle" });
    } else {
      log.push({ step: "edit-vehicle-skipped", reason: "RO not editable or button off-screen" });
    }

    // Activity tab → add activity dialog
    await page.getByRole("tab", { name: /^activity$/i }).click();
    await pause(page);
    await page.getByRole("button", { name: /add activity/i }).click();
    await page.getByRole("heading", { name: /add activity/i }).waitFor({ timeout: 15_000 });
    await pause(page, 900);
    await shot(page, "06-add-activity", "Add activity — CRM shell");
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await pause(page, 600);
    log.push({ step: "add-activity" });

    // WIP → Order details sheet + sidebar field dialog
    const roId = page.url().match(/repair-orders\/([^/]+)/)?.[1];
    if (roId) {
      await page.goto(`${BASE}/repair-orders/${roId}/work-in-progress`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await hideDesignChrome(page);
      await pause(page, 1000);
      await shot(page, "07-wip", "Work in progress");
      await page.getByRole("button", { name: /^details$/i }).click();
      await page.getByRole("heading", { name: /order details/i }).waitFor({ timeout: 15_000 });
      await pause(page, 900);
      await shot(page, "08-order-details-sheet", "Order details — navy sheet header");
      await page.getByRole("button", { name: /^add$/i }).first().click();
      await page.getByRole("heading", { name: /service writer|field value|promise time|odometer/i }).first()
        .waitFor({ timeout: 10_000 }).catch(() => {});
      await pause(page, 900);
      await shot(page, "09-sidebar-field", "Sidebar field dialog — CRM shell");
      await page.getByRole("button", { name: /^cancel$/i }).click();
      await pause(page, 600);

      // Odometer in dialog from header chip
      const odoChip = page.getByRole("button", { name: /odometer|mileage|mi/i }).first();
      if (await odoChip.isVisible({ timeout: 3000 }).catch(() => false)) {
        await odoChip.click();
        await page.getByRole("heading", { name: /odometer in/i }).waitFor({ timeout: 10_000 }).catch(() => {});
        await pause(page, 900);
        await shot(page, "10-odometer-in", "Odometer in — CRM shell");
        await page.getByRole("button", { name: /^cancel$/i }).click();
        await pause(page, 600);
      }
      log.push({ step: "order-details", roId });
    }
  } catch (err) {
    console.error("Recording error:", err.message);
    log.push({ step: "error", message: String(err.message) });
    await shot(page, "99-error", "Error state").catch(() => {});
    throw err;
  }

  const video = page.video();
  await page.close();
  await ctx.close();
  await browser.close();

  let videoPath = null;
  if (video) {
    const raw = await video.path();
    const dest = path.join(OUT, `ro-subforms-redesign-${stamp}.webm`);
    const fs = await import("node:fs/promises");
    await fs.rename(raw, dest).catch(async () => fs.copyFile(raw, dest));
    videoPath = dest;
    console.log(`video saved ${dest}`);
  }

  await writeFile(
    path.join(OUT, `ro-subforms-redesign-meta-${stamp}.json`),
    JSON.stringify({ recordedAt: new Date().toISOString(), video: videoPath, steps: log }, null, 2),
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
