// All responses are synthetic. No live warehouse query or commercial approval is exercised.
import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function verifyFrontendOptimisations(browser, base) {
  let checks = 0;
  const measurements = [];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage(), errors = [], requests = [], pending = [];
    let hold = false, failReport = false, failCalls = false, lastEvidence;
    page.on('pageerror', error => errors.push(error.message));
    const cutoff = '2026-09-20T00:00:00.000Z';
    const groups = Array.from({ length: 500 }, (_, i) => [
      { metricId: 'call_attempts', group: `Segment ${String(i).padStart(4,'0')}`, value: '2', numerator: '2', denominator: null, unit: 'records', calculationStatus: 'CHECKED', completeness: 'COMPLETE', reason: null },
      { metricId: 'collected_value', group: `Segment ${String(i).padStart(4,'0')}`, value: i === 0 ? '9007199254740992.000000001' : i === 1 ? '9007199254740993.000000001' : '0.01', numerator: i === 0 ? '9007199254740992.000000001' : i === 1 ? '9007199254740993.000000001' : '0.01', denominator: null, unit: 'currency', calculationStatus: 'CHECKED', completeness: 'COMPLETE', reason: null },
    ]).flat();
    const count = path => requests.filter(request => request.path === path).length;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()), payload = route.request().postDataJSON();
      requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), payload });
      let data = {}, status = 200, message;
      if (url.pathname === '/api/analytics/clients') data = [{ id: 'default_tenant', name: 'Synthetic QA workspace', currency: 'ZAR', timezone: 'UTC', capabilities: {} }];
      else if (url.pathname === '/api/analytics/filter-options') data = { vendors: ['Vendor A', 'Vendor B'], sources: ['Web', 'Organic'], mediums: ['Paid', 'Organic'], grades: [], vettings: [] };
      else if (url.pathname === '/api/analytics/calls') {
        if (failCalls) { status = 500; message = 'Synthetic calls failure'; }
        else data = { calledLeads: 8, totalCalls: 12, avgCalls: 1.5, oneCallRate: 50, repeatCallRate: 50, oneCallLeads: 4, repeatCallLeads: 4, totalDurationHours: 1.25, chart: [], vendors: [], dispositions: [], hourly: [], dayOfWeek: [] };
      } else if (url.pathname === '/api/reporting/catalogue') data = { available: true, release: { releaseId: 'rfrontend', cutoff, sourceBatchIds: ['synthetic-batch'] } };
      else if (url.pathname === '/api/reporting/reports') {
        if (hold) await new Promise(resolve => pending.push(resolve));
        if (failReport) { status = 500; message = 'Synthetic report failure'; failReport = false; }
        else {
          const req = payload.request;
          const totals = req.metrics.map(metricId => ({ metricId, group: null, value: metricId === 'call_attempts' ? '1000' : metricId === 'collected_value' ? '18014398509481989.980000002' : '0', numerator: metricId === 'call_attempts' ? '1000' : metricId === 'collected_value' ? '18014398509481989.980000002' : '0', denominator: null, unit: metricId.endsWith('_value') ? 'currency' : 'records', calculationStatus: 'CHECKED', completeness: 'COMPLETE', reason: null }));
          data = { executionId: 'frontend-fixed-snapshot', token: 'test-only-token', request: req, releaseId: 'rfrontend', metricVersion: 'cx.metrics.2.0.1', modelVersion: 'cx.facts.2.0.0', generatedAt: cutoff, releaseCutoff: cutoff, sourceBatchIds: ['synthetic-batch'], queryJobId: 'synthetic-job', groups: groups.filter(row => req.metrics.includes(row.metricId)), totals, validation: [], sources: [] };
        }
      } else if (url.pathname === '/api/reporting/evidence') {
        lastEvidence = payload;
        data = { executionId: 'frontend-fixed-snapshot', metricId: payload.metricId, group: payload.group, rowCount: 1, rows: [{ group: payload.group, amount: '9007199254740993.000000001' }], truncated: false };
      }
      // A cancelled request is expected to detach from its browser route.
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? { success: true, data } : { success: false, error: message }) }).catch(error => {
        if (!String(error).match(/closed|aborted|Invalid InterceptionId/i)) throw error;
      });
    });
    try {
      await page.goto(`${base}/call-performance?filters=%7B`);
      await page.getByRole('heading', { name: 'Reporting selection needs attention', exact: true }).waitFor();
      assert.equal(count('/api/analytics/calls'), 0); checks++;
      assert.equal(count('/api/analytics/filter-options'), 0); checks++;
      await page.getByRole('button', { name: 'Reset reporting scope', exact: true }).click();
      await page.getByRole('heading', { name: 'One-Call Lead Share', exact: true }).waitFor();
      const request = requests.filter(r => r.path === '/api/analytics/calls').at(-1);
      const today = new Date().toISOString().slice(0, 10);
      assert.equal(request.params.endDate, today); checks++;
      assert.equal(request.params.startDate, new Date(Date.parse(today) - 29 * 86400000).toISOString().slice(0,10)); checks++;
      assert.equal(count('/api/analytics/filter-options'), 0); checks++;
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      const filters = page.getByRole('region', { name: 'Legacy report filters' });
      await filters.locator('.cx-multiselect').first().locator('summary').click();
      await filters.getByRole('checkbox', { name: 'Vendor A', exact: true }).waitFor();
      assert.equal(count('/api/analytics/filter-options'), 1); checks++;
      await filters.getByRole('checkbox',{name:'Vendor A',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.cx-multiselect input')?.checked===true);
      await filters.getByRole('checkbox',{name:'Vendor B',exact:true}).click();
      await page.waitForURL(url=>JSON.parse(url.searchParams.get('filters')||'{}').vendor?.values?.length===2);
      assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).vendor.values,['Vendor A','Vendor B']);checks++;
      await page.goBack();await page.waitForURL(url=>JSON.parse(url.searchParams.get('filters')||'{}').vendor?.values?.length===1);checks++;
      await page.goForward();await page.waitForURL(url=>JSON.parse(url.searchParams.get('filters')||'{}').vendor?.values?.length===2);checks++;
      await filters.getByRole('button',{name:'Clear filters',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('filters'));
      await page.waitForFunction(()=>[...document.querySelectorAll('.cx-multiselect input')].every(input=>!input.checked));
      await filters.locator('.cx-multiselect').first().evaluate(details=>{const inputs=details.querySelectorAll('input');inputs[0].click();inputs[1].click();});
      await page.waitForURL(url=>JSON.parse(url.searchParams.get('filters')||'{}').vendor?.values?.length===2);
      assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).vendor.values,['Vendor A','Vendor B']);checks++;
      await filters.getByRole('button',{name:'Clear filters',exact:true}).click();await page.waitForURL(url=>!url.searchParams.has('filters'));
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await page.getByRole('button', { name: 'Report filters', exact: true }).click();
      await filters.waitFor(); assert.equal(count('/api/analytics/filter-options'), 1); checks++;
      await filters.getByText('Validation and outcome filters', { exact: true }).click();
      await page.evaluate(() => {
        const id = document.getElementById('legacy-valid_idno'), phone = document.getElementById('legacy-phone_valid');
        id.value = 'false'; id.dispatchEvent(new Event('change', { bubbles: true }));
        phone.value = 'true'; phone.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForURL(url => { const value = JSON.parse(url.searchParams.get('filters') || '{}'); return value.valid_idno?.value === false && value.phone_valid?.value === true; });
      await page.waitForFunction(() => document.getElementById('legacy-valid_idno')?.value === 'false' && document.getElementById('legacy-phone_valid')?.value === 'true');
      assert.equal(await filters.getByRole('combobox', { name: 'Recorded National ID Validity', exact: true }).inputValue(), 'false'); checks++;
      assert.equal(await filters.getByRole('combobox', { name: 'Recorded Phone Validity', exact: true }).inputValue(), 'true'); checks++;
      failCalls = true;
      await filters.getByRole('button', { name: 'Reload results', exact: true }).click();
      await filters.getByText('Reload could not complete. Retry the affected report.', { exact: true }).waitFor(); checks++;
      assert.equal(await page.getByRole('heading', { name: 'One-Call Lead Share', exact: true }).count(), 0); checks++;
      failCalls = false;
      await filters.getByRole('button', { name: 'Reload results', exact: true }).click();
      await page.getByRole('heading', { name: 'One-Call Lead Share', exact: true }).waitFor(); checks++;

      await page.goto(`${base}/reports`);
      await page.getByText('Available release: rfrontend', { exact: true }).waitFor();
      await page.getByLabel('From (UTC)', { exact: true }).fill('2026-08-01');
      await page.getByLabel('Through (UTC)', { exact: true }).fill('2026-08-31');
      const create = page.getByRole('button', { name: 'Create snapshot-bound report', exact: true });
      await page.getByLabel('Observation cutoff', { exact: true }).fill('2026-10-01T00:00:00Z');
      await page.locator('#report-preflight').filter({ hasText: /Observation cutoff is later than the available release/ }).waitFor();
      assert.equal(await create.isDisabled(), true); checks++;
      assert.equal(count('/api/reporting/reports'), 0); checks++;
      await page.getByLabel('Observation cutoff', { exact: true }).fill(cutoff);
      await page.getByLabel('Date basis', { exact: true }).selectOption('event_date');
      await page.getByText(/your selection has not been changed/).waitFor();
      assert.equal(await page.getByLabel('Delivery-to-Dial Rate', { exact: true }).isChecked(), true); checks++;
      await page.getByLabel('Date basis', { exact: true }).selectOption('capture_cohort');
      for (const checkbox of await page.locator('.cx-metric-choice input').all()) {
        const label = await checkbox.locator('..').textContent();
        await checkbox.setChecked(label === 'Call Attempts' || label === 'Collected Amount');
      }
      await create.click();
      const table = page.getByRole('table', { name: 'Report breakdown rows', exact: true });
      await table.waitFor();
      await page.getByText('Showing 1–25 of 1,000 matching rows.', { exact: false }).waitFor();
      assert.equal(await table.locator('tbody tr').count(), 25); checks++;
      assert.equal(await page.getByTestId('metric-collected_value').getByTestId('metric-value').textContent(), 'ZAR 18,014,398,509,481,989.980000002'); checks++;
      await page.getByRole('button', { name: 'Next breakdown page', exact: true }).click();
      await page.getByText('Showing 26–50 of 1,000 matching rows.', { exact: false }).waitFor(); checks++;
      await page.getByRole('searchbox', { name: 'Search breakdown', exact: true }).fill('Segment 0499');
      await page.getByText('Showing 1–2 of 2 matching rows.', { exact: false }).waitFor();
      assert.equal(await table.locator('tbody tr').count(), 2); checks++;
      await page.getByRole('button', { name: 'Clear table filters', exact: true }).click();
      await page.getByLabel('Metric in breakdown', { exact: true }).selectOption('collected_value');
      await page.getByLabel('Order breakdown', { exact: true }).selectOption('value_desc');
      await table.getByRole('cell', { name: 'ZAR 9,007,199,254,740,993.000000001', exact: true }).waitFor();
      assert.equal(await table.locator('tbody tr').first().locator('td').first().textContent(), 'Segment 0001'); checks++;
      await page.getByLabel('Rows per page', { exact: true }).selectOption('50');
      await page.getByText('Showing 1–50 of 500 matching rows.', { exact: false }).waitFor();
      assert.equal(await table.locator('tbody tr').count(), 50); checks++;
      assert.equal(count('/api/reporting/reports'), 1); checks++;
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export exact report JSON', exact: true }).click()]);
      const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
      assert.equal(exported.groups.length, 1000); checks++;
      assert.equal(Object.hasOwn(exported, 'token'), false); checks++;
      await table.locator('tbody tr').first().getByRole('button').click();
      await page.getByRole('heading', { name: 'Evidence: Collected Amount', exact: true }).waitFor();
      assert.equal(lastEvidence.metricId, 'collected_value'); checks++;
      assert.equal(lastEvidence.group, 'Segment 0001'); checks++;
      await page.getByRole('region', { name: 'Report breakdown', exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
      await page.screenshot({ path: `verification/optimised-breakdown-${viewport.width}.png`, fullPage: true });
      measurements.push({ viewport, returnedRows: 1000, initialRenderedRows: 25, selectedPageSize: 50, reportRequestsDuringTableBrowsing: count('/api/reporting/reports'), retainedExportRows: exported.groups.length });
      await page.getByRole('searchbox', { name: 'Search breakdown', exact: true }).fill('no match exists');
      await page.getByText('No breakdown rows match these table filters.', { exact: false }).waitFor(); checks++;
      await page.getByRole('button', { name: 'Clear table filters', exact: true }).first().click();
      await page.getByText('Showing 1–50 of 1,000 matching rows.', { exact: false }).waitFor(); checks++;
      hold = true;
      await page.getByRole('button', { name: 'Revalidate and replay', exact: true }).click();
      await page.getByRole('button', { name: 'Cancel request', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Export exact report JSON', exact: true }).count(), 0); checks++;
      assert.equal(await page.getByRole('region', { name: 'Report results', exact: true }).count(), 0); checks++;
      await page.getByRole('button', { name: 'Cancel request', exact: true }).click();
      await page.getByText('Request cancelled. Your reporting scope is unchanged.', { exact: true }).waitFor(); checks++;
      hold = false; pending.splice(0).forEach(resolve => resolve());
      await create.click(); await table.waitFor(); checks++;
      failReport = true;
      await page.getByRole('button', { name: 'Revalidate and replay', exact: true }).click();
      await page.getByText('Synthetic report failure', { exact: true }).waitFor();
      assert.equal(await page.getByRole('region', { name: 'Report results', exact: true }).count(), 0); checks++;
      await page.getByRole('button', { name: 'Retry report', exact: true }).click();
      await table.waitFor(); checks++;
      assert.equal(await page.locator('vite-error-overlay').count(), 0); checks++;
      assert.deepEqual(errors, []); checks++;
    } catch (error) {
      await page.screenshot({ path: `verification/optimisation-failure-${viewport.width}.png`, fullPage: true });
      fs.writeFileSync(`verification/optimisation-failure-${viewport.width}.json`, JSON.stringify({ message: String(error), stack: error.stack, requests, accessibility: await page.locator('body').ariaSnapshot() }, null, 2));
      throw error;
    } finally { pending.splice(0).forEach(resolve => resolve()); await context.close(); }
  }
  fs.writeFileSync('verification/optimisation.json', JSON.stringify({ checks, passed: checks, source: 'Synthetic API fixtures', liveWarehouseTested: false, measurements }, null, 2));
  return checks;
}
