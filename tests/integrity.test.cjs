const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const root = process.env.CX_COMPILED_TEST_ROOT;
assert.ok(root, 'Run with npm test so the actual TypeScript modules are compiled');
let handler = async () => [], calls = [];
class WarehouseStub {
  async query(options) { calls.push(options); return [await handler(options)]; }
  async createQueryJob(options) { calls.push(options); return [{ metadata: { statistics: {} }, getQueryResults: async () => [await handler(options)] }]; }
}
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) { return id === '@google-cloud/bigquery' ? { BigQuery: WarehouseStub } : originalLoad.call(this, id, parent, isMain); };
const load = name => require(path.join(root, name));
const filters = load('server/bigquery/filters.js');
const integrity = load('server/bigquery/integrity.js');
const context = load('server/analyticsContext.js');
const policy = load('server/securityPolicy.js');
const auth = load('server/security.js');
const config = load('server/bigquery/config.js');
const views = load('server/bigquery/views.js');
const client = load('server/bigquery/client.js');
const exportsModule = load('server/bigquery/export.js');
const engine = load('server/bigquery/semantic_engine.js');
const audited = load('server/bigquery/auditedQueries.js');
const scope = { clientId: 'default_tenant', startDate: '2026-08-01', endDate: '2026-08-31', filters: {} };
const vendorScope = { ...scope, filters: { vendor: { operator: 'in', values: ['MTN'] } } };
function reset(fn = async () => []) { calls = []; handler = fn; delete process.env.BIGQUERY_MEDIA_SPEND_FIELD; delete process.env.BIGQUERY_MAX_BYTES_BILLED; }
const inScope = (s, fn) => context.withAnalyticsScope(s, fn);

