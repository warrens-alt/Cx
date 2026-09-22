import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { applicationMode, DEMO_ENTRY_URL, LIVE_ENTRY_URL } from '../src/lib/applicationMode';

test('demo requires a single explicit mode parameter and never a failed login', () => {
  assert.equal(applicationMode('?mode=demo'), 'demo');
  assert.equal(applicationMode('?vendor=Example&mode=demo'), 'demo');
  for (const search of ['', '?mode=live', '?mode=Demo', '?mode=', '?demo=true', '?mode=demo&mode=live', '?mode=demo&mode=demo', '?error=503']) {
    assert.equal(applicationMode(search), 'live', search);
  }
  assert.equal(applicationMode(new URL(DEMO_ENTRY_URL, 'https://demo.invalid').search), 'demo');
  assert.equal(applicationMode(new URL(LIVE_ENTRY_URL, 'https://demo.invalid').search), 'live');
});

test('demo selection occurs before live providers mount and does not change authentication', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const entry = app.slice(app.indexOf('export default function App'));
  assert.match(entry, /if \(mode === 'demo'\).*<DemoWorkspace\//s);
  assert.match(entry, /return <LiveApp\//);
  assert.doesNotMatch(entry, /ClientProvider|FilterProvider|fetch\(/);
  assert.match(app, /href=\{DEMO_ENTRY_URL\}>View demo data/);
  const security = fs.readFileSync('server/security.ts', 'utf8');
  assert.match(security, /if \(!audience\) throw new RequestError/);
  assert.doesNotMatch(security, /mode.*demo|NODE_ENV|dev-user|x-user-subject/);
});

test('demo dependency graph cannot mount live contexts or call data services', async () => {
  const bundle = await build({ entryPoints: ['src/pages/DemoWorkspace.tsx'], bundle: true, write: false, metafile: true, packages: 'external', loader: { '.css': 'empty' }, logLevel: 'silent' });
  const files = Object.keys(bundle.metafile!.inputs);
  assert.ok(files.includes('src/lib/demoData.ts'));
  for (const file of files) {
    assert.doesNotMatch(file, /(^|\/)server\/|ClientContext|FilterContext|analyticsRequest|reportingClient|useAnalyticsData|useEvidenceWorkspace|useExploreData/, file);
    if (/\.[jt]sx?$/.test(file)) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker|localStorage|sessionStorage/, file);
    }
  }
});
