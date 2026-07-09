import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const urls = [
  "http://localhost:3031/repair-orders/cmr9dephy0001hhk0cesht45z/estimate",
];

const outDir = path.join(process.cwd(), "tmp", "screenshots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

let loadedUrl = null;
let pageTitle = "";
let contextBarFound = false;
let contextBarText = "";

for (const url of urls) {
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    if (!response || response.status() !== 200) continue;

    // Hard refresh — bypass cache
    await page.reload({ waitUntil: "networkidle" });

    await page.waitForSelector(".ro-context-bar-details, .ro-context-card", { timeout: 30000 }).catch(() => {});

    loadedUrl = page.url();
    pageTitle = await page.title();

    const contextBar = page.locator(".ro-context-card").first();
    contextBarFound = (await contextBar.count()) > 0;

    if (contextBarFound) {
      contextBarText = await page.locator('[class*="ro-context"]').first().evaluate((el) => {
        const root = el.closest("div")?.parentElement ?? el;
        return root?.innerText?.slice(0, 500) ?? "";
      }).catch(() => "");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fullPath = path.join(outDir, `context-bar-${timestamp}.png`);
    const barPath = path.join(outDir, `context-bar-crop-${timestamp}.png`);

    await page.screenshot({ path: fullPath, fullPage: false });

    const barLocator = page.locator(".ro-context-card").first();
    if ((await barLocator.count()) > 0) {
      const box = await barLocator.boundingBox();
      if (box) {
        await page.screenshot({
          path: barPath,
          clip: {
            x: Math.max(0, box.x - 40),
            y: Math.max(0, box.y - 20),
            width: Math.min(1920, 1200),
            height: Math.min(200, box.height + 40),
          },
        });
      }
    }

    // Also capture header strip area
    const headerPath = path.join(outDir, `context-bar-header-${timestamp}.png`);
    await page.screenshot({
      path: headerPath,
      clip: { x: 0, y: 0, width: 1920, height: 220 },
    });

    console.log(JSON.stringify({
      ok: true,
      loadedUrl,
      pageTitle,
      contextBarFound,
      contextBarText,
      screenshots: { fullPath, barPath, headerPath },
      hasMessageSquare: await page.locator('[aria-label*="Text"], [title*="Text"]').count(),
      hasCopyButtons: await page.locator('.ro-context-card button[aria-label*="Copy"], .ro-context-card a[aria-label*="Copy"]').count(),
      roNumber: await page.locator("text=/RO #\\d+/").first().textContent().catch(() => null),
      customerName: await page.locator(".ro-context-card").first().textContent().catch(() => null),
    }, null, 2));

    break;
  } catch (err) {
    console.error(`Failed ${url}:`, err.message);
  }
}

if (!loadedUrl) {
  console.log(JSON.stringify({ ok: false, error: "Could not load any URL" }));
  process.exitCode = 1;
}

await browser.close();
