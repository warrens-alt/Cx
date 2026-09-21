// Deterministic synthetic records only; no live warehouse or authentication bypass.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyRequestStates(browser, base, output = 'verification') {
  fs.mkdirSync(output, { recursive: true });
  let checks = 0;
  const evidence = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [], requests = [], pendingTimeline = [], pendingDrawer = [], pendingExport = [];
    let denyWorkspace = true, holdTimeline = false, timelineError = false, holdDrawer = false, drawerError = false, malformedLeads = false, holdExport = false, unauthenticated = false;
    page.on('pageerror', error => errors.push(error.message));
    const scopeFilters = { vendor: { operator: 'in', values: ['Vendor A', 'Vendor B'] }, valid_idno: { operator: 'equals', value: false }, calls: { operator: 'equals', value: 0 } };
    const search = new URLSearchParams({ startDate: '2026-08-01', endDate: '2026-08-31', filters: JSON.stringify(scopeFilters) });
    const count = endpoint => requests.filter(request => request.path === endpoint).length;
    const finish = async (route, options) => route.fulfill(options).catch(error => { if (!/closed|aborted|Invalid InterceptionId/i.test(String(error))) throw error; });
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams);
      requests.push({ path: url.pathname, params });
      let data = {}, metadata, status = 200, error;
      if (url.pathname === '/api/analytics/clients') {
        if (denyWorkspace) { status = 403; error = 'Synthetic workspace access denied.'; }
        else data = ['a', 'b'].map(id => ({ id: `workspace-${id}`, name: `Synthetic workspace ${id.toUpperCase()}`, currency: 'ZAR', timezone: 'UTC', capabilities: {} }));
      } else if (url.pathname === '/api/analytics/filter-options') {
        data = { vendors: ['Vendor A', 'Vendor B'], sources: ['Fixture web'], mediums: ['Fixture organic'], grades: [], vettings: [] };
      } else if (url.pathname === '/api/analytics/leads') {
        if (unauthenticated) { status = 401; error = 'Synthetic session authentication expired.'; }
        data = malformedLeads ? { not: 'an array' } : Array.from({ length: 20 }, (_, index) => ({ id: `${params.clientId}-lead-${Number(params.offset) + index}`, captured: '2026-08-10T12:00:00Z', source: 'Fixture web', campaign: 'Fixture organic', quality: 'Not independently verified', calls: '0', status: 'Captured', value: '9007199254740993.000000001' }));
      } else if (url.pathname.startsWith('/api/analytics/lead-timeline/')) {
        const id = decodeURIComponent(url.pathname.split('/').at(-1));
        if (holdTimeline) await new Promise(resolve => pendingTimeline.push(resolve));
        if (timelineError) { status = 422; error = 'Synthetic timeline request rejected.'; }
        else data = [{ transaction_id: `transaction-${id}`, vendor: 'Fixture Vendor', capture_timestamp: '2026-08-10T12:00:00Z', first_call_timestamp: null, total_calls: '0', rpc: true, sale: true, activation: true }];
      } else if (url.pathname === '/api/analytics/export') {
        if (params.format === 'csv') {
          if (holdExport) await new Promise(resolve => pendingExport.push(resolve));
          return finish(route, { status: 200, contentType: 'text/csv', headers: { 'x-export-row-count': '10000', 'x-export-truncated': 'true' }, body: '\uFEFF"lead_id","exact"\r\n"synthetic-record","9007199254740993.000000001"' });
        }
        if (holdDrawer) await new Promise(resolve => pendingDrawer.push(resolve));
        if (drawerError) { status = 422; error = 'Synthetic record-unit request rejected.'; }
        else {
          data = Array.from({ length: 120 }, (_, index) => ({ lead_id: `synthetic-audit-${index}`, source: 'Fixture source', total_revenue: '9007199254740993.000000001', has_sale: false, total_calls: 0, report_truncated: false }));
          metadata = { truncated: false, generatedAt: '2026-09-20T00:00:00Z' };
        }
      } else if (url.pathname === '/api/analytics/calls') {
        data = { calledLeads: 8, totalCalls: 12, avgCalls: 1.5, oneCallRate: 50, repeatCallRate: 50, oneCallLeads: 4, repeatCallLeads: 4, totalDurationHours: 1.25, chart: [], vendors: [], dispositions: [], hourly: [], dayOfWeek: [] };
      }
      await finish(route, { status, contentType: 'application/json', headers: { 'x-request-id': 'synthetic-request-123' }, body: JSON.stringify({ success: status === 200, data, metadata, error }) });
    });
    try {
      await page.goto(`${base}/explorer?${search}`);
      await page.getByRole('heading', { name: 'Workspace access is unavailable', exact: true }).waitFor();
      assert.equal(count('/api/analytics/clients'), 1); checks++;
      assert.equal(count('/api/analytics/leads'), 0); checks++;
      assert.equal(await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).count(), 0); checks++;
      denyWorkspace = false;
      await page.getByRole('button', { name: 'Retry workspace access', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true }).waitFor(); checks++;
      assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Lead Records'); checks++;
      const initial = requests.filter(request => request.path === '/api/analytics/leads').at(-1).params;
      assert.equal(initial.clientId, 'workspace-a'); checks++;
      assert.deepEqual(JSON.parse(initial.filters), scopeFilters); checks++;
      const beforeSearch = count('/api/analytics/leads');
      await page.getByRole('searchbox', { name: 'Search this loaded page', exact: true }).fill('lead-19');
      assert.equal(await page.getByRole('button', { name: /^Inspect lead / }).count(), 1); checks++;
      assert.equal(count('/api/analytics/leads'), beforeSearch); checks++;
      await page.getByRole('searchbox', { name: 'Search this loaded page', exact: true }).fill('');
      await page.getByRole('button', { name: 'Next page', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-20', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.getByLabel('Capture date from', { exact: true }).fill('2026-08-02');
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true }).waitFor();
      assert.equal(requests.filter(request => request.path === '/api/analytics/leads').at(-1).params.offset, '0'); checks++;
      assert.equal(await page.getByRole('button', { name: 'Previous page', exact: true }).isDisabled(), true); checks++;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).click();
      const download = await downloadPromise;
      const csv = fs.readFileSync(await download.path(), 'utf8');
      assert.match(csv, /9007199254740993\.000000001/); checks++;
      const exported = requests.filter(request => request.path === '/api/analytics/export').at(-1).params;
      assert.equal(exported.clientId, 'workspace-a'); checks++;
      assert.equal(exported.startDate, '2026-08-02'); checks++;
      assert.equal(exported.endDate, '2026-08-31'); checks++;
      assert.deepEqual(JSON.parse(exported.filters), scopeFilters); checks++;
      await page.getByText(/The 10,000-record limit was reached/).waitFor(); checks++;

      holdExport = true;
      let obsoleteDownloads = 0;
      const obsoleteDownload = () => { obsoleteDownloads++; };
      page.on('download', obsoleteDownload);
      const heldExport = page.waitForRequest(request => new URL(request.url()).pathname === '/api/analytics/export');
      await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).click();
      await heldExport;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.getByLabel('Capture date from', { exact: true }).fill('2026-08-03');
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true }).waitFor();
      holdExport = false; pendingExport.splice(0).forEach(resolve => resolve());
      await page.waitForTimeout(100);
      assert.equal(obsoleteDownloads, 0); checks++;
      page.off('download', obsoleteDownload);
      await page.getByLabel('Capture date from', { exact: true }).fill('2026-08-02');
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).isEnabled(), true); checks++;

      const firstLead = page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true });
      await firstLead.click();
      let dialog = page.getByRole('dialog', { name: 'Lead timeline: workspace-a-lead-0', exact: true });
      await dialog.getByText('transaction-workspace-a-lead-0', { exact: true }).waitFor();
      const timelineRequest = requests.filter(request => request.path.includes('/lead-timeline/')).at(-1).params;
      assert.equal(timelineRequest.startDate, '2026-08-02'); checks++;
      assert.equal(timelineRequest.clientId, 'workspace-a'); checks++;
      assert.deepEqual(JSON.parse(timelineRequest.filters), scopeFilters); checks++;
      assert.equal(await dialog.getByText('Event timestamp unavailable', { exact: true }).count(), 3); checks++;
      for (let index = 0; index < 8; index++) await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true); checks++;
      await page.screenshot({ path: path.join(output, `request-timeline-${viewport.width}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await firstLead.evaluate(element => element === document.activeElement), true); checks++;

      holdTimeline = true;
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-1', exact: true }).click();
      await page.getByRole('dialog', { name: 'Lead timeline: workspace-a-lead-1', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('dialog [role="status"]'));
      await page.keyboard.press('Escape');
      holdTimeline = false;
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-2', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Lead timeline: workspace-a-lead-2', exact: true });
      await dialog.getByText('transaction-workspace-a-lead-2', { exact: true }).waitFor();
      pendingTimeline.splice(0).forEach(resolve => resolve());
      await page.waitForTimeout(100);
      assert.equal(await dialog.getByText('transaction-workspace-a-lead-1', { exact: true }).count(), 0); checks++;
      await page.keyboard.press('Escape');
      timelineError = true;
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-3', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Lead timeline: workspace-a-lead-3', exact: true });
      await dialog.getByRole('alert').waitFor();
      assert.match(await dialog.getByRole('alert').innerText(), /Synthetic timeline request rejected.*synthetic-request-123/s); checks++;
      timelineError = false;
      await dialog.getByRole('button', { name: 'Retry request', exact: true }).click();
      await dialog.getByText('transaction-workspace-a-lead-3', { exact: true }).waitFor(); checks++;
      await page.keyboard.press('Escape');
      await page.getByRole('combobox', { name: 'Active workspace', exact: true }).selectOption('workspace-b');
      await page.getByRole('button', { name: 'Inspect lead workspace-b-lead-0', exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('workspace'), 'workspace-b'); checks++;
      await page.reload();
      await page.getByRole('button', { name: 'Inspect lead workspace-b-lead-0', exact: true }).waitFor();
      assert.equal(await page.getByRole('combobox', { name: 'Active workspace', exact: true }).inputValue(), 'workspace-b'); checks++;
      await page.goBack();
      await page.getByRole('button', { name: 'Inspect lead workspace-a-lead-0', exact: true }).waitFor(); checks++;
      await page.goForward();
      await page.getByRole('button', { name: 'Inspect lead workspace-b-lead-0', exact: true }).waitFor(); checks++;
      assert.equal(await page.getByRole('button', { name: /^Inspect lead workspace-a/ }).count(), 0); checks++;
      assert.equal(await page.getByRole('button', { name: 'Previous page', exact: true }).isDisabled(), true); checks++;
      malformedLeads = true;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.getByLabel('Capture date through', { exact: true }).fill('2026-08-30');
      await page.getByText('The lead-record response is incomplete. Please retry.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).isDisabled(), true); checks++;
      assert.equal(await page.getByRole('button', { name: /^Inspect lead / }).count(), 0); checks++;
      malformedLeads = false;
      await page.getByRole('button', { name: 'Retry request', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect lead workspace-b-lead-0', exact: true }).waitFor(); checks++;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.screenshot({ path: path.join(output, `request-records-${viewport.width}.png`), fullPage: false });

      unauthenticated = true;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.getByLabel('Capture date from', { exact: true }).fill('2026-08-04');
      await page.getByRole('heading', { name: 'Workspace access is unavailable', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: /^Inspect lead / }).count(), 0); checks++;
      assert.equal(await page.getByRole('button', { name: 'Export selected scope CSV', exact: true }).count(), 0); checks++;
      unauthenticated = false;
      await page.getByRole('button', { name: 'Retry workspace access', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect lead workspace-b-lead-0', exact: true }).waitFor(); checks++;

      await page.goto(`${base}/call-performance?${search}`);
      const inspectPopulation = page.getByRole('button', { name: /^Inspect selected lead population/ }).first();
      await inspectPopulation.click();
      dialog = page.getByRole('dialog', { name: /^Selected Lead Population/ });
      await dialog.getByText('Showing 1–50 of 120 loaded records', { exact: true }).waitFor();
      assert.equal(await dialog.locator('tbody tr').count(), 50); checks++;
      await dialog.getByRole('button', { name: 'Next records', exact: true }).click();
      await dialog.getByText('Showing 51–100 of 120 loaded records', { exact: true }).waitFor(); checks++;
      const exportRequests = count('/api/analytics/export');
      const auditDownloadPromise = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Export all loaded records', exact: true }).click();
      const auditCsv = fs.readFileSync(await (await auditDownloadPromise).path(), 'utf8');
      assert.equal(auditCsv.split('\r\n').length, 121); checks++;
      assert.match(auditCsv, /9007199254740993\.000000001/); checks++;
      assert.equal(count('/api/analytics/export'), exportRequests); checks++;
      holdDrawer = true;
      await dialog.getByRole('combobox', { name: 'Record unit', exact: true }).selectOption('transaction');
      await dialog.getByRole('status', { name: 'Loading source data', exact: true }).waitFor();
      assert.equal(await dialog.locator('tbody tr').count(), 0); checks++;
      assert.equal(await dialog.getByRole('button', { name: 'Export all loaded records', exact: true }).isDisabled(), true); checks++;
      drawerError = true; holdDrawer = false; pendingDrawer.splice(0).forEach(resolve => resolve());
      await dialog.getByRole('alert').waitFor();
      assert.equal(await dialog.locator('tbody tr').count(), 0); checks++;
      await page.screenshot({ path: path.join(output, `request-drawer-error-${viewport.width}.png`), fullPage: false });
      drawerError = false;
      await dialog.getByRole('button', { name: 'Retry request', exact: true }).click();
      await dialog.getByText('Showing 1–50 of 120 loaded records', { exact: true }).waitFor(); checks++;
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await inspectPopulation.evaluate(element => element === document.activeElement), true); checks++;
      const queriesBeforeInvalidWorkspace = count('/api/analytics/leads');
      for (const workspaceQuery of ['workspace=workspace-a&workspace=workspace-b', 'workspace=not-authorised']) {
        await page.goto(`${base}/explorer?${workspaceQuery}`);
        await page.getByRole('heading', { name: 'Workspace access is unavailable', exact: true }).waitFor();
        assert.equal(count('/api/analytics/leads'), queriesBeforeInvalidWorkspace); checks++;
        assert.equal(await page.getByRole('button', { name: /^Inspect lead / }).count(), 0); checks++;
      }
      assert.equal(await page.locator('vite-error-overlay').count(), 0); checks++;
      assert.deepEqual(errors, []); checks++;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      evidence.push({ viewport, checks, requests });
    } finally {
      pendingTimeline.splice(0).forEach(resolve => resolve());
      pendingDrawer.splice(0).forEach(resolve => resolve());
      pendingExport.splice(0).forEach(resolve => resolve());
      await context.close();
    }
  }
  fs.writeFileSync(path.join(output, 'request-state-results.json'), JSON.stringify({ checks, synthetic: true, evidence }, null, 2));
  return checks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import('playwright');
  const { spawn } = await import('node:child_process');
  const server = spawn(process.execPath, ['dist/server/server.mjs'], { env: { ...process.env, NODE_ENV: 'production', PORT: '3189', IAP_AUDIENCE: '', CX_REPORTING_DATASET: '' }, stdio: 'pipe' });
  let browser;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch('http://127.0.0.1:3189/api/health')).ok) break; } catch {}
      if (attempt === 99) throw new Error('Request-state fixture server failed to start.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ headless: true });
    console.log(JSON.stringify({ checks: await verifyRequestStates(browser, 'http://127.0.0.1:3189'), synthetic: true }));
  } finally { await browser?.close(); server.kill('SIGTERM'); }
}
