import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspace } from '../src/lib/workspaceSelection';
import { navigationTarget } from '../src/lib/presentation';
import { writeExploreView, DEFAULT_VIEW } from '../src/lib/explore/model';

test('workspace URLs restore an authorised selection and never confer new permissions', () => {
  assert.equal(resolveWorkspace(new URLSearchParams('workspace=b'), ['a', 'b']), 'b');
  assert.throws(() => resolveWorkspace(new URLSearchParams('workspace=unavailable'), ['a', 'b']), /does not have access/);
  for (const query of ['workspace=a&workspace=b', 'workspace=a&workspace=a', 'workspace=', 'workspace=%20a']) {
    assert.throws(() => resolveWorkspace(new URLSearchParams(query), ['a', 'b']));
  }
});

test('routes without a workspace retain the current authorised context before URL materialisation', () => {
  assert.equal(resolveWorkspace(new URLSearchParams(), ['a', 'b']), 'a');
  assert.equal(resolveWorkspace(new URLSearchParams(), ['a', 'b'], 'b'), 'b');
  assert.equal(resolveWorkspace(new URLSearchParams(), ['a'], 'b'), 'a');
});

test('crossing evidence and legacy navigation preserves workspace but separates report scope', () => {
  for (const [path, current] of [['/reports', '/explore'], ['/explore', '/reports']]) {
    assert.deepEqual(navigationTarget(path, current, '?workspace=b&startDate=2026-08-01&filters=legacy'), { pathname: path, search: '?workspace=b' });
  }
  assert.equal(navigationTarget('/reports', '/explore', '?workspace=a&workspace=b').search, '?workspace=a&workspace=b');
});

test('copied Explore configurations retain the explicit workspace and dates', () => {
  const shared = writeExploreView(new URLSearchParams('workspace=b'), DEFAULT_VIEW, { startDate: '2026-08-01', endDate: '2026-08-31' });
  assert.equal(shared.get('workspace'), 'b');
  assert.equal(shared.get('startDate'), '2026-08-01');
  assert.equal(shared.get('endDate'), '2026-08-31');
});
