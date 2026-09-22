import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryCache } from '../server/cache';

test('identical in-progress analytical work is executed once', async () => {
  const cache = new QueryCache(10);
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const work = async () => { calls += 1; await gate; return { exact: '9007199254740993' }; };
  const first = cache.getOrFetch('subject-a:scope-a', work, 5);
  const second = cache.getOrFetch('subject-a:scope-a', work, 5);
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ exact: '9007199254740993' }, { exact: '9007199254740993' }]);
  assert.equal(calls, 1);
});

test('failed analytical work is not cached or left in flight', async () => {
  const cache = new QueryCache(10);
  let calls = 0;
  await assert.rejects(cache.getOrFetch('subject-a:scope-a', async () => { calls += 1; throw new Error('warehouse failed'); }));
  assert.equal(await cache.getOrFetch('subject-a:scope-a', async () => { calls += 1; return 'measured'; }), 'measured');
  assert.equal(calls, 2);
});

test('permission identities do not share analytical results', async () => {
  const cache = new QueryCache(10);
  let calls = 0;
  const work = async () => String(++calls);
  assert.equal(await cache.getOrFetch('subject-a:scope-a', work), '1');
  assert.equal(await cache.getOrFetch('subject-b:scope-a', work), '2');
});
