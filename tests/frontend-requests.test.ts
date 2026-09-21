import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsError, analyticsUrl, fetchAnalyticsJson, recordsCsv } from '../src/lib/analyticsRequest';

const scope = { clientId: 'workspace-b', startDate: '2026-08-01', endDate: '2026-08-31', filters: { vendor: { operator: 'in' as const, values: ['Vendor A', 'Vendor B'] }, valid_idno: { operator: 'equals' as const, value: false }, age: { operator: 'equals' as const, value: 0 } } };

test('record, timeline and export URLs preserve tenant, dates, FALSE, zero and multiselect scope', () => {
  for (const endpoint of ['leads', 'lead-timeline/' + encodeURIComponent('lead/a?b'), 'export']) {
    const url = new URL(analyticsUrl(endpoint, scope, { limit: 20, offset: 0, include: false }), 'https://fixture.invalid');
    assert.equal(url.searchParams.get('clientId'), scope.clientId);
    assert.equal(url.searchParams.get('startDate'), scope.startDate);
    assert.equal(url.searchParams.get('endDate'), scope.endDate);
    assert.deepEqual(JSON.parse(url.searchParams.get('filters')!), scope.filters);
    assert.equal(url.searchParams.get('offset'), '0');
    assert.equal(url.searchParams.get('include'), 'false');
  }
  assert.match(analyticsUrl('lead-timeline/' + encodeURIComponent('lead/a?b'), scope), /lead%2Fa%3Fb\?/);
});

test('extra/display parameters cannot override active scope or leave old endpoint scope attached', () => {
  const url = new URL(analyticsUrl('leads?clientId=old&startDate=old&endDate=old&filters=old', { ...scope, startDate: '', endDate: '', filters: {} }, { clientId: 'also-old', filters: 'old', format: 'csv' }), 'https://fixture.invalid');
  assert.equal(url.searchParams.get('clientId'), 'workspace-b');
  assert.equal(url.searchParams.has('startDate'), false);
  assert.equal(url.searchParams.has('endDate'), false);
  assert.equal(url.searchParams.has('filters'), false);
  assert.equal(url.searchParams.get('format'), 'csv');
  assert.throws(() => analyticsUrl('leads', { ...scope, clientId: '' }), /authorised workspace/);
});

test('API errors include only safe request identifiers and preserve status for retry decisions', () => {
  const error = analyticsError(new Response('{}', { status: 403, headers: { 'x-request-id': 'safe-request-123' } }), { error: 'Workspace access denied.' });
  assert.equal(error.status, 403);
  assert.equal(error.message, 'Workspace access denied. Request safe-request-123.');
  assert.equal(analyticsError(new Response('{}', { status: 500 }), { error: 'Failure', requestId: '<script>secret</script>' }).message, 'Failure');
});

test('loaded-record CSV preserves exact decimals, false, zero, structured values and hidden metadata', () => {
  const csv = recordsCsv([{ lead_id: '=SUM(A1)', revenue: '9007199254740993.000000001', flag: false, count: 0, timestamp: { value: '2026-08-01' }, report_truncated: true }, { lead_id: 'B', revenue: '-0.000000001', extra: 'column retained' }]);
  assert.match(csv, /"'=SUM\(A1\)"/);
  assert.match(csv, /"9007199254740993\.000000001"/);
  assert.match(csv, /"false","0","2026-08-01","true"/);
  assert.match(csv, /"-0\.000000001"/);
  assert.match(csv, /"report_truncated"/);
  assert.match(csv, /"column retained"/);
});

test('analytical fetch forwards cancellation and same-origin credentials without accepting malformed data', async context => {
  const controller = new AbortController();
  const mock = context.mock.method(globalThis, 'fetch', async (_url: string | URL | Request, options?: RequestInit) => {
    assert.equal(options?.signal, controller.signal);
    assert.equal(options?.credentials, 'same-origin');
    return new Response(JSON.stringify({ success: true, data: [{ exact: '9007199254740993' }], metadata: { truncated: false } }));
  });
  assert.deepEqual((await fetchAnalyticsJson('https://fixture.invalid', controller.signal)).data, [{ exact: '9007199254740993' }]);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ success: true })));
  await assert.rejects(fetchAnalyticsJson('https://fixture.invalid', controller.signal));
  mock.mock.mockImplementation(async () => new Response('<html>not JSON</html>', { status: 502 }));
  await assert.rejects(fetchAnalyticsJson('https://fixture.invalid', controller.signal), /502/);
});
