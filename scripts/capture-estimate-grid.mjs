import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const candidates = [
  {
    label: "RO-1381",
    url: "http://localhost:3031/repair-orders/cmr9z0zmx0007hhz8ayp5s4bz/estimate",
  },
  {
    label: "RO-1380-fallback",
    url: "http://localhost:3031/repair-orders/cmr9dephy0001hhk0cesht45z/estimate",
  },
];

const tekmetricMarkers = [
  "Rate/Retail",
  "Qty/Hrs",
  "GP%",
  "GP$",
  "GP/Hr",
  "ADD LABOR",
  "ADD PART",
  "Type",
  "Description",
];

const outDir = path.join(process.cwd(), "tmp", "screenshots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

let used = null;
let status = null;

for (const candidate of candidates) {
  const response = await page.goto(candidate.url, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  status = response?.status() ?? null;
  if (status === 200) {
    used = candidate;
    break;
  }
}

if (!used) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        error: "No candidate RO estimate page returned 200",
        tried: candidates,
        lastStatus: status,
      },
      null,
      2,
    ),
  );
  await browser.close();
  process.exit(1);
}

// Hard refresh (cache bypass)
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Scroll to job card / service items grid
const gridSelectors = [
  "table",
  "[data-testid='job-card']",
  "[class*='job-card']",
  "text=ADD LABOR",
  "text=ADD PART",
  "text=Service Items",
  "text=Rate/Retail",
];

for (const selector of gridSelectors) {
  const locator = page.locator(selector).first();
  if ((await locator.count()) > 0) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    break;
  }
}

// Extra scroll to center job area
await page.evaluate(() => {
  const markers = [
    ...document.querySelectorAll("table"),
    ...document.querySelectorAll("[class*='job']"),
    ...document.querySelectorAll("h2, h3, h4"),
  ];
  const target = markers.find((el) => {
    const text = el.textContent ?? "";
    return /labor|part|rate\/retail|add labor|service items/i.test(text);
  });
  if (target) {
    target.scrollIntoView({ block: "center" });
  } else {
    window.scrollBy(0, 500);
  }
});
await page.waitForTimeout(1500);

const bodyText = await page.locator("body").innerText();
const tekmetricVisible = tekmetricMarkers.filter((m) => bodyText.includes(m));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fullPath = path.join(outDir, `estimate-job-grid-${used.label}-${timestamp}.png`);
await page.screenshot({ path: fullPath, fullPage: false });

const gridPath = path.join(outDir, `estimate-job-grid-clip-${used.label}-${timestamp}.png`);
const table = page.locator("table").first();
if ((await table.count()) > 0) {
  const box = await table.boundingBox();
  if (box) {
    await page.screenshot({
      path: gridPath,
      clip: {
        x: Math.max(0, box.x - 24),
        y: Math.max(0, box.y - 120),
        width: Math.min(1920, box.width + 48),
        height: Math.min(900, box.height + 200),
      },
    });
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url: page.url(),
      roLabel: used.label,
      status,
      screenshotPath: fullPath,
      gridClipPath: (await table.count()) > 0 ? gridPath : null,
      tekmetricColumnsVisible: tekmetricVisible,
      hasTekmetricGrid: tekmetricVisible.length >= 3,
      bodySnippet: bodyText.slice(0, 1200),
    },
    null,
    2,
  ),
);

await browser.close();
