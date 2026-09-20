// Exercise the built production server without cloud credentials or warehouse calls.
import assert from 'node:assert/strict';
import { once } from 'node:events';
process.env.NODE_ENV = 'production';
process.env.IAP_AUDIENCE = '';
process.env.CX_ACCESS_POLICY_JSON = '{}';
const { createApp } = await import('../dist/server/server.mjs');
const app = await createApp();
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
try {
  await check('public liveness endpoint', async () => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200); assert.equal((await response.json()).status, 'ok');
  });
  await check('unconfigured authentication fails closed', async () => {
    const response = await fetch(`${base}/api/analytics/overview`);
    assert.equal(response.status, 503); assert.equal((await response.json()).success, false);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
  process.env.IAP_AUDIENCE = '/projects/test/global/backendServices/test';
  await check('missing signed identity denied', async () => {
    const response = await fetch(`${base}/api/analytics/overview`);
    assert.equal(response.status, 401);
  });
  await check('unsigned identity header denied', async () => {
    const response = await fetch(`${base}/api/analytics/clients`, { headers: { 'x-goog-authenticated-user-email': 'accounts.google.com:admin@example.com' } });
    assert.equal(response.status, 401);
  });
  await check('warehouse preview cannot bypass authentication', async () => {
    assert.equal((await fetch(`${base}/api/bq/preview?projectId=x&datasetId=y&tableId=z`)).status, 401);
  });
  await check('production frontend served', async () => {
    const response = await fetch(`${base}/`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /id="root"/);
  });
  await check('backend artifacts are not publicly served', async () => {
    for (const asset of ['/server/server.mjs', '/server.cjs', '/server.cjs.map', '/.env']) {
      const response = await fetch(base + asset);
      assert.equal(response.status, 404, asset);
    }
  });
  console.log(`${passed} production HTTP smoke checks passed. No warehouse or real IAP assertions were tested.`);
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
