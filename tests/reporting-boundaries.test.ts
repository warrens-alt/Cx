import test from 'node:test';
import assert from 'node:assert/strict';
import { FACTS, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest, type ReportRequest } from '../contracts/reporting';
import { ENGINE_HASH } from '../server/reporting/buildStamp';
import { ExecutionSigner } from '../server/reporting/execution';
import { REQUIRED_CHECKS, validateRelease } from '../server/reporting/release';
import { BigQueryReportRepository } from '../server/reporting/repository';
import { ReportService } from '../server/reporting/service';
import { RequestError } from '../server/bigquery/filters';
import { compileEvidence } from '../server/reporting/query';

const cutoff = '2026-09-20T00:00:00.000Z';
const snapshot = (name: string) => ({ table: `project.cx_reporting.rfixture_${name}`, createdAt: cutoff, snapshotTime: cutoff });
const release = (): ReleaseManifest => ({
  releaseId: 'rfixture', tenantId: 'default_tenant', modelVersion: MODEL_VERSION, metricVersion: METRIC_VERSION, engineHash: ENGINE_HASH,
  status: 'PUBLISHED', cutoff, builtAt: cutoff, sourceBatchIds: ['fixture'], approvedBy: 'test', approvalReference: 'synthetic-only',
  snapshots: Object.fromEntries(FACTS.map(fact => [fact, snapshot(fact)])) as ReleaseManifest['snapshots'],
  provenance: Object.fromEntries(['records', 'batches', 'contracts'].map(name => [name, snapshot(name)])) as ReleaseManifest['provenance'],
  sources: FACTS.map(fact => ({ fact, status: 'COMPLETE', contractVersion: 'fixture', completeThrough: cutoff, earliestAvailable: '2026-01-01T00:00:00Z', owner: 'test', approvalReference: 'synthetic-only' })),
  checks: REQUIRED_CHECKS.map(id => ({ id, status: 'PASS', observed: '0', expected: '0', jobId: 'fixture' })),
});
const request: ReportRequest = { tenantId: 'default_tenant', startDate: '2026-08-01', endDate: '2026-08-31', observationCutoff: cutoff, dateBasis: 'capture_cohort', grouping: 'source', currency: 'ZAR', metrics: ['fetched_leads'], filters: {} };
const principal = { subject: 'test', email: 'test@example.com', role: 'viewer' as const, tenants: ['default_tenant'] };
const signer = new ExecutionSigner('fixture-only-report-key-at-least-thirty-two-bytes');
const status = (expected: number) => (error: unknown) => error instanceof RequestError && error.status === expected;

for (const [name, mutate] of [
  ['null check row', (value: any) => { value.checks[0] = null; }],
  ['null snapshot', (value: any) => { value.snapshots.leads = null; }],
  ['array snapshots', (value: any) => { value.snapshots = []; }],
  ['null source row', (value: any) => { value.sources[0] = null; }],
  ['non-array sources', (value: any) => { value.sources = {}; }],
  ['coerced identity', (value: any) => { value.releaseId = ['rfixture']; }],
  ['invalid timestamp', (value: any) => { value.cutoff = '2026-02-30T00:00:00Z'; }],
  ['invalid lineage', (value: any) => { value.sourceBatchIds = [null]; }],
  ['duplicate lineage', (value: any) => { value.sourceBatchIds = ['fixture', 'fixture']; }],
  ['non-string source evidence', (value: any) => { value.sources[0].owner = {}; }],
] as const) {
  test(`malformed warehouse release is a controlled unavailable response: ${name}`, () => {
    const value = release(); mutate(value);
    assert.throws(() => validateRelease(value), status(503));
  });
}

async function repositoryTest(work: (create: (client: any) => BigQueryReportRepository) => Promise<void>) {
  const oldDataset = process.env.CX_REPORTING_DATASET, oldBudget = process.env.BIGQUERY_MAX_BYTES_BILLED;
  process.env.CX_REPORTING_DATASET = 'project.cx_reporting';
  process.env.BIGQUERY_MAX_BYTES_BILLED = '1000';
  try { await work(client => new BigQueryReportRepository(client)); }
  finally {
    if (oldDataset === undefined) delete process.env.CX_REPORTING_DATASET; else process.env.CX_REPORTING_DATASET = oldDataset;
    if (oldBudget === undefined) delete process.env.BIGQUERY_MAX_BYTES_BILLED; else process.env.BIGQUERY_MAX_BYTES_BILLED = oldBudget;
  }
}

