import test from 'node:test';
import assert from 'node:assert/strict';
import type { BigQuery, Query } from '@google-cloud/bigquery';
import { assertReadOnlyQuery, readOnlyQueryOptions } from '../server/bigquery/readOnly';
import { AnalyticsBigQueryClient, checkBigQueryHealth, guardedQueryOptions } from '../server/bigquery/client';
import { BigQuerySourceAccess, safeSourceError } from '../server/bigquery/sourceAccess';
import { getClientConfig } from '../server/bigquery/config';
import { getBaseSemanticLayer } from '../server/bigquery/views';
import { withAnalyticsScope } from '../server/analyticsContext';

for (const query of [
  'SELECT 1', 'WITH sample AS (SELECT 1 AS n) SELECT * FROM sample;',
  "-- DELETE FROM x;\nSELECT 'UPDATE; DROP TABLE x' AS label /* INSERT; */; # ALTER\n",
  'SELECT `update`, `delete`, `project.dataset.drop` FROM `project.dataset.table`',
  'SELECT @delete, @update, @set, @@project_id',
  `SELECT r'\\bUPDATE\\b', b"DELETE", '''multi\nEXPORT;\nline''', """DROP;"""`,
  "SELECT 'escaped\\\' DELETE; literal', REGEXP_REPLACE('DROP', r'R', '')",
  `${getBaseSemanticLayer(getClientConfig('default_tenant'))} SELECT * FROM vw_leads LIMIT 1`,
]) test(`read-only SQL accepts server SELECT syntax: ${query.slice(0, 60)}`, () => assert.doesNotThrow(() => assertReadOnlyQuery(query)));

for (const query of [
  '', 'DELETE FROM `p.d.t` WHERE TRUE', 'UPDATE `p.d.t` SET x = 1',
  'INSERT INTO `p.d.t` SELECT 1', 'CREATE TABLE `p.d.t` AS SELECT 1',
  'WITH sample AS (SELECT 1) DELETE FROM `p.d.t` WHERE TRUE',
  'SELECT 1; DELETE FROM `p.d.t` WHERE TRUE', 'SELECT 1; /* comment */ SELECT 2',
  'SELECT 1 -- comment\r; DELETE FROM `p.d.t` WHERE TRUE',
  'SELECT 1 # comment\r; DROP TABLE `p.d.t`',
  'SELECT 1;;', 'SELECT 1; EXECUTE IMMEDIATE "DROP TABLE `p.d.t`"',
  'EXPORT DATA OPTIONS(uri="gs://bucket/file") AS SELECT 1',
  'CALL `p.d.procedure`()', 'BEGIN SELECT 1; COMMIT TRANSACTION;',
  'SELECT * FROM EXTERNAL_QUERY("connection", "DELETE FROM orders RETURNING *")',
  "SELECT 'unterminated", 'SELECT 1 /* unterminated',
]) test(`read-only SQL rejects mutation, script or malformed syntax: ${query.slice(0, 70)}`, () => assert.throws(() => assertReadOnlyQuery(query)));

for (const key of [
  'destination', 'destinationTable', 'writeDisposition', 'createDisposition', 'schemaUpdateOptions',
  'timePartitioning', 'rangePartitioning', 'clustering', 'destinationEncryptionConfiguration',
  'connectionProperties', 'createSession', 'continuous', 'writeIncrementalResults',
  'scriptOptions', 'tableDefinitions', 'userDefinedFunctionResources', 'allowLargeResults', 'job',
]) test(`runtime reader refuses ${key} job options`, () => {
  assert.throws(() => readOnlyQueryOptions({ query: 'SELECT 1', [key]: {} } as Query), /read-only app/);
});

test('query budget uses the stricter cap and does not round large integer strings', () => {
  assert.equal(readOnlyQueryOptions({ query: 'SELECT 1', maximumBytesBilled: '100' }, '1000').maximumBytesBilled, '100');
  assert.equal(readOnlyQueryOptions({ query: 'SELECT 1', maximumBytesBilled: '2000' }, '1000').maximumBytesBilled, '1000');
  assert.equal(readOnlyQueryOptions({ query: 'SELECT 1' }, '9007199254740993').maximumBytesBilled, '9007199254740993');
  assert.equal(readOnlyQueryOptions({ query: 'SELECT 1', jobTimeoutMs: 120000 }).jobTimeoutMs, 60000);
  assert.equal(readOnlyQueryOptions({ query: 'SELECT 1', jobTimeoutMs: 1000 }).jobTimeoutMs, 1000);
  for (const budget of ['', '0', '-1', '1.5', '1e6', 'NaN', '9223372036854775808']) {
    assert.throws(() => readOnlyQueryOptions({ query: 'SELECT 1' }, budget));
    assert.throws(() => readOnlyQueryOptions({ query: 'SELECT 1', maximumBytesBilled: budget }));
  }
});

test('legacy query guard preserves authoritative request-local vendor bindings', () => {
  withAnalyticsScope({ clientId: 'default_tenant', filters: { vendor: { operator: 'in', values: ['MTN'] } } }, () => {
    const options = guardedQueryOptions({ query: 'SELECT @scope_vendor_0', params: { scope_vendor_0: 'spoofed', other: 'kept' } });
    assert.deepEqual(options.params, { scope_vendor_0: 'MTN', other: 'kept' });
  });
});

test('all source and legacy execution methods reject writes before reaching the SDK', async () => {
  const calls: Query[] = [];
  const warehouse = {
    query: async (options: Query) => { calls.push(options); return [[]]; },
    createQueryJob: async (options: Query) => {
      calls.push(options);
      return [{ id: 'fixture-query', getQueryResults: async () => [[]], getMetadata: async () => [{ statistics: { query: { totalBytesProcessed: '0' } } }] }];
    },
  } as unknown as BigQuery;
  const legacy = new AnalyticsBigQueryClient(warehouse);
  const source = new BigQuerySourceAccess(getClientConfig('default_tenant'), warehouse);
  assert.throws(() => legacy.query({ query: 'DELETE FROM `p.d.t` WHERE TRUE' }));
  assert.throws(() => legacy.createQueryJob({ query: 'SELECT 1', writeDisposition: 'WRITE_TRUNCATE' }));
  await assert.rejects(source.execute({ query: 'SELECT 1; DROP TABLE `p.d.t`' }));
  assert.equal(calls.length, 0);
  const result = await source.execute({ query: 'SELECT 1', maximumBytesBilled: '10' });
  assert.equal(calls[0].maximumBytesBilled, '10');
  assert.equal(result.bytesProcessed, '0');
});

test('health timestamp is returned as a string instead of a BigQuery timestamp wrapper', async () => {
  let query = '';
  const warehouse = { query: async (options: Query) => { query = options.query!; return [[{ latest: '2026-09-22T10:00:00.000000Z' }]]; } } as unknown as BigQuery;
  const result = await checkBigQueryHealth('project', 'dataset', 'table', new AnalyticsBigQueryClient(warehouse));
  assert.match(query, /FORMAT_TIMESTAMP\('%Y-%m-%dT%H:%M:%E6SZ', MAX\(SAFE_CAST\(fetched AS TIMESTAMP\)\), 'UTC'\)/);
  assert.equal(typeof result.latestData, 'string');
  assert.equal(new Date(result.latestData!).toISOString(), '2026-09-22T10:00:00.000Z');
  assert.equal(result.freshnessVerified, false);
});

test('source not-found errors do not assert that a table is missing when location may be wrong', () => {
  assert.match(safeSourceError({ code: 404 }).reason, /location/);
});
