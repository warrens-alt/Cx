import test from 'node:test';
import assert from 'node:assert/strict';
import { compareExactDecimals, exactRatioPercent } from '../src/lib/acquisition';

test('acquisition ratios are exact and rounded only once', () => {
  assert.equal(exactRatioPercent('200', '12000'), '1.67');
  assert.equal(exactRatioPercent('37', '200'), '18.50');
  assert.equal(exactRatioPercent('9007199254740993', '9007199254740994', 4), '100.0000');
});
test('acquisition ratios withhold unsupported or zero-denominator values', () => {
  assert.equal(exactRatioPercent(null, '10'), null);
  assert.equal(exactRatioPercent('5', '0'), null);
  assert.equal(exactRatioPercent('-1', '10'), null);
  assert.equal(exactRatioPercent('invalid', '10'), null);
});

test('source decimal comparison avoids Number precision loss', () => {
  assert.equal(compareExactDecimals('9007199254740993', '9007199254740992'), 1);
  assert.equal(compareExactDecimals('12.50', '12.5'), 0);
  assert.equal(compareExactDecimals(null, '0'), -1);
});
