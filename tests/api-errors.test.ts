import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { apiErrorHandler, describeApiError } from '../server/apiErrors';
import { RequestError } from '../server/bigquery/filters';
import { requestContext } from '../server/httpGuards';

test('warehouse permissions do not masquerade as an expired user session', () => {
  const error = describeApiError({ code: 403, errors: [{ reason: 'accessDenied', message: 'sensitive SQL and identity' }] });
  assert.equal(error.status, 503); assert.equal(error.code, 'WAREHOUSE_ACCESS_DENIED'); assert.equal(error.retryable, false);
  assert.doesNotMatch(error.message, /sensitive SQL/);
  assert.match(error.message, /read query job/);
});
test('warehouse source errors include location ambiguity and never fabricate emptiness', () => {
  const error = describeApiError({ code: 404, errors: [{ reason: 'notFound' }] });
  assert.equal(error.code, 'WAREHOUSE_SOURCE_UNAVAILABLE'); assert.match(error.message, /location/); assert.match(error.message, /No data was substituted/);
});
test('quota reasons take precedence over the generic Google 403 status', () => {
  assert.equal(describeApiError({ code: 403, errors: [{ reason: 'rateLimitExceeded' }] }).retryable, true);
  assert.equal(describeApiError({ code: 403, errors: [{ reason: 'quotaExceeded' }] }).code, 'WAREHOUSE_QUOTA_EXCEEDED');
  assert.equal(describeApiError({ code: 403, errors: [{ reason: 'billingNotEnabled' }] }).code, 'WAREHOUSE_BILLING_LIMIT');
});
test('query mismatch and upstream credentials give safe, non-retryable errors', () => {
  assert.equal(describeApiError({ code: 400, errors: [{ reason: 'invalidQuery' }] }).code, 'WAREHOUSE_QUERY_INVALID');
  assert.equal(describeApiError(new Error('Could not load the default credentials. SECRET')).code, 'WAREHOUSE_CREDENTIALS_UNAVAILABLE');
  assert.doesNotMatch(describeApiError(new Error('private database failure')).message, /private database/);
});
test('authentication, validation and body limits keep their original semantics', () => {
  assert.equal(describeApiError(new RequestError('Sign in through the configured identity gateway', 401)).status, 401);
  assert.equal(describeApiError(new RequestError('Authentication is not configured', 503)).retryable, false);
  assert.equal(describeApiError({ type: 'entity.parse.failed' }).status, 400);
  assert.equal(describeApiError({ type: 'entity.too.large' }).status, 413);
  assert.equal(describeApiError({ code: 'ETIMEDOUT' }).retryable, true);
});
test('HTTP errors expose a safe correlation identifier and machine-readable status, never an empty data array', async () => {
  const app = express(); app.use(requestContext());
  app.get('/source', (_req, _res, next) => next({ code: 404, message: 'SELECT secret FROM private.dataset.table', errors: [{ reason: 'notFound' }] }));
  app.use(apiErrorHandler);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/source`);
    const payload = await response.json();
    assert.equal(response.status, 503); assert.equal(payload.status, 503); assert.equal(payload.success, false);
    assert.equal(payload.code, 'WAREHOUSE_SOURCE_UNAVAILABLE'); assert.equal(payload.retryable, false);
    assert.equal(payload.requestId, response.headers.get('x-request-id'));
    assert.equal(Object.hasOwn(payload, 'data'), false); assert.doesNotMatch(JSON.stringify(payload), /SELECT secret|private.dataset/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
