/**
 * Order Process Lab — Playwright walkthrough recorder
 *
 * Flows:
 *   --flow=existing-customer   (default legacy) search Tabish + fleet vehicle
 *   --flow=new-customer        AutoLeap-style FAB intake + add customer + add vehicle
 *
 * Usage:
 *   node agents/OrderProcessLab/scripts/record-order-process.mjs --slow --flow=new-customer
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = path.join(__dirname, "..");
const OUT = path.join(LAB_ROOT, "output");
const STORYBOARD = path.join(OUT, "storyboard");
const BASE = process.env.ORDER_PROCESS_BASE ?? "http://localhost:3004";
const DEMO_SHOP_COOKIE = "rp_active_shop";
const DEMO_SHOP_ID = "shop_demo";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const slow = args.includes("--slow");
const screenshotsOnly = args.includes("--screenshots-only");
const roArg = args.find((a) => a.startsWith("--ro="));
const flowArg = args.find((a) => a.startsWith("--flow="));
const flow = flowArg?.split("=")[1] ?? "new-customer";
const existingRoId = roArg?.split("=")[1];

const PAUSE = slow ? 1100 : 550;
const STAMP_SUFFIX = Date.now().toString().slice(-6);

async function pause(page, ms = PAUSE) {
  await page.waitForTimeout(ms);
}

async function shot(page, name, note) {
  const file = path.join(STORYBOARD, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`screenshot ${name} — ${note}`);
  return file;
}

/** Keep design dock + dev panel closed for clean recording */
async function hideDesignChrome(page) {
  await page.evaluate(() => {
    sessionStorage.setItem("karvio-design-dock", "closed");
    const sp = new URLSearchParams(window.location.search);
    if (sp.has("design")) {
      sp.delete("design");
      const qs = sp.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
    }

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

async function gotoClean(page, url) {
  const u = url.includes("?") ? `${url}&_rec=${STAMP_SUFFIX}` : `${url}?_rec=${STAMP_SUFFIX}`;
  await page.goto(u, { waitUntil: "networkidle", timeout: 120_000 });
  await hideDesignChrome(page);
  await pause(page, 600);
}

/** AutoLeap-style: Job Board → FAB sheet (board stays visible) */
async function openIntakeFromJobBoard(page) {
  await gotoClean(page, `${BASE}/job-board`);
  if (page.url().includes("/sign-in")) {
    throw new Error("Clerk login required.");
  }
  await shot(page, "01-job-board", "Job board — AutoLeap entry");

  const fab = page.getByRole("button", { name: "New repair order" });
  const toolbar = page.getByRole("button", { name: /^repair order$/i });

  if (await fab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await fab.click();
  } else if (await toolbar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toolbar.click();
  } else {
    await gotoClean(page, `${BASE}/repair-orders/new`);
  }

  await page.getByPlaceholder("Search customers…").waitFor({ timeout: 20_000 });
  await pause(page, 800);
  await shot(page, "02-intake-open", "Intake sheet over job board");
}

async function createNewCustomer(page) {
  const uniquePhone = `518-555-${STAMP_SUFFIX}`;
  const firstName = "Jordan";
  const lastName = `Walkin${STAMP_SUFFIX.slice(-4)}`;

  await page.getByPlaceholder("Search customers…").fill(`${firstName} ${lastName}`);
  await pause(page, 500);

  await page.getByRole("button", { name: /add customer/i }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 10_000 });
  await pause(page, 400);
  await shot(page, "03-add-customer-modal", "Add customer modal");

  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("First").fill(firstName);
  await dialog.getByPlaceholder("Last").fill(lastName);
  await dialog.getByPlaceholder("518-111-4787").fill(uniquePhone);
  await dialog.getByRole("button", { name: /save customer/i }).click();

  await page.getByText(`${firstName} ${lastName}`.replace("  ", " ")).or(page.getByText(lastName)).first()
    .waitFor({ timeout: 20_000 }).catch(() => {});
  await pause(page, 600);
  await shot(page, "04-customer-created", "New customer on intake");
}

async function createNewVehicle(page) {
  await page.getByRole("button", { name: /add vehicle/i }).first().click();
  const dialog = page.getByRole("dialog").last();
  await dialog.waitFor({ timeout: 15_000 });
  await pause(page, 500);
  await shot(page, "05-add-vehicle-modal", "Add vehicle");

  await dialog.getByRole("button", { name: "Custom Vehicle", exact: true }).click();
  await pause(page, 600);

  const grid = dialog.locator(".grid.gap-4");
  await grid.locator('input[inputmode="numeric"]').fill("2020");
  await grid.locator('input:not([inputmode="numeric"]):not([maxlength="17"])').nth(0).fill("Honda");
  await grid.locator('input:not([inputmode="numeric"]):not([maxlength="17"])').nth(1).fill("Accord");
  await pause(page, 500);
  await shot(page, "06-vehicle-form-filled", "Custom vehicle YMM");

  await dialog.getByRole("button", { name: /^continue$/i }).click();
  await pause(page, 800);
  await shot(page, "06-vehicle-details", "Vehicle details step");

  await dialog.getByRole("button", { name: /^save$/i }).click();
  await page.getByText("2020 Honda Accord").first().waitFor({ timeout: 20_000 }).catch(() => {});
  await pause(page, 2000);
  await shot(page, "06-vehicle-created", "Vehicle on intake");
}

async function selectExistingCustomer(page) {
  const search = page.getByPlaceholder("Search customers…");
  await search.fill("Tabish");
  await pause(page, 1000);
  await shot(page, "03-customer-search", "Search Tabish");
  await page.locator("button").filter({ hasText: /Tabish/i }).first().click();
  await pause(page);
  await shot(page, "04-customer-selected", "Customer selected");
}

async function selectExistingVehicle(page) {
  await page.getByText("Loading vehicles…").waitFor({ state: "hidden", timeout: 20_000 }).catch(() => {});
  await page.locator("button").filter({ hasText: /\d{4}/ }).first().click();
  await pause(page);
  await shot(page, "05-vehicle-selected", "Vehicle selected");
}

async function addConcernAndCreate(page) {
  const concern = page.getByPlaceholder(/concern|Describe a concern/i);
  await concern.fill("Brake noise when stopping — new walk-in customer");
  await pause(page, 350);

  const addConcern = page.getByRole("button", { name: /^add$/i }).first();
  if (await addConcern.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addConcern.click();
  } else {
    await concern.press("Enter");
  }
  await pause(page);
  await shot(page, "07-concern-added", "Concern chip");

  const odometer = page.getByPlaceholder(/Miles/i).first();
  if (await odometer.isVisible({ timeout: 2000 }).catch(() => false)) {
    await odometer.fill("62000");
  }

  await page.evaluate(() => document.getElementById("ro-intake-submit")?.click());
  await page.waitForURL(/\/repair-orders\/[^/]+\/estimate/, { timeout: 90_000 }).catch(async () => {
    await page.keyboard.press("Alt+Enter");
    await page.waitForURL(/\/repair-orders\/[^/]+\/estimate/, { timeout: 90_000 });
  });
  await hideDesignChrome(page);
  await pause(page, 1500);
  await shot(page, "08-estimate-landed", "Estimate — AutoLeap handoff");
}

async function addFirstJob(page) {
  await hideDesignChrome(page);
  const addJob = page.getByRole("button", { name: /\+ add job|add job/i }).first();
  await addJob.waitFor({ timeout: 25_000 });
  await addJob.click();
  await pause(page, 900);
  await shot(page, "09-job-launcher", "Add job launcher");

  await page.getByRole("button", { name: /add new job/i }).click();
  await pause(page, 2000);
  await shot(page, "10-job-added", "First job on estimate");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pause(page, 1000);
  await shot(page, "11-sticky-totals", "Sticky totals bar");
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await mkdir(OUT, { recursive: true });
  await mkdir(STORYBOARD, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });
  const contextOpts = {
    viewport: { width: 1280, height: 720 },
    ...(process.env.PLAYWRIGHT_STORAGE_STATE ? { storageState: process.env.PLAYWRIGHT_STORAGE_STATE } : {}),
    ...(screenshotsOnly ? {} : { recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } }),
  };
  const ctx = await browser.newContext(contextOpts);
  await ctx.addInitScript(() => {
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
      (document.head ?? document.documentElement).appendChild(style);
    }
  });
  await ctx.addCookies([
    { name: "sidebar_state", value: "true", url: BASE },
    { name: DEMO_SHOP_COOKIE, value: DEMO_SHOP_ID, url: BASE },
  ]);
  const page = await ctx.newPage();
  const log = [{ flow }];

  try {
    if (existingRoId) {
      await gotoClean(page, `${BASE}/repair-orders/${existingRoId}/estimate`);
      await addFirstJob(page);
      log.push({ step: "existing-ro", url: page.url() });
    } else if (flow === "new-customer") {
      await openIntakeFromJobBoard(page);
      log.push({ step: "intake-open", url: page.url() });
      await createNewCustomer(page);
      log.push({ step: "new-customer" });
      await createNewVehicle(page);
      log.push({ step: "new-vehicle" });
      await addConcernAndCreate(page);
      log.push({ step: "estimate-landed", url: page.url() });
      await addFirstJob(page);
      log.push({ step: "job-added", url: page.url() });
    } else {
      await openIntakeFromJobBoard(page);
      await selectExistingCustomer(page);
      await selectExistingVehicle(page);
      await addConcernAndCreate(page);
      await addFirstJob(page);
    }
  } catch (err) {
    console.error("Recording error:", err.message);
    log.push({ step: "error", message: String(err.message) });
    await shot(page, "99-error-state", "Error").catch(() => {});
    throw err;
  }

  const video = page.video();
  await page.close();
  await ctx.close();
  await browser.close();

  let videoPath = null;
  if (video) {
    videoPath = await video.path();
    const dest = path.join(OUT, `order-process-walkthrough-${stamp}.webm`);
    const fs = await import("node:fs/promises");
    await fs.rename(videoPath, dest).catch(async () => fs.copyFile(videoPath, dest));
    videoPath = dest;
    console.log(`video saved ${dest}`);
  }

  await writeFile(
    path.join(OUT, `recording-meta-${stamp}.json`),
    JSON.stringify({ recordedAt: new Date().toISOString(), flow, video: videoPath, steps: log }, null, 2),
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
