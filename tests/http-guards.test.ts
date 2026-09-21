import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { analyticalConcurrency, concurrencyLimitsFromEnvironment, requestContext, sameOriginRequests, securityHeaders } from '../server/httpGuards';
import { RequestError } from '../server/bigquery/filters';

async function listen(app: express.Express): Promise<{ server: Server; origin: string }> {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, origin: `http://127.0.0.1:${(server.address() as { port: number }).port}` };
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
}

function errors(error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction): void {
  const status = error instanceof RequestError ? error.status : 500;
  res.status(status).json({ success: false, requestId: res.locals.requestId });
}

test('production responses set browser protections and locally generated request IDs', async () => {
  const app = express();
  app.use(requestContext(), securityHeaders(true));
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  const { server, origin } = await listen(app);
  try {
    const response = await fetch(`${origin}/ok`, { headers: { 'x-request-id': 'caller-controlled' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('x-request-id') || '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual(response.headers.get('x-request-id'), 'caller-controlled');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
    const policy = response.headers.get('content-security-policy') || '';
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.ok(!policy.includes('googleapis.com'));
  } finally { await close(server); }
});

test('unsafe API requests reject cross-site browser origins and allow the serving origin', async () => {
  const app = express();
  app.use(requestContext(), express.json(), sameOriginRequests());
  app.post('/query', (_req, res) => res.json({ ok: true }));
  app.use(errors);
  const { server, origin } = await listen(app);
  try {
    const allowed = await fetch(`${origin}/query`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(allowed.status, 200);
    const rejected = await fetch(`${origin}/query`, { method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(rejected.status, 403);
    assert.match(rejected.headers.get('x-request-id') || '', /^[0-9a-f-]{36}$/i);
    const fetchMetadataRejected = await fetch(`${origin}/query`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(fetchMetadataRejected.status, 403);
  } finally { await close(server); }
});

test('explicit origin allowlist is validated and takes precedence over Host matching', async () => {
  assert.throws(() => sameOriginRequests('javascript:alert(1)'), /HTTP\(S\) origins/);
  assert.throws(() => sameOriginRequests('https://example.com/path'), /without credentials, paths/);
  const app = express();
  app.use(sameOriginRequests('https://analytics.example.com'));
  app.post('/query', (_req, res) => res.sendStatus(204));
  app.use(errors);
  const { server, origin } = await listen(app);
  try {
    assert.equal((await fetch(`${origin}/query`, { method: 'POST', headers: { Origin: 'https://analytics.example.com' } })).status, 204);
    assert.equal((await fetch(`${origin}/query`, { method: 'POST', headers: { Origin: origin } })).status, 403);
  } finally { await close(server); }
});

test('analytical concurrency isolates subjects, enforces the global ceiling and releases slots', async () => {
  const app = express();
  let entered = 0;
  let firstEntered!: () => void;
  let twoEntered!: () => void;
  const firstStarted = new Promise<void>(resolve => { firstEntered = resolve; });
  const twoStarted = new Promise<void>(resolve => { twoEntered = resolve; });
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  app.use(requestContext());
  app.use((req, res, next) => { res.locals.principal = { subject: req.get('x-subject') || 'subject-a' }; next(); });
  app.use(analyticalConcurrency({ global: 2, perSubject: 1 }));
  app.get('/query', async (_req, res) => {
    entered += 1;
    if (entered === 1) firstEntered();
    if (entered === 2) twoEntered();
    await held;
    res.json({ ok: true });
  });
  app.use(errors);
  const { server, origin } = await listen(app);
  try {
    const first = fetch(`${origin}/query`, { headers: { 'x-subject': 'subject-a' } });
    await firstStarted;
    const duplicate = await fetch(`${origin}/query`, { headers: { 'x-subject': 'subject-a' } });
    assert.equal(duplicate.status, 429);
    assert.equal(duplicate.headers.get('retry-after'), '1');
    const secondSubject = fetch(`${origin}/query`, { headers: { 'x-subject': 'subject-b' } });
    await twoStarted;
    const globalOverflow = await fetch(`${origin}/query`, { headers: { 'x-subject': 'subject-c' } });
    assert.equal(globalOverflow.status, 429);
    release();
    assert.deepEqual(await Promise.all([(await first).status, (await secondSubject).status]), [200, 200]);
    assert.equal((await fetch(`${origin}/query`, { headers: { 'x-subject': 'subject-a' } })).status, 200);
  } finally { release(); await close(server); }
});

test('analytical limit configuration fails closed on invalid values', () => {
  assert.deepEqual(concurrencyLimitsFromEnvironment({}), { perSubject: 4, global: 40 });
  assert.throws(() => concurrencyLimitsFromEnvironment({ CX_MAX_CONCURRENT_QUERIES_PER_SUBJECT: '0' }), /between 1 and 100/);
  assert.throws(() => concurrencyLimitsFromEnvironment({ CX_MAX_CONCURRENT_QUERIES_GLOBAL: 'many' }), /positive integer/);
});
