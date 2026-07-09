import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const URLS = [
  'http://localhost:3031/job-board',
  'http://localhost:3031/repair-orders/cmr9z0zmx0007hhz8ayp5s4bz/estimate',
];
const DEMO_SHOP_ID = 'shop_demo';

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath =
  process.argv[2] ?? `tmp/screenshots/shoprally-crm-3031-${stamp}.png`;

mkdirSync(dirname(outPath), { recursive: true });

async function hardRefresh(page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Page.reload', { ignoreCache: true });
  await page.waitForLoadState('load', { timeout: 120000 });
}

async function waitForContent(page, url) {
  const selectors =
    url.includes('/job-board')
      ? [
          'text=Estimates',
          'text=Work-In-Progress',
          'text=Completed',
          '[data-testid="job-board-card"]',
          'text=Job Board',
        ]
      : [
          'text=#1381',
          'text=RO #1381',
          '[data-testid="estimate-job-card"]',
          '[data-testid="service-card"]',
          'text=Gross profit',
          'text=ADD LABOR',
          'text=ADD PART',
          'text=Services',
          'table',
        ];

  for (const sel of selectors) {
    try {
      await page.locator(sel).first().waitFor({ state: 'visible', timeout: 30000 });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function tryUrl(page, url) {
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  if (!resp || resp.status() >= 400) {
    throw new Error(`HTTP ${resp?.status() ?? 'no response'}`);
  }
  await hardRefresh(page);
  const ok = await waitForContent(page, url);
  if (!ok) {
    const body = await page.locator('body').innerText();
    if (/not found|404|error/i.test(body.slice(0, 500))) {
      throw new Error('Page looks like an error state');
    }
  }
  return page.url();
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await context.addCookies([
    {
      name: 'rp_active_shop',
      value: DEMO_SHOP_ID,
      domain: 'localhost',
      path: '/',
    },
  ]);
  const page = await context.newPage();

  let finalUrl = URLS[0];
  for (const url of URLS) {
    try {
      finalUrl = await tryUrl(page, url);
      break;
    } catch (err) {
      console.log(`FAIL:${url} — ${err.message}`);
      if (url === URLS[URLS.length - 1]) throw err;
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: outPath, fullPage: true });

  console.log('URL:' + finalUrl);
  console.log('SCREENSHOT:' + outPath);

  await browser.close();
})();