test('reporting repository keeps SQL execution read-only, bounded and exact', async () => repositoryTest(async create => {
  const calls: any[] = [];
  const repo = create({ createQueryJob: async (options: unknown) => {
    calls.push(options);
    return [{ id: 'fixture-job', getQueryResults: async () => [[{ value: '9007199254740993.000000001' }]], getMetadata: async () => [{ statistics: { query: { totalBytesProcessed: '9876543210123456', cacheHit: false } } }] }];
  } });
  const result = await repo.query({ query: 'SELECT @amount AS value', params: { amount: '9007199254740993.000000001' } });
  assert.equal(result.rows[0].value, '9007199254740993.000000001');
  assert.equal(result.evidence.bytesProcessed, '9876543210123456');
  assert.equal(calls[0].useLegacySql, false);
  assert.equal(calls[0].maximumBytesBilled, '1000');
  assert.equal(calls[0].jobTimeoutMs, 60000);
  await assert.rejects(repo.query({ query: 'DELETE FROM `project.cx_reporting.table` WHERE TRUE', params: {} }));
  await assert.rejects(repo.query({ query: 'SELECT 1', params: {}, destination: { tableId: 'outside' } } as any));
  assert.equal(calls.length, 1, 'unsafe jobs must never reach the SDK');
}));

for (const manifest of ['{', null, 'null', '[]']) test(`invalid release JSON fails closed: ${manifest}`, async () => repositoryTest(async create => {
  const repo = create({ createQueryJob: async () => [{ id: 'fixture', getQueryResults: async () => [[{ status: 'PUBLISHED', manifest }]], getMetadata: async () => [{}] }] });
  await assert.rejects(repo.release('default_tenant'), status(503));
}));

test('malformed snapshot timestamps do not throw internal RangeErrors or pass identity validation', async () => repositoryTest(async create => {
  for (const creationTime of [undefined, '', 'invalid', '999999999999999999999999999999', null]) {
    const repo = create({ dataset: () => ({ table: () => ({ getMetadata: async () => [{ type: 'SNAPSHOT', creationTime, snapshotDefinition: { snapshotTime: cutoff } }] }) }) });
    await assert.rejects(repo.assertSnapshots(release()), status(409));
  }
}));

const total = { metric_id: 'fetched_leads', is_total: true, group_key: null, value: '9007199254740993', numerator: '9007199254740993', denominator: null };
for (const [name, rows] of [
  ['string total flag', [total, { ...total, is_total: 'false', group_key: 'Organic' }]],
  ['structured group', [total, { ...total, is_total: false, group_key: { value: 'Organic' } }]],
  ['out-of-scope metric', [total, { ...total, metric_id: 'call_attempts' }]],
  ['duplicate group', [total, { ...total, is_total: false, group_key: 'Organic' }, { ...total, is_total: false, group_key: 'Organic' }]],
] as const) test(`invalid aggregate schema is not labelled checked: ${name}`, async () => {
  const repo: any = { configured: true, release: async () => release(), assertSnapshots: async () => {}, query: async () => ({ rows, jobId: 'fixture' }) };
  await assert.rejects(new ReportService(repo, signer).create(request, principal), status(502));
});

test('release IDs must be strings, not coercible single-value arrays', async () => {
  const repo: any = { release: async () => { throw new Error('must not query'); } };
  await assert.rejects(new ReportService(repo, signer).create(request, principal, ['rfixture'] as any), status(400));
});

test('missing-group evidence is distinct from legacy totals and literal display labels', () => {
  const all = compileEvidence(request, release(), 'fetched_leads', null);
  const missing = compileEvidence(request, release(), 'fetched_leads', null, true);
  const named = compileEvidence(request, release(), 'fetched_leads', 'Unspecified');
  assert.doesNotMatch(all.query, /AND group_key (?:IS NULL|=)/);
  assert.match(missing.query, /WHERE metric_id=@evidenceMetric AND group_key IS NULL/);
  assert.equal(Object.hasOwn(missing.params, 'evidenceGroup'), false);
  assert.match(named.query, /AND group_key=@evidenceGroup/);
  assert.equal(named.params.evidenceGroup, 'Unspecified');
  assert.throws(() => compileEvidence(request, release(), 'fetched_leads', 'Unspecified', true), status(400));
  assert.throws(() => compileEvidence({ ...request, grouping: 'none' }, release(), 'fetched_leads', null, true), status(400));
  assert.throws(() => compileEvidence(request, release(), 'fetched_leads', null, 'true' as any), status(400));
});

test('evidence response explicitly identifies the missing bucket without altering totals compatibility', async () => {
  const queries: string[] = [];
  const manifest = release(), token = signer.create(principal.subject, request, manifest);
  const repo: any = { release: async () => manifest, assertSnapshots: async () => {}, query: async ({ query }: { query: string }) => { queries.push(query); return { rows: [], jobId: 'fixture' }; } };
  const service = new ReportService(repo, signer);
  const missing = await service.evidence(token, principal, 'fetched_leads', null, true);
  const totals = await service.evidence(token, principal, 'fetched_leads', null);
  assert.equal(missing.groupIsNull, true);
  assert.equal(totals.groupIsNull, false);
  assert.equal(missing.executionId, totals.executionId);
  assert.match(queries[0], /AND group_key IS NULL/);
  assert.doesNotMatch(queries[1], /AND group_key IS NULL/);
});
