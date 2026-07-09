/**
 * One-off logo render audit — captures key CRM routes at 1280×800.
 * Usage: node scripts/logo-audit-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/audits/screenshots/crm-logo-render-audit-2026-07-05");
const BASE = "http://localhost:3004";

async function capture(page, name, url, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  if (opts.beforeShot) await opts.beforeShot(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`saved ${file}`);
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const results = [];

  // Dashboard expanded sidebar
  await capture(page, "01-dashboard-expanded", `${BASE}/dashboard?design=open`);
  results.push({ route: "/dashboard", file: "01-dashboard-expanded.png" });

  // Collapsed sidebar via cookie
  await ctx.addCookies([{ name: "sidebar_state", value: "false", url: BASE }]);
  await capture(page, "02-dashboard-sidebar-collapsed", `${BASE}/dashboard?design=open`);
  results.push({ route: "/dashboard (collapsed)", file: "02-dashboard-sidebar-collapsed.png" });

  // Reset sidebar open for other routes
  await ctx.addCookies([{ name: "sidebar_state", value: "true", url: BASE }]);

  await capture(page, "03-platform", `${BASE}/platform?design=open`);
  results.push({ route: "/platform", file: "03-platform.png" });

  await capture(page, "04-login", `${BASE}/login`);
  results.push({ route: "/login", file: "04-login.png" });

  await capture(page, "05-marketing-home", `${BASE}/`);
  results.push({ route: "/", file: "05-marketing-home.png" });

  // Find first repair order link
  await page.goto(`${BASE}/job-board?design=open`, { waitUntil: "networkidle", timeout: 120_000 });
  const roHref = await page.locator('a[href*="/repair-orders/"]').first().getAttribute("href");
  if (roHref) {
    const estimateUrl = roHref.includes("/estimate") ? roHref : `${roHref}/estimate`;
    const full = estimateUrl.startsWith("http") ? estimateUrl : `${BASE}${estimateUrl}${estimateUrl.includes("?") ? "&" : "?"}design=open`;
    await capture(page, "06-ro-estimate", full.includes("design=open") ? full : `${full}${full.includes("?") ? "&" : "?"}design=open`);
    results.push({ route: estimateUrl, file: "06-ro-estimate.png" });
  } else {
    results.push({ route: "/repair-orders/{id}/estimate", file: null, error: "no RO link on job board" });
  }

  // Brand preview page — light-bg PNG lockup
  await capture(page, "07-brand-preview", `${BASE}/brand`);
  results.push({ route: "/brand", file: "07-brand-preview.png" });

  // Logo asset smoke — check img natural dimensions in page
  const assetChecks = [];
  for (const src of ["/brand/shoprally-logo.png", "/shoprally-logo.svg", "/icon.svg"]) {
    const check = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return { url, ok: res.ok, status: res.status, type: res.headers.get("content-type"), size: res.headers.get("content-length") };
    }, src);
    assetChecks.push(check);
  }

  await writeFile(path.join(OUT, "capture-meta.json"), JSON.stringify({ results, assetChecks }, null, 2));
  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
