// Local-only demonstration checks. Demo requests are blocked and counted, never fulfilled with live data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = [
  ['/overview', 'Overview'], ['/vendors', 'Vendor Performance'], ['/leads', 'Lead Records'],
  ['/call-performance', 'Call Performance'], ['/data-quality', 'Data Quality'], ['/settings', 'Configuration'],
];

export async function verifyDemoWorkspace(browser, base, output = 'verification') {
  const origin = new URL(base).origin;
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Demo verification must use a local fixture server');
  fs.mkdirSync(output, { recursive: true });
  let checks = 0;
  const evidence = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [], consoleErrors = [], demoApiAttempts = [], liveApiAttempts = [], externalAttempts = [];
    let live = false;
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text()); });
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) (live ? liveApiAttempts : demoApiAttempts).push({ path: url.pathname, method: request.method() });
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
        externalAttempts.push(url.origin); return route.abort();
      }
      return route.fallback();
    });
    await context.route('**/api/**', route => {
      const request = route.request(), url = new URL(request.url());
      // Only the deliberate live-mode transition may reach the local, unauthenticated server.
      if (live && url.origin === origin && url.pathname === '/api/analytics/clients' && request.method() === 'GET') return route.continue();
      return route.abort();
    });
    const banner = page.getByText('Synthetic demo data — no live connection', { exact: true });
    const navigation = page.getByRole('navigation', { name: 'Demo workspace navigation', exact: true });
    const navigate = async title => {
      await navigation.getByRole('link', { name: title, exact: true }).click();
      await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor();
    };
    const selected = count => page.locator('.cx-demo-scope').filter({ hasText: `${count} of 248 synthetic records selected` });
    const checkFrame = async (route, title) => {
      await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor(); checks++;
      assert.equal(new URL(page.url()).pathname, route); checks++;
      assert.equal(new URL(page.url()).searchParams.get('mode'), 'demo'); checks++;
      assert.equal(await banner.count(), 1); checks++;
      assert.equal(await page.locator('vite-error-overlay').count(), 0); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      assert.deepEqual(demoApiAttempts, []); checks++;
    };
    const reset = async () => {
      const button = page.getByRole('button', { name: 'Reset demo filters', exact: true });
      if (await button.isEnabled()) await button.click();
      await selected(248).waitFor();
    };
    const table = () => page.getByRole('table', { name: 'Synthetic demo records', exact: true });
    try {
      await page.goto(`${base}/overview?mode=demo`);
      assert.equal(await page.title(), 'ConversionX | Lead & Revenue Analytics'); checks++;
      for (const [route, title] of PAGES) {
        await navigate(title);
        await checkFrame(route, title);
        assert.equal(await navigation.getByRole('link', { name: title, exact: true }).getAttribute('aria-current'), 'page'); checks++;
        await page.screenshot({ path: path.join(output, `demo-${route.slice(1)}-${viewport.width}.png`), fullPage: false });
      }
      await page.getByText('Local synthetic fixture', { exact: true }).waitFor(); checks++;
      assert.equal(await page.getByText('248 fictional leads', { exact: true }).count(), 1); checks++;
      assert.equal(await page.getByRole('button', { name: /export/i }).count(), 0); checks++;

      await navigate('Overview');
      const metric = name => page.locator('.cx-demo-metric').filter({ has: page.getByText(name, { exact: true }) }).locator('strong');
      assert.equal(await metric('Captured leads').innerText(), '248'); checks++;
      assert.equal(await metric('Recorded sales').innerText(), '98'); checks++;
      assert.equal(await metric('Activations').innerText(), '49'); checks++;
      assert.equal(await metric('Call attempts').innerText(), '716'); checks++;
      assert.equal(await metric('Illustrative value').innerText(), 'ZAR 26,873.64'); checks++;
      await page.getByRole('combobox', { name: 'Vendor contribution measure', exact: true }).selectOption('revenueCents');
      const vendorBar = page.getByRole('button', { name: /^Filter by Demo Cedar:.*illustrative value$/ });
      await vendorBar.click(); await selected(62).waitFor(); checks++;
      assert.equal(await page.getByRole('combobox', { name: 'Demo vendor', exact: true }).inputValue(), 'Demo Cedar'); checks++;
      assert.equal(await metric('Captured leads').innerText(), '62'); checks++;
      await navigate('Vendor Performance');
      assert.equal(await table().locator('tbody tr').count(), 1); checks++;
      assert.equal(await table().locator('tbody tr').first().getByRole('button', { name: 'Demo Cedar', exact: true }).count(), 1); checks++;
      await navigate('Lead Records');
      await selected(62).waitFor(); checks++;
      await page.getByRole('combobox', { name: 'Demo source', exact: true }).selectOption('Demo Search');
      await page.getByRole('combobox', { name: 'Demo lifecycle status', exact: true }).selectOption('New');
      await page.getByRole('searchbox', { name: 'Search demo records', exact: true }).fill('demo-20260701-01');
      await selected(1).waitFor(); checks++;
      assert.equal(await table().locator('tbody tr').count(), 1); checks++;
      assert.equal(await table().locator('tbody th').innerText(), 'DEMO-20260701-01'); checks++;

      await reset();
      await page.getByLabel('Demo start date', { exact: true }).fill('2026-07-10');
      await page.getByLabel('Demo end date', { exact: true }).fill('2026-07-12');
      await selected(24).waitFor(); checks++;
      await reset();
      await page.getByRole('combobox', { name: 'Sort demo records', exact: true }).selectOption('oldest');
      assert.equal(await table().locator('tbody th').first().innerText(), 'DEMO-20260701-01'); checks++;
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Showing 11–20 of 248 sample records', { exact: true }).waitFor(); checks++;
      assert.equal(await table().locator('tbody th').first().innerText(), 'DEMO-20260702-03'); checks++;
      await page.getByRole('button', { name: 'Previous', exact: true }).click();
      await page.getByText('Showing 1–10 of 248 sample records', { exact: true }).waitFor(); checks++;
      assert.equal(await page.getByRole('button', { name: 'Previous', exact: true }).isDisabled(), true); checks++;
      await page.getByRole('combobox', { name: 'Sort demo records', exact: true }).selectOption('calls');
      const attempts = await table().locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.querySelectorAll('td')[4].textContent)));
      assert.deepEqual(attempts, [...attempts].sort((a, b) => b - a)); checks++;
      assert.equal(attempts[0], 7); checks++;
      await page.getByRole('combobox', { name: 'Sort demo records', exact: true }).selectOption('value');
      const amounts = await table().locator('tbody tr').evaluateAll(rows => rows.map(row => Number(row.querySelectorAll('td')[5].textContent.replace(/[^0-9.]/g, ''))));
      assert.deepEqual(amounts, [...amounts].sort((a, b) => b - a)); checks++;

      await page.getByRole('combobox', { name: 'Sort demo records', exact: true }).selectOption('oldest');
      const inspect = page.getByRole('button', { name: 'Inspect demo lead DEMO-20260701-01', exact: true });
      await inspect.click();
      const dialog = page.getByRole('dialog', { name: 'Synthetic demo lead DEMO-20260701-01', exact: true });
      await dialog.waitFor(); checks++;
      assert.equal(await dialog.getByText('Synthetic record · not a real person', { exact: true }).count(), 1); checks++;
      assert.equal(await dialog.getByText('Not recorded', { exact: true }).count(), 1); checks++;
      assert.equal(await dialog.getByText('ZAR 0.00', { exact: true }).count(), 1); checks++;
      for (let index = 0; index < 6; index++) await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true); checks++;
      await page.screenshot({ path: path.join(output, `demo-modal-${viewport.width}.png`), fullPage: false });
      await page.emulateMedia({ media: 'print' });
      // Print deliberately suppresses the interactive modal, keeping the labelled underlying records.
      assert.equal(await page.locator('.cx-demo-modal').isVisible(), false); checks++;
      assert.equal(await banner.isVisible(), true); checks++;
      await page.emulateMedia({ media: 'screen' });
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      assert.equal(await inspect.evaluate(element => element === document.activeElement), true); checks++;
      await inspect.click(); await dialog.getByRole('button', { name: 'Return to demo', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' }); checks++;

      await page.getByRole('searchbox', { name: 'Search demo records', exact: true }).fill('no-fictional-record-matches');
      await page.getByRole('heading', { name: 'No sample records match', exact: true }).waitFor(); checks++;
      assert.equal(await table().count(), 0); checks++;
      assert.equal(await page.getByRole('button', { name: 'Next', exact: true }).isDisabled(), true); checks++;
      await page.getByRole('button', { name: 'Reset filters and show all demo data', exact: true }).click();
      await selected(248).waitFor(); checks++;
      await page.getByLabel('Demo start date', { exact: true }).fill('2026-07-20');
      await page.getByLabel('Demo end date', { exact: true }).fill('2026-07-10');
      await page.getByText('Choose a valid date range within 1–31 July 2026.', { exact: true }).waitFor(); checks++;
      assert.equal(await table().count(), 0); checks++;
      await page.getByRole('button', { name: 'Reset filters and show all demo data', exact: true }).click();

      await page.emulateMedia({ media: 'print' });
      assert.equal(await banner.isVisible(), true); checks++;
      assert.equal(await page.locator('.cx-demo-banner').evaluate(element => getComputedStyle(element).position), 'static'); checks++;
      assert.equal(await page.locator('.cx-demo-table-scroll').evaluate(element => getComputedStyle(element).overflowX), 'visible'); checks++;
      await page.screenshot({ path: path.join(output, `demo-print-${viewport.width}.png`), fullPage: true });
      await page.emulateMedia({ media: 'screen' });
      await navigate('Vendor Performance');
      await navigate('Call Performance');
      await page.goBack(); await checkFrame('/vendors', 'Vendor Performance');
      await page.goForward(); await checkFrame('/call-performance', 'Call Performance');
      await page.getByRole('combobox', { name: 'Demo vendor', exact: true }).selectOption('Demo Cedar');
      await selected(62).waitFor(); await page.reload();
      await checkFrame('/call-performance', 'Call Performance');
      await selected(248).waitFor(); checks++;
      await page.goto(`${base}/unavailable-demo-section?mode=demo`);
      await page.getByRole('heading', { level: 1, name: 'Overview', exact: true }).waitFor(); checks++;
      await page.getByText(/This route is not part of the six demo sections/).waitFor(); checks++;
      assert.equal(await banner.count(), 1); checks++;
      assert.deepEqual(demoApiAttempts, []); checks++;

      // A deliberate live exit remains blocked by the real missing-IAP response. No fake API response is supplied.
      live = true;
      const authResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/analytics/clients');
      await page.getByRole('link', { name: 'Open live mode', exact: true }).click();
      const response = await authResponse, body = await response.json();
      assert.equal(response.status(), 503); checks++;
      assert.equal(body.success, false); checks++;
      assert.match(body.error, /Authentication is not configured/); checks++;
      await page.getByRole('heading', { name: 'Workspace access is unavailable', exact: true }).waitFor(); checks++;
      assert.equal(new URL(page.url()).pathname, '/reports'); checks++;
      assert.equal(new URL(page.url()).searchParams.get('mode'), 'live'); checks++;
      assert.equal(await banner.count(), 0); checks++;
      assert.equal(await page.locator('.cx-demo-app').count(), 0); checks++;
      assert.deepEqual(liveApiAttempts, [{ path: '/api/analytics/clients', method: 'GET' }]); checks++;
      live = false;
      await page.getByRole('link', { name: 'View demo data', exact: true }).click();
      await checkFrame('/overview', 'Overview');
      await selected(248).waitFor(); checks++;
      assert.deepEqual(demoApiAttempts, []); checks++;
      assert.deepEqual(externalAttempts, []); checks++;
      assert.deepEqual(errors, []); checks++;
      // Chromium reports the intentionally exercised real HTTP 503 as a resource console error.
      assert.deepEqual(consoleErrors.filter(message => !/Failed to load resource:.*503/.test(message)), []); checks++;
      evidence.push({ viewport, checks, demoApiAttempts, liveApiAttempts, expectedConsoleMessages: consoleErrors });
    } catch (error) {
      await page.screenshot({ path: path.join(output, `demo-failure-${viewport.width}.png`), fullPage: true });
      fs.writeFileSync(path.join(output, `demo-failure-${viewport.width}.json`), JSON.stringify({ error: String(error), stack: error.stack, url: page.url(), body: await page.locator('body').innerText(), demoApiAttempts, liveApiAttempts, errors, consoleErrors }, null, 2));
      throw error;
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(output, 'demo-browser-results.json'), JSON.stringify({ checks, synthetic: true, liveWarehouseTested: false, evidence }, null, 2));
  return checks;
}
