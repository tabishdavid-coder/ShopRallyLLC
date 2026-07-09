import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const PRIMARY =
  'http://localhost:3031/repair-orders/cmr9z0zmx0007hhz8ayp5s4bz/estimate';
const FALLBACK_RO =
  'http://localhost:3031/repair-orders/cmr9dephy0001hhk0cesht45z/estimate';

const outPath = process.argv[2];
if (!outPath) {
  console.error('Usage: node _capture-estimate-grid.mjs <output-path>');
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });

async function hardRefresh(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Page.reload', { ignoreCache: true });
  await page.waitForLoadState('networkidle', { timeout: 60000 });
}

async function ensureServicesTab(page) {
  const servicesTab = page.getByRole('tab', { name: /services|estimate/i }).first();
  if (await servicesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await servicesTab.click();
    await page.waitForTimeout(800);
  }
}

async function waitForJobGrid(page) {
  const selectors = [
    '[data-testid="estimate-job-card"]',
    '[data-testid="service-card"]',
    'table',
    'text=Gross profit',
    'text=GP',
    'text=Auto',
    'text=ADD LABOR',
    'text=ADD PART',
  ];
  for (const sel of selectors) {
    try {
      await page.locator(sel).first().waitFor({ state: 'visible', timeout: 15000 });
      return;
    } catch {
      /* try next */
    }
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  let usedUrl = PRIMARY;
  try {
    const resp = await page.goto(PRIMARY, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    if (!resp || resp.status() >= 400) {
      throw new Error(`Primary failed: ${resp ? resp.status() : 'no response'}`);
    }
    const body = await page.locator('body').innerText();
    if (/not found|404|error/i.test(body)) {
      throw new Error('Primary page looks like error');
    }
  } catch (e) {
    console.log('PRIMARY_FAIL:' + e.message);
    usedUrl = FALLBACK_RO;
    await page.goto(FALLBACK_RO, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  }

  await hardRefresh(page);
  await ensureServicesTab(page);
  await waitForJobGrid(page);
  await page.waitForTimeout(1200);

  // Scroll to job card footer (Auto + GP$ area)
  const footerHints = [
    page.getByText('Auto', { exact: true }),
    page.getByText(/Gross profit/i),
    page.getByText(/GP\$/i),
    page.getByText(/GP%/i),
  ];
  for (const loc of footerHints) {
    if (await loc.first().isVisible().catch(() => false)) {
      await loc.first().scrollIntoViewIfNeeded();
      break;
    }
  }

  // Prefer element screenshot of first job card if present
  const jobCard = page
    .locator('[data-testid="estimate-job-card"], [data-testid="service-card"]')
    .first();
  if (await jobCard.isVisible().catch(() => false)) {
    await jobCard.screenshot({ path: outPath });
  } else {
    await page.screenshot({ path: outPath, fullPage: true });
  }

  console.log('URL:' + page.url());
  console.log('USED_URL:' + usedUrl);
  console.log('SCREENSHOT:' + outPath);
  await browser.close();
})();
