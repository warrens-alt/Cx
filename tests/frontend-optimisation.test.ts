import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLegacyFilters, defaultLegacyDates, readLegacyScope, readLegacyFilters, resetLegacyScope, writeLegacyFilter } from '../src/lib/legacyScope';
import { compareExactDecimal, indexBreakdown, pageBreakdown, selectBreakdown } from '../src/lib/breakdown';
import { formatReportValue, unavailableDateMetrics, validateReportDraft } from '../src/lib/reportPreflight';
import type { MetricResult, ReportRequest } from '../contracts/reporting';

const now = new Date('2026-09-20T18:20:00Z');
const scope: ReportRequest = { tenantId: 'default_tenant', startDate: '2026-08-01', endDate: '2026-08-31', observationCutoff: '2026-09-20T00:00:00Z', dateBasis: 'capture_cohort', grouping: 'source', currency: 'ZAR', metrics: ['fetched_leads', 'call_coverage'], filters: {} };
const row = (group: string, value: string | null, metricId = 'collected_value'): MetricResult => ({ group, value, metricId, unit: metricId === 'collected_value' ? 'currency' : 'records', numerator: value, denominator: null, calculationStatus: value === null ? 'UNAVAILABLE' : 'CHECKED', completeness: 'COMPLETE', reason: null });