test('calendar dates reject invalid days and reversed windows', () => {
  assert.equal(filters.validateDate('2024-02-29', 'date'), '2024-02-29');
  for (const date of ['2026-02-29', '2026-13-01', 'not-a-date']) assert.throws(() => filters.validateDate(date, 'date'));
  assert.throws(() => filters.validateScope({ startDate: '2026-09-02', endDate: '2026-09-01' }));
});
test('filter identifiers and operators are allowlisted', () => {
  for (const raw of ['{"__proto__":{"operator":"equals","value":"x"}}', { 'source OR TRUE': { operator: 'equals', value: 'x' } }, { calls: { operator: 'execute', value: 1 } }]) assert.throws(() => filters.validateFilters(raw));
});
test('filter types and numeric ranges are enforced', () => {
  assert.throws(() => filters.validateFilters({ calls: { operator: 'equals', value: '1' } }));
  assert.throws(() => filters.validateFilters({ sale: { operator: 'equals', value: 'true' } }));
  assert.throws(() => filters.validateFilters({ calls: { operator: 'between', min: 4, max: 1 } }));
  assert.throws(() => filters.validateFilters({ calls: { operator: 'equals', value: Infinity } }));
});
test('SQL filter values are bound, not interpolated', () => {
  const payload = "x' OR TRUE --";
  const result = filters.buildLeadWhere({ ...scope, filters: { source: { operator: 'in', values: [payload] }, activated: { operator: 'equals', value: true } } });
  assert.ok(!result.sql.includes(payload)); assert.ok(result.sql.includes('has_activation = @')); assert.ok(Object.values(result.queryParams).includes(payload));
});
test('filter count and value limits reject unbounded queries', () => {
  assert.throws(() => filters.validateFilters({ vendor: { operator: 'in', values: Array(51).fill('MTN') } }));
  assert.throws(() => filters.boundedInteger('100001', 100, 1000));
  assert.throws(() => filters.boundedInteger('1e3', 100, 1000));
});
test('unknown tenant is rejected, legacy default is explicit', () => {
  assert.equal(config.getClientConfig('default').id, 'default_tenant');
  assert.throws(() => config.getClientConfig('not-authorised'));
});
test('table identifiers reject interpolation characters', () => {
  assert.equal(config.tableIdentifier('project-a.dataset_a.table_a'), '`project-a.dataset_a.table_a`');
  assert.throws(() => config.tableIdentifier('p.d.t` UNION SELECT 1 --'));
});
test('missing policies fail closed', () => {
  assert.throws(() => policy.resolvePrincipal({ sub: 's', email: 'x@example.com' }, undefined), e => e.status === 503);
  assert.throws(() => policy.resolvePrincipal({ sub: 's', email: 'x@example.com' }, '{}'), e => e.status === 403);
});
test('verified identity receives only explicitly granted tenants', () => {
  const p = policy.resolvePrincipal({ sub: 's', email: 'Analyst@example.com' }, '{"analyst@example.com":{"tenants":["default_tenant"],"role":"viewer"}}');
  assert.equal(p.role, 'viewer'); assert.doesNotThrow(() => policy.requireTenant(p, 'default_tenant'));
  assert.throws(() => policy.requireTenant(p, 'other_tenant'), e => e.status === 403);
});
test('domain grant requires a matching hosted-domain claim', () => {
  const text = '{"@example.com":{"tenants":["default_tenant"],"role":"viewer"}}';
  assert.throws(() => policy.resolvePrincipal({ sub: 's', email: 'x@example.com' }, text));
  assert.equal(policy.resolvePrincipal({ sub: 's', email: 'x@example.com', hd: 'example.com' }, text).role, 'viewer');
});
test('wildcard and malformed tenant grants are rejected', () => {
  assert.throws(() => policy.resolvePrincipal({ sub: 's', email: 'x@example.com' }, '{"x@example.com":{"tenants":["*"],"role":"admin"}}'));
});
test('authentication rejects unsigned headers and invalid signatures', async () => {
  process.env.IAP_AUDIENCE = '/projects/example/global/backendServices/1';
  let verificationCalls = 0, error;
  const middleware = auth.authenticate(async () => { verificationCalls++; throw new Error('bad JWT'); });
  await middleware({ get: () => undefined }, { locals: {} }, e => { error = e; });
  assert.equal(error.status, 401); assert.equal(verificationCalls, 0);
  await middleware({ get: () => 'bad-signature' }, { locals: {} }, e => { error = e; });
  assert.equal(error.status, 401); assert.equal(verificationCalls, 1);
  delete process.env.IAP_AUDIENCE;
});
test('admin route rejects viewers', () => {
  let error; auth.requireAdmin({}, { locals: { principal: { role: 'viewer' } } }, e => { error = e; }); assert.equal(error.status, 403);
});
test('concurrent analytical requests cannot share vendor filters', async () => {
  const result = await Promise.all(['MTN', 'Mondo'].map(v => inScope({ ...scope, filters: { vendor: { operator: 'in', values: [v] } } }, async () => { await new Promise(r => setTimeout(r, v === 'MTN' ? 8 : 1)); return context.vendorScope().params.scope_vendor_0; })));
  assert.deepEqual(result, ['MTN', 'Mondo']); assert.equal(context.currentAnalyticsScope(), undefined);
});
test('query budget enforces configured upper bound', () => {
  reset(); process.env.BIGQUERY_MAX_BYTES_BILLED = '12345';
  assert.equal(client.guardedQueryOptions({ query: 'SELECT 1', maximumBytesBilled: '99999' }).maximumBytesBilled, '12345');
  assert.equal(client.guardedQueryOptions({ query: 'SELECT 1', maximumBytesBilled: '100' }).maximumBytesBilled, '100');
  process.env.BIGQUERY_MAX_BYTES_BILLED = 'bad'; assert.throws(() => client.guardedQueryOptions({ query: 'SELECT 1' })); reset();
});
test('request vendor bindings cannot be overwritten by caller query params', () => {
  inScope(vendorScope, () => assert.equal(client.guardedQueryOptions({ query: 'SELECT 1', params: { scope_vendor_0: 'Mondo' } }).params.scope_vendor_0, 'MTN'));
});
test('activation SQL evaluates HLC evidence even without external match', () => {
  const sql = views.getBaseSemanticLayer(config.getClientConfig('default'));
  assert.match(sql, /a\.activation_date IS NOT NULL OR t\.activation_timestamp IS NOT NULL/);
  assert.doesNotMatch(sql, /COALESCE\(a\.activation_date IS NOT NULL/);
});
test('call-count SQL anchors each vendor summary once and does not fabricate calls', () => {
  const sql = views.getBaseSemanticLayer(config.getClientConfig('default'));
  assert.match(sql, /IF\(t\.vendor_row_number = 1, COALESCE\(v\.total_calls/);
  assert.doesNotMatch(sql, /GREATEST\(.*total_calls/);
  assert.doesNotMatch(sql, /COALESCE\(.*sale_timestamp, t\.delivery_timestamp, t\.capture_timestamp/);
});
test('vendor filtering occurs before the lead roll-up', () => {
  inScope(vendorScope, () => { const sql = views.getBaseSemanticLayer(config.getClientConfig('default'));
    assert.ok(sql.indexOf('WHERE vendor IN (@scope_vendor_0)') < sql.indexOf('), lead_rollup AS'));
    assert.ok(!sql.includes("WHERE vendor IN ('MTN')"));
  });
});
test('timestamp normalisation rejects sentinels and uses safe conversion', () => {
  const sql = integrity.validTimestampSql('fetched'); assert.ok(sql.includes('1900|1970')); assert.ok(sql.includes('SAFE_CAST')); assert.ok(sql.includes('NULLIF'));
});
test('reconciliation preserves zero and propagates failure', () => {
  assert.equal(integrity.comparison(0, 100).status, 'FAIL');
  assert.equal(integrity.comparison(0, 0).status, 'PASS');
  assert.equal(integrity.comparison(null, 100).status, 'NOT_VERIFIED');
  assert.equal(integrity.overallStatus(['PASS', 'FAIL', 'NOT_VERIFIED']), 'FAIL');
  assert.equal(integrity.overallStatus(['PASS', 'NOT_VERIFIED']), 'NOT_VERIFIED');
});
test('cohort maturity keeps unobservable intervals missing', () => {
  assert.equal(integrity.maturityValue(42, '2026-09-19', '2026-09-20', 30), null);
  assert.equal(integrity.maturityValue(0, '2026-08-01', '2026-09-20', 30), 0);
});
test('previous period is equal length and immediately preceding', () => {
  assert.deepEqual(engine.previousPeriod('2026-09-01', '2026-09-20'), { days: 20, startDate: '2026-08-12', endDate: '2026-08-31' });
  assert.deepEqual(engine.previousPeriod('2026-01-01', '2026-01-01'), { days: 1, startDate: '2025-12-31', endDate: '2025-12-31' });
});
test('driver queries apply the same filters to both periods', async () => {
  reset(async () => [{ segment: 'Source A', val: 3, volume: 10 }]);
  const result = await inScope(vendorScope, () => engine.generateDriverInsights({ ...vendorScope, metric: 'sales', dimension: 'source' }));
  assert.equal(calls.length, 2);
  for (const call of calls) { assert.equal(call.params.scope_vendor_0, 'MTN'); assert.ok(call.query.includes('EXISTS')); }
  assert.notEqual(calls[0].params.startDate, calls[1].params.startDate); assert.equal(result.data[0].change, 0);
});
test('dynamic metric names cannot inject expressions', async () => {
  reset(); await assert.rejects(engine.executeDynamicQuery({ ...scope, metric: 'COUNT(*) FROM secret', dimension: 'source' })); assert.equal(calls.length, 0);
});
test('dynamic query accepts structured filters and preserves null ratios', async () => {
  reset(async () => [{ dim1: 'A', value: null, sample_size: 0, full_leads: 0, full_delivered: 0, full_called: 0, full_rpcs: 0, full_sales: 0, full_billable_sales: 0, full_activations: 0 }]);
  const result = await inScope(vendorScope, () => engine.executeDynamicQuery({ ...vendorScope, metric: 'sale_rate', dimension: 'source' }));
  assert.equal(result.data[0].value, null); assert.equal(result.data[0].fullFunnel.saleRate, null); assert.equal(calls[0].params.scope_vendor_0, 'MTN');
});
test('outcome cohort SQL uses actual event dates, not first call date', async () => {
  reset(); await inScope(scope, () => audited.getCohortStats({ ...scope, metricType: 'sale' }));
  assert.match(calls[0].query, /DATE_DIFF\(DATE\(sale_timestamp\), capture_date, DAY\)/);
  assert.doesNotMatch(calls[0].query, /DATE_DIFF\(DATE\(first_call_timestamp\), capture_date, DAY\)/);
});
test('revenue maturation is explicitly unavailable without an event ledger', async () => {
  reset(async () => [{ cohort: '2026-08', cohortEnd: '2026-08-31', leads: 10, d30: null }]);
  const result = await inScope(scope, () => audited.getCohortStats({ ...scope, cohortType: 'monthly', metricType: 'revenue' }));
  assert.equal(result[0].metrics.d30, null); assert.match(calls[0].query, /CAST\(NULL AS FLOAT64\) AS d30/);
});
test('overview uses null costs when an actual-spend mapping is missing', async () => {
  reset(async options => (/GROUP BY (date|source) ORDER BY/.test(options.query)) ? [] : [{ leads: 10, called: 5, sales: 2, activations: 1, revenue: 100 }]);
  const result = await inScope(scope, () => audited.getOverviewStats(scope));
  assert.equal(result.spend, null); assert.equal(result.roas, null); assert.equal(result.leadToSaleRate, 20); assert.equal(result.saleRate, 40); assert.equal(result.activationRate, 50);
  assert.equal(result.dataReadiness.status, 'NOT_VERIFIED');
});
test('filtered acquisition never combines global spend with selected outcomes', async () => {
  reset(async () => [{ leads: 10 }]); process.env.BIGQUERY_MEDIA_SPEND_FIELD = 'spend';
  const result = await inScope(vendorScope, () => audited.getAcquisitionStats(vendorScope));
  assert.equal(result.summary.spend, null); assert.match(result.unavailableReason, /cannot yet be attributed/); assert.equal(calls.length, 1); reset();
});
test('raw zero is not overwritten by a semantic result during reconciliation', async () => {
  reset(async options => options.query.startsWith('SELECT COUNT(DISTINCT') ? [{ leads: 0 }] : [{ leads: 100 }]);
  const result = await inScope(scope, () => audited.getReconciliationValidation(scope));
  assert.equal(result.metrics[0].rawBigQuery, 0); assert.equal(result.overallStatus, 'FAIL'); assert.equal(result.metrics[0].uiRendered, null);
});
test('CSV escapes formula prefixes, embedded quotes and newlines', () => {
  for (const value of ['=1+1', '+SUM(A1)', '-cmd', '@x', '  =x', '\ttext']) assert.ok(String(integrity.safeCsvCell(value)).startsWith("'"));
  assert.equal(integrity.safeCsvCell(-5), -5); assert.equal(integrity.safeCsvCell('normal'), 'normal');
  const csv = exportsModule.toCsv([{ A: 'a"b\nc', B: '=1+1' }], ['A', 'B']);
  assert.ok(csv.includes('"a""b\nc"')); assert.ok(csv.includes('"\'=1+1"'));
});
test('lead export uses real semantic columns and bounded limits', async () => {
  reset(async () => [{ 'Lead ID': '1' }, { 'Lead ID': '2' }]);
  const result = await exportsModule.exportData({ ...vendorScope, grain: 'lead', limit: 1 });
  assert.equal(result.rows.length, 1); assert.equal(result.metadata.truncated, true);
  assert.equal(calls[0].params.exportLimit, 2); assert.equal(calls[0].params.scope_vendor_0, 'MTN');
  assert.match(calls[0].query, /total_transactions AS `Transaction Count`/); assert.match(calls[0].query, /has_delivery AS `Delivered`/);
});
test('redacted raw export retains dates and vendor scope without SELECT star', async () => {
  reset(); await exportsModule.exportData({ ...vendorScope, grain: 'raw_source', limit: 10 });
  const q = calls[0]; assert.equal(q.params.startDate, scope.startDate); assert.match(q.query, /WHERE h\.vendor IN \(@scope_vendor_0\)/);
  const finalSelect = q.query.slice(q.query.lastIndexOf('selected_leads AS'));
  assert.doesNotMatch(finalSelect, /SELECT \*/); assert.doesNotMatch(finalSelect, /email|mobile|idno|address/i);
});
test('client assets and server bundle have separate output directories', () => {
  const repo = path.resolve(__dirname, '..'); const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.build, /dist\/server\/server.mjs/); assert.match(fs.readFileSync(path.join(repo, 'server.ts'), 'utf8'), /dist\/client/);
  assert.doesNotMatch(fs.readFileSync(path.join(repo, 'server.ts'), 'utf8'), /app\.use\(cors\(/);
});
