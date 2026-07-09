const { chromium } = require('playwright');
(async () => {
  const primary = 'http://localhost:3031/repair-orders/cmr9z0zmx0007hhz8ayp5s4bz/estimate';
  const fallback = 'http://localhost:3031';
  const outPath = process.argv[2];
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  let finalUrl = primary;
  try {
    const resp = await page.goto(primary, { waitUntil: 'networkidle', timeout: 60000 });
    if (!resp || resp.status() >= 400) throw new Error('Primary failed: ' + (resp ? resp.status() : 'no response'));
    const title = await page.title();
    const body = await page.locator('body').innerText();
    if (/not found|404|error/i.test(title + body)) throw new Error('Primary page looks like error');
  } catch (e) {
    console.log('PRIMARY_FAIL:' + e.message);
    finalUrl = fallback;
    await page.goto(fallback, { waitUntil: 'networkidle', timeout: 60000 });
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('URL:' + page.url());
  console.log('SCREENSHOT:' + outPath);
  await browser.close();
})();
