import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyticsError, analyticsUrl, fetchAnalyticsJson, recordsCsv } from '../src/lib/analyticsRequest';
import { apiResponseError, readApiEnvelope } from '../src/lib/apiResponse';
import { validateSourceMetricResponse } from '../src/lib/sourceMetricResponse';

const scope = { clientId: 'workspace-b', startDate: '2026-08-01', endDate: '2026-08-31', filters: { vendor: { operator: 'in' as const, values: ['Vendor A', 'Vendor B'] }, valid_idno: { operator: 'equals' as const, value: false }, age: { operator: 'equals' as const, value: 0 } } };

test('filter options share API validation and cannot silently keep stale choices after an error', () => {
  const source=fs.readFileSync('src/components/GlobalFilter.tsx','utf8');
  assert.match(source,/fetchAnalyticsJson/);assert.doesNotMatch(source,/response\.json\(/);
  assert.match(source,/enabled:ready&&!!selectedClient/);assert.match(source,/status===401/);
  assert.match(source,/options\.error\?\{\}:options\.data/);
});

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

test('HTML served as HTTP 200 is reported as an API routing problem, never a successful empty table', async () => {
  const response = new Response('<html>Private proxy body and tokens must not be echoed</html>', { headers: { 'content-type': 'text/html', 'x-request-id': 'preview-route-123' } });
  await assert.rejects(readApiEnvelope(response), error => {
    assert.equal((error as any).status, 502);
    assert.equal((error as any).httpStatus, 200);
    assert.equal((error as any).retryable, false);
    assert.match((error as Error).message, /HTML instead of JSON.*API routing.*Request preview-route-123/);
    assert.doesNotMatch((error as Error).message, /failed \(200\)|Private proxy body|tokens/);
    return true;
  });
});

test('API envelope failures preserve safe errors, authoritative status and request identifiers', async () => {
  for (const status of [401, 403, 503]) {
    const payload = { success: false, error: 'Configured source access is unavailable.', status, requestId: 'safe-id-123', retryable: false };
    for (const httpStatus of [status, 200]) {
      const error = apiResponseError(new Response(JSON.stringify(payload), { status: httpStatus }), payload);
      assert.equal(error.status, status);
      assert.equal(error.httpStatus, httpStatus);
      assert.equal(error.retryable, false);
      assert.equal(error.message, 'Configured source access is unavailable. Request safe-id-123.');
    }
  }
  const nested = apiResponseError(new Response('{}'), { error: { code: 403, message: 'Permission denied.' }, requestId: '<unsafe>' });
  assert.equal(nested.status, 403);
  assert.equal(nested.message, 'Permission denied.');
  await assert.rejects(readApiEnvelope(new Response(JSON.stringify({ success: false, error: 'Authentication is not configured.' }))), /Authentication is not configured/);
});

test('API decoder rejects malformed successful envelopes and preserves explicit empty data', async () => {
  for (const body of ['', 'null', '[]', 'true', '{"success":true}', '{"data":[]}']) {
    await assert.rejects(readApiEnvelope(new Response(body)), error => {
      assert.equal((error as any).status, 502);
      assert.equal((error as any).retryable, false);
      assert.doesNotMatch((error as Error).message, /failed \(200\)/);
      return true;
    });
  }
  assert.deepEqual((await readApiEnvelope(new Response('{"success":true,"data":[]}'))).data, []);
  assert.equal((await readApiEnvelope(new Response('{"success":true,"data":0}'))).data, 0);
});

test('cancelled response bodies retain AbortError rather than becoming malformed-data failures', async () => {
  const cancelled = new DOMException('Request was cancelled.', 'AbortError');
  const stream = new ReadableStream({ start(controller) { controller.error(cancelled); } });
  await assert.rejects(readApiEnvelope(new Response(stream)), error => error === cancelled);
});

const sourceResult = {
  role: 'leads', table: 'fixture.dataset.leads', dateBasis: 'Lead capture date', warning: 'Not independently reconciled', queryJobId: 'fixture-job',
  scope: { clientId: 'workspace-b', startDate: '2026-08-01', endDate: '2026-08-31' },
  metrics: [{ id: 'source_rows', label: 'Rows', value: '9007199254740993.000000001', status: 'MEASURED', validRows: '9007199254740993', missingRows: '0', invalidRows: '0' }],
};
const sourceScope = { ...sourceResult.scope, role: 'leads' };
test('source diagnostic tables reject mismatched response scope and preserve exact decimals', () => {
  assert.equal(validateSourceMetricResponse(sourceResult, sourceScope).metrics[0].value, '9007199254740993.000000001');
  for (const key of ['clientId', 'startDate', 'endDate']) {
    assert.throws(() => validateSourceMetricResponse({ ...sourceResult, scope: { ...sourceResult.scope, [key]: 'different' } }, sourceScope), /do not match/);
  }
  assert.throws(() => validateSourceMetricResponse({ ...sourceResult, role: 'calls' }, sourceScope), /do not match/);
  assert.throws(() => validateSourceMetricResponse({ ...sourceResult, metrics: [] }, sourceScope), /incomplete/);
});

test('source diagnostic tables do not coerce malformed/rounded metrics or duplicate groups into plausible values', () => {
  const metric = sourceResult.metrics[0];
  for (const change of [{ value: 9007199254740992 }, { value: 'NaN' }, { validRows: '1.5' }, { missingRows: undefined }, { status: 'UNKNOWN' }]) {
    assert.throws(() => validateSourceMetricResponse({ ...sourceResult, metrics: [{ ...metric, ...change }] }, sourceScope), /malformed or imprecise/);
  }
  assert.throws(() => validateSourceMetricResponse({ ...sourceResult, metrics: [metric, metric] }, sourceScope), /malformed or imprecise/);
  const unavailable = { ...metric, value: null, status: 'UNAVAILABLE', validRows: null, missingRows: null, invalidRows: null };
  assert.equal(validateSourceMetricResponse({ ...sourceResult, metrics: [unavailable] }, sourceScope).metrics[0].value, null);
});
