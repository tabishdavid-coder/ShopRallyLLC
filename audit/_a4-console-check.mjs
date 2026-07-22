/**
 * Agent 4 — console / network smoke for marketing routes (Playwright).
 */
import { chromium } from "playwright";

const BASE = process.env.A4_BASE || "http://localhost:3031";
const ROUTES = [
  "/",
  "/pricing",
  "/features",
  "/demo",
  "/launch",
  "/compare",
  "/compare/tekmetric-alternative",
  "/compare/garage360-alternative",
  "/compare/ari-alternative",
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const route of ROUTES) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failed = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });

  let status = 0;
  try {
    const resp = await page.goto(`${BASE}${route}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    status = resp?.status() ?? 0;
    await page.waitForTimeout(800);
  } catch (e) {
    pageErrors.push(`navigation: ${e}`);
  }

  results.push({
    route,
    status,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 12),
    pageErrors: [...new Set(pageErrors)].slice(0, 12),
    failed: [...new Set(failed)].slice(0, 20),
  });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