test('implicit legacy dates are the last 30 UTC days, not August 2026', () => {
  assert.deepEqual(defaultLegacyDates(now), { startDate: '2026-08-22', endDate: '2026-09-20' });
  const s = readLegacyScope(new URLSearchParams(), now);
  assert.equal(s.startDate, '2026-08-22'); assert.equal(s.endDate, '2026-09-20');
});
test('an explicit end date anchors missing start to its own 30-day window', () => {
  const s = readLegacyScope(new URLSearchParams('endDate=2024-03-01'), now);
  assert.equal(s.startDate, '2024-02-01'); assert.equal(s.endDate, '2024-03-01');
});
test('explicit dates and false/zero selections are preserved', () => {
  const p = new URLSearchParams({ startDate: '2026-07-01', endDate: '2026-07-31', filters: JSON.stringify({ calls: { operator: 'equals', value: 0 }, valid_idno: { operator: 'equals', value: false } }) });
  const s = readLegacyScope(p, now);
  assert.equal(s.startDate, '2026-07-01'); assert.equal(s.filters.calls.value, 0); assert.equal(s.filters.valid_idno.value, false);
});
for (const raw of ['{', 'null', '[]', '{"x":{"operator":"equals","value":1}}', '{"calls":{"operator":"equals","value":"1"}}']) {
  test(`invalid filter URL fails explicitly: ${raw}`, () => assert.throws(() => readLegacyScope(new URLSearchParams({ filters: raw }), now)));
}
test('repeated and conflicting URL selections do not silently pick a population', () => {
  assert.throws(() => readLegacyScope(new URLSearchParams('vendor=A&vendor=B'), now));
  const p = new URLSearchParams({ vendor: 'A', filters: '{"vendor":{"operator":"in","values":["B"]}}' });
  assert.throws(() => readLegacyScope(p, now));
});
test('matching legacy aliases can be migrated without changing selected vendors', () => {
  const p = new URLSearchParams({ vendor: 'B,A', filters: '{"vendor":{"operator":"in","values":["A","B"]}}' });
  assert.deepEqual(readLegacyFilters(p).vendor.values, ['A', 'B']);
});
test('legacy medium is preserved and removed by clear alongside source and vendor', () => {
  const p = new URLSearchParams('source=Web&vendor=A&medium=Paid&tab=calls');
  assert.equal(readLegacyFilters(p).medium.values![0], 'Paid');
  assert.equal(clearLegacyFilters(p).toString(), 'tab=calls');
  assert.equal(p.get('medium'), 'Paid', 'the original URL is not mutated');
});
test('sequential scope edits retain earlier conditions and unrelated URL state', () => {
  const one = writeLegacyFilter(new URLSearchParams('medium=Paid&tab=one'), 'calls', { operator: 'equals', value: 0 });
  const two = writeLegacyFilter(one, 'valid_idno', { operator: 'equals', value: false });
  const three = writeLegacyFilter(two, 'phone_valid', { operator: 'equals', value: true });
  const four = writeLegacyFilter(three, 'calls', null);
  assert.equal(four.get('tab'), 'one'); assert.equal(four.has('medium'), false);
  assert.deepEqual({ ...readLegacyFilters(four) }, { medium: { operator: 'in', values: ['Paid'] }, valid_idno: { operator: 'equals', value: false }, phone_valid: { operator: 'equals', value: true } });
});
test('invalid dates and reversed or excessive reporting windows are rejected', () => {
  for (const params of ['startDate=2026-02-30', 'startDate=2026-10-01&endDate=2026-09-01', 'startDate=2020-01-01&endDate=2026-09-01']) assert.throws(() => readLegacyScope(new URLSearchParams(params), now));
});
test('explicit reset recovers a corrupt URL without losing unrelated navigation state', () => {
  const next = resetLegacyScope(new URLSearchParams('filters=%7B&startDate=bad&endDate=bad&tab=one'), now);
  assert.equal(next.get('tab'), 'one'); assert.doesNotThrow(() => readLegacyScope(next, now)); assert.equal(next.has('filters'), false);
});
test('decimal comparison preserves integers beyond JavaScript safe range', () => {
  assert.equal(compareExactDecimal('9007199254740993', '9007199254740992'), 1);
  assert.equal(compareExactDecimal('999999999999999999999999999.000000001', '999999999999999999999999999.000000002'), -1);
});
test('decimal ordering handles signed values, fractional precision and equivalent zero', () => {
  assert.equal(compareExactDecimal('-0.000000001', '0'), -1);
  assert.equal(compareExactDecimal('-100.25', '-100.24'), -1);
  assert.equal(compareExactDecimal('-0.000', '0.0'), 0);
  assert.equal(compareExactDecimal('0001.2500', '+1.25'), 0);
  assert.throws(() => compareExactDecimal('NaN', '0'));
});
test('local search and metric filter preserve rows and do not change totals', () => {
  const rows = [row('Vendor B', '0.29'), row('Vendor A', '100'), row('Vendor A', '2', 'call_attempts')];
  const copy = JSON.stringify(rows);
  const selected = selectBreakdown(indexBreakdown(rows), 'vendor a', 'collected_value', 'group_asc');
  assert.equal(selected.length, 1); assert.equal(selected[0].row.value, '100'); assert.equal(JSON.stringify(rows), copy);
});
test('value sort stays within one metric and leaves unavailable values last', () => {
  const rows = [row('A', '9007199254740992.01'), row('B', '9007199254740993.01'), row('C', null), row('D', '-0.01')];
  const index = indexBreakdown(rows);
  assert.deepEqual(selectBreakdown(index, '', 'collected_value', 'value_desc').map(x => x.row.group), ['B', 'A', 'D', 'C']);
  assert.deepEqual(selectBreakdown(index, '', 'collected_value', 'value_asc').map(x => x.row.group), ['D', 'A', 'B', 'C']);
  assert.deepEqual(selectBreakdown(index, '', '', 'value_desc').map(x => x.row.group), ['A', 'B', 'C', 'D']);
});
test('breakdown pages cap rendered rows and clamp stale page positions', () => {
  const rows = Array.from({ length: 1000 }, (_, i) => i);
  assert.equal(pageBreakdown(rows, 1, 25).rows.length, 25);
  assert.equal(pageBreakdown(rows, 40, 25).first, 976);
  assert.equal(pageBreakdown([1, 2], 40, 25).page, 1);
  assert.equal(pageBreakdown([], 99, 25).first, 0);
  assert.equal(pageBreakdown(rows, 1, 999999).size, 25);
});
test('report preflight follows the server request contract and frozen cutoff', () => {
  assert.equal(validateReportDraft(scope, '2026-09-20T00:00:00Z'), null);
  assert.match(validateReportDraft({ ...scope, endDate: '2026-07-01' })!, /range/);
  assert.match(validateReportDraft({ ...scope, observationCutoff: '2026-10-01T00:00:00Z' }, '2026-09-20T00:00:00Z')!, /later than the available release/);
  assert.match(validateReportDraft({ ...scope, observationCutoff: '2026-09-20' })!, /UTC offset/);
  assert.match(validateReportDraft({ ...scope, metrics: [] })!, /Select supported metrics/);
});
test('unsupported date-basis feedback does not silently deselect metrics', () => {
  const draft = { ...scope, dateBasis: 'event_date' as const };
  assert.deepEqual(unavailableDateMetrics(draft), ['Delivery-to-Dial Rate']);
  assert.deepEqual(draft.metrics, ['fetched_leads', 'call_coverage']);
});
test('report formatting keeps currency precision and absence distinct from zero', () => {
  assert.equal(formatReportValue(row('A', '9007199254740993.290001'), 'ZAR'), 'ZAR 9,007,199,254,740,993.290001');
  assert.equal(formatReportValue(row('A', null), 'ZAR'), 'Unavailable');
  assert.equal(formatReportValue({ ...row('A', '0'), unit: 'percent' }, 'ZAR'), '0%');
});
