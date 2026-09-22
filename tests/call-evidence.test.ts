import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCallEvidence, type CallEventEvidence, type HlcCallSnapshotEvidence } from '../contracts/callEvidence';
import { divideExactDecimal, exactDecimal, exactPercent } from '../contracts/exactDecimal';
import { configurationRequired, querySection } from '../server/bigquery/sectionResults';
import fs from 'node:fs';

const event = (eventId: string, leadId = 'lead-1', vendor = 'Vendor A', rpc: boolean | null = false): CallEventEvidence => ({ eventId, leadId, vendor, rpc });
const snapshot = (recordId: string, leadId = 'lead-1', vendor = 'Vendor A', totalCallsCounter: string | null = '99', rpcFlag: boolean | null = false, sale = false): HlcCallSnapshotEvidence => ({ recordId, leadId, vendor, totalCallsCounter, rpcFlag, sale });

test('one lead and vendor with one HLC row counts only distinct observed call events', () => {
  const [row] = aggregateCallEvidence([event('call-1'), event('call-2')], [snapshot('hlc-1')]);
  assert.equal(row.observedCalls, '2');
  assert.equal(row.legacySnapshotRows, '1');
});

test('repeated HLC rows cannot fan out the lead/vendor call count', () => {
  const calls = [event('call-1'), event('call-2'), event('call-3')];
  const one = aggregateCallEvidence(calls, [snapshot('hlc-1')])[0];
  const repeated = aggregateCallEvidence(calls, [snapshot('hlc-1'), snapshot('hlc-2'), snapshot('hlc-3')])[0];
  assert.equal(one.observedCalls, '3');
  assert.equal(repeated.observedCalls, '3');
  assert.equal(repeated.legacySnapshotRows, '3');
});

test('one lead with multiple vendors keeps independent event populations', () => {
  const rows = aggregateCallEvidence([event('a-1'), event('a-2'), event('b-1', 'lead-1', 'Vendor B')], [snapshot('a-hlc'), snapshot('b-hlc', 'lead-1', 'Vendor B')]);
  assert.deepEqual(rows.map(row => [row.vendor, row.observedCalls]), [['Vendor A', '2'], ['Vendor B', '1']]);
});

test('independent transactions and snapshot counters never masquerade as call events', () => {
  const rows = aggregateCallEvidence([], [snapshot('tx-1', 'lead-1', 'Vendor A', '7'), snapshot('tx-2', 'lead-2', 'Vendor A', '12')]);
  assert.deepEqual(rows.map(row => row.observedCalls), ['0', '0']);
  assert.ok(rows.every(row => row.legacyCounterAvailable));
});

test('sale without an observed RPC or call remains contact unknown', () => {
  const [row] = aggregateCallEvidence([], [snapshot('sale', 'lead-1', 'Vendor A', null, null, true)]);
  assert.equal(row.observedCalls, '0');
  assert.equal(row.observedRpc, null);
  assert.equal(row.contactUnknown, true);
});

test('event-level RPC is observed independently of sale status', () => {
  const [row] = aggregateCallEvidence([event('call-1', 'lead-1', 'Vendor A', true)], [snapshot('no-sale', 'lead-1', 'Vendor A', null, false, false)]);
  assert.equal(row.observedRpc, true);
  assert.equal(row.contactUnknown, false);
});

test('exact decimal helpers reject unsafe numeric JSON and retain warehouse precision', () => {
  assert.equal(exactDecimal(9007199254740992), null);
  assert.equal(exactDecimal({ value: '9007199254740993.125' }), '9007199254740993.125');
  assert.equal(divideExactDecimal('9007199254740993', '3', 3), '3002399751580331.000');
  assert.equal(exactPercent('37', '200', 2), '18.50');
  assert.equal(exactPercent('-0.05', '1', 2), '-5.00');
  assert.equal(exactPercent('0', '0', 2), null);
});

test('optional section failures stay unavailable rather than becoming an empty measured section', async () => {
  const failed = await querySection(async () => { throw new Error('warehouse unavailable'); });
  assert.deepEqual(failed, { status: 'QUERY_FAILED', data: null, reason: 'Unavailable — this section could not be calculated.' });
  assert.deepEqual(await querySection(async () => []), { status: 'AVAILABLE', data: [], reason: null });
  assert.equal(configurationRequired('Approved SLA threshold required.').status, 'CONFIGURATION_REQUIRED');
});

test('backend query code has no failed-query-to-empty-array fallback', () => {
  const source = fs.readFileSync(new URL('../server/bigquery/queries.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.catch\s*\([^)]*=>\s*\[\[/);
  assert.doesNotMatch(source, /return\s+\[\[\]\]/);
});

test('Explore and driver APIs keep warehouse measures as exact decimal strings', () => {
  const source = fs.readFileSync(new URL('../server/bigquery/semantic_engine.ts', import.meta.url), 'utf8');
  assert.match(source, /CAST\(COUNT\(\*\) AS STRING\) AS sample_size/);
  assert.match(source, /numericEncoding: 'exact-decimal-string'/);
  assert.doesNotMatch(source, /Number\(r\.(?:sample_size|called|sales|revenue|value)\)/);
  assert.doesNotMatch(source, /parseFloat\(/);
});
