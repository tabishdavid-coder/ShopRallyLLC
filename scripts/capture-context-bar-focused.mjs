import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url = "http://localhost:3031/repair-orders/cmr9dephy0001hhk0cesht45z/estimate";
const outDir = path.join(process.cwd(), "tmp", "screenshots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2000);

await page.waitForSelector(".ro-context-card", { timeout: 60000 });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const contextBarPath = path.join(outDir, `context-bar-focused-${timestamp}.png`);

const firstCard = page.locator(".ro-context-card").first();
await firstCard.waitFor({ state: "visible", timeout: 30000 });

const box = await firstCard.evaluate((el) => {
  const row = el.parentElement;
  if (!row) return null;
  const r = row.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});

if (box) {
  await page.screenshot({
    path: contextBarPath,
    clip: {
      x: Math.max(0, box.x - 8),
      y: Math.max(0, box.y - 4),
      width: Math.min(1920 - box.x, box.width + 16),
      height: box.height + 8,
    },
  });
}

const customerCard = await page.locator(".ro-context-card").first().innerText();
const vehicleCard = await page.locator(".ro-context-card").nth(1).innerText();
const hasTextIcon = await page.locator('.ro-context-card [aria-label="Text customer"]').count();
const hasVinCopy = await page.locator('.ro-context-card [aria-label="Copy VIN"]').count();
const hasPhoneCopy = await page.locator('.ro-context-card [aria-label="Copy phone"]').count();

console.log(JSON.stringify({
  ok: true,
  url: page.url(),
  contextBarPath,
  customerCard,
  vehicleCard,
  hasTextIcon,
  hasVinCopy,
  hasPhoneCopy,
  roHeader: await page.locator("h1, [class*='ro-header']").first().textContent().catch(() => null),
}, null, 2));

await browser.close();
