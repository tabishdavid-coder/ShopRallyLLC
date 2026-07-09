import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url = "http://localhost:3031/repair-orders/cmr9z0zmx0007hhz8ayp5s4bz/estimate";
const outDir = path.join(process.cwd(), "tmp", "screenshots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fullPath = path.join(outDir, `context-bar-ro1381-${timestamp}.png`);
await page.screenshot({ path: fullPath, clip: { x: 0, y: 0, width: 1920, height: 280 } });

const text = await page.locator("body").innerText();
console.log(JSON.stringify({
  ok: response?.status() === 200,
  status: response?.status(),
  url: page.url(),
  fullPath,
  snippet: text.slice(0, 800),
  hasContextCard: text.includes("Dindong") || text.includes("Tesla"),
}, null, 2));

await browser.close();
