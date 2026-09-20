import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScope, validateFilters, buildLeadWhere, boundedInteger, RequestError } from '../server/bigquery/filters';
import { comparison, overallStatus, safeCsvCell, maturityValue, finiteOrNull, validTimestampSql } from '../server/bigquery/integrity';
import { resolvePrincipal, requireTenant } from '../server/securityPolicy';
import { withAnalyticsScope, vendorScope } from '../server/analyticsContext';

test('default tenant alias is explicit', () => assert.equal(validateScope({ clientId: 'default' }).clientId, 'default_tenant'));
for (const invalid of ['2026-02-30', '2026-13-01', "2026-01-01' OR TRUE", ['2026-01-01'], 'yesterday']) {
  test(`reject invalid date ${JSON.stringify(invalid)}`, () => assert.throws(() => validateScope({ startDate: invalid }), RequestError));
}
test('reject reversed dates', () => assert.throws(() => validateScope({ startDate: '2026-09-20', endDate: '2026-08-01' }), RequestError));
test('accept leap day', () => assert.equal(validateScope({ startDate: '2028-02-29' }).startDate, '2028-02-29'));
test('reject malformed filter JSON', () => assert.throws(() => validateFilters('{'), RequestError));
test('reject unknown SQL identifiers', () => assert.throws(() => validateFilters({ 'source) OR TRUE --': { operator: 'equals', value: 'x' } }), RequestError));
test('reject prototype identifiers', () => assert.throws(() => validateFilters(JSON.parse('{"__proto__":{"operator":"equals","value":"x"}}')), RequestError));
test('reject string boolean', () => assert.throws(() => validateFilters({ sale: { operator: 'equals', value: 'true' } }), RequestError));
test('reject unknown operator', () => assert.throws(() => validateFilters({ source: { operator: 'sql', value: 'x' } }), RequestError));
test('reject empty IN', () => assert.throws(() => validateFilters({ vendor: { operator: 'in', values: [] } }), RequestError));
test('reject reversed numeric range', () => assert.throws(() => validateFilters({ calls: { operator: 'between', min: 10, max: 2 } }), RequestError));
test('reject non-finite numeric value', () => assert.throws(() => validateFilters({ calls: { operator: 'equals', value: Infinity } }), RequestError));
test('deduplicate IN values', () => assert.deepEqual(validateFilters({ vendor: { operator: 'in', values: ['MTN', 'MTN'] } }).vendor.values, ['MTN']));
test('parameterise values rather than interpolate SQL', () => {
  const value = "x' OR TRUE --";
  const result = buildLeadWhere({ clientId: 'default_tenant', filters: { source: { operator: 'equals', value } } });
  assert.ok(!result.sql.includes(value)); assert.equal(result.queryParams.filter_0, value);
});
test('map sale to lead outcome', () => assert.match(buildLeadWhere({ clientId: 'default_tenant', filters: { sale: { operator: 'equals', value: true } } }).sql, /has_sale = @filter_0/));
test('vendor filter uses correlated transaction evidence', () => assert.match(buildLeadWhere({ clientId: 'default_tenant', filters: { vendor: { operator: 'in', values: ['MTN'] } } }).sql, /EXISTS.*vw_lead_vendor_transactions/));
for (const invalid of [-1, '20; DROP TABLE x', '2.5', 10001, ['3']]) test(`reject invalid pagination ${JSON.stringify(invalid)}`, () => assert.throws(() => boundedInteger(invalid, 100, 10000), RequestError));
test('zero pagination offset is preserved', () => assert.equal(boundedInteger(0, 100, 10000), 0));
test('zero is not replaced by a semantic count', () => assert.equal(comparison(0, 100).status, 'FAIL'));
test('missing raw value cannot pass', () => assert.equal(comparison(null, 100).status, 'NOT_VERIFIED'));
test('equal independent zero counts can pass', () => assert.equal(comparison(0, 0).status, 'PASS'));
test('failure propagates to overall status', () => assert.equal(overallStatus(['PASS', 'FAIL']), 'FAIL'));
test('absence of checks is not a pass', () => assert.equal(overallStatus([]), 'NOT_VERIFIED'));
test('unobserved maturity remains null', () => assert.equal(maturityValue(99, '2026-09-19', '2026-09-20', 30), null));
test('observed zero maturity remains zero', () => assert.equal(maturityValue(0, '2026-08-01', '2026-09-20', 30), 0));
test('blank numeric data remains null', () => assert.equal(finiteOrNull('  '), null));
for (const formula of ['=SUM(A1)', '+cmd', '-cmd', '@SUM(A1)', '\t=cmd', '   =cmd']) test(`neutralise CSV formula ${JSON.stringify(formula)}`, () => assert.equal(safeCsvCell(formula), `'${formula}`));
test('numeric negative value stays numeric', () => assert.equal(safeCsvCell(-3), -3));
test('timestamps use SAFE_CAST and sentinel exclusion', () => { const sql = validTimestampSql('l.fetched'); assert.match(sql, /SAFE_CAST/); assert.match(sql, /1900\|1970/); });
const email = 'user@example.com', claims = { sub: 'stable-user', email };
const policy = JSON.stringify({ [email]: { tenants: ['default_tenant'], role: 'viewer' } });
test('deny missing access policy', () => assert.throws(() => resolvePrincipal(claims, undefined), RequestError));
test('deny unlisted account', () => assert.throws(() => resolvePrincipal({ sub: 'other', email: 'other@example.com' }, policy), RequestError));
test('preserve explicit tenant grant', () => assert.deepEqual(resolvePrincipal(claims, policy).tenants, ['default_tenant']));
test('deny other tenant', () => assert.throws(() => requireTenant(resolvePrincipal(claims, policy), 'other'), RequestError));
test('domain grant requires verified hosted-domain claim', () => assert.throws(() => resolvePrincipal(claims, JSON.stringify({ '@example.com': { tenants: ['default_tenant'], role: 'viewer' } })), RequestError));
test('deny wildcard tenant grant', () => assert.throws(() => resolvePrincipal(claims, JSON.stringify({ [email]: { tenants: ['*'], role: 'admin' } })), RequestError));
test('request-local vendor isolation', async () => {
  const run = (vendor: string, wait: number) => withAnalyticsScope({ clientId: 'default_tenant', filters: { vendor: { operator: 'in', values: [vendor] } } }, async () => {
    await new Promise(resolve => setTimeout(resolve, wait)); return vendorScope().params.scope_vendor_0;
  });
  assert.deepEqual(await Promise.all([run('MTN', 8), run('Mondo', 1)]), ['MTN', 'Mondo']); assert.equal(vendorScope().sql, '');
});
