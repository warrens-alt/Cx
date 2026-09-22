import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionHealth } from '../src/lib/connectionHealth';

test('connection health accepts scalar timestamps and older SDK wrappers', () => {
  const stamp = '2026-08-01T14:03:00.000Z';
  for (const latestData of [stamp, { value: stamp }]) assert.deepEqual(connectionHealth({ status: 'Connected', latestData }), { status: 'Connected', latestData: stamp, freshnessVerified: false });
});
test('no latest timestamp is unavailable, not an invalid date or claimed freshness', () => {
  assert.equal(connectionHealth({ status: 'Connected', latestData: null }).latestData, null);
  assert.equal(connectionHealth({ status: 'Connected', latestData: undefined, freshnessVerified: true }).freshnessVerified, false);
});
test('malformed timestamps and health shapes cannot render connection success', () => {
  for (const latestData of ['bad timestamp', '', 0, {}, [], { value: 'invalid' }]) assert.throws(() => connectionHealth({ status: 'Connected', latestData }), /timestamp/);
  for (const value of [null, [], {}, { status: 'Failed' }]) assert.throws(() => connectionHealth(value), /health result/);
});
