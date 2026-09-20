import test from 'node:test';
import assert from 'node:assert/strict';
import { getBaseSemanticLayer } from '../server/bigquery/views';
import { getClientConfig } from '../server/bigquery/config';
import { withAnalyticsScope, vendorScope } from '../server/analyticsContext';

// Exercise transformations against the tracked base model, not hand-copied SQL examples.
test('the versioned model transformations apply to the actual base source', () => {
  const sql = getBaseSemanticLayer(getClientConfig('default_tenant'));
  assert.match(sql, /lead_rollup AS/);
  assert.match(sql, /vw_leads AS \(SELECT/);
  assert.match(sql, /MIN\(sale_timestamp\) as sale_timestamp/);
  assert.match(sql, /SAFE_CAST/);
});
test('activation fallback and observed call dates use corrected expressions', () => {
  const sql = getBaseSemanticLayer(getClientConfig('default_tenant'));
  assert.ok(sql.includes('(a.activation_date IS NOT NULL OR t.activation_timestamp IS NOT NULL) as activation'));
  assert.ok(sql.includes('COALESCE(v.first_call_timestamp, t.hlc_first_call) as first_call_timestamp'));
  assert.ok(sql.includes('COALESCE(v.total_calls, t.hlc_total_calls, 0) as total_calls'));
  assert.ok(!sql.includes('COALESCE(a.activation_date IS NOT NULL,'));
});
test('vendor scope is bound before lead aggregation without SQL interpolation', () => {
  const value = "MTN' OR TRUE --";
  withAnalyticsScope({ clientId: 'default_tenant', filters: { vendor: { operator: 'in', values: [value] } } }, () => {
    const sql = getBaseSemanticLayer(getClientConfig('default_tenant'));
    const restriction = 'WHERE t.hlc_vendor IN (@scope_vendor_0)';
    assert.ok(sql.includes(restriction));
    assert.ok(sql.indexOf(restriction) < sql.indexOf('lead_rollup AS'));
    assert.ok(!sql.includes(value));
    assert.equal(vendorScope().params.scope_vendor_0, value);
  });
});
