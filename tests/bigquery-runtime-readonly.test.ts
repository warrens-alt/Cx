import test from 'node:test';
import assert from 'node:assert/strict';
import type { Query } from '@google-cloud/bigquery';
import { build } from 'esbuild';
import { readOnlyQueryOptions } from '../server/bigquery/readOnly';
import { AnalyticsBigQueryClient, guardedQueryOptions } from '../server/bigquery/client';
import * as legacy from '../server/bigquery/queries';
import * as corrected from '../server/bigquery/reporting';
import { exportData } from '../server/bigquery/export';
import { ALLOWED_METRICS, executeDynamicQuery, generateDriverInsights, getAllowedDimensions } from '../server/bigquery/semantic_engine';
import { withAnalyticsScope } from '../server/analyticsContext';
import { FACTS, METRICS, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest, type ReportRequest } from '../contracts/reporting';
import { compileReport, compileEvidence } from '../server/reporting/query';
import { ENGINE_HASH } from '../server/reporting/buildStamp';
import { REQUIRED_CHECKS } from '../server/reporting/release';
import { compileVetting } from '../server/vetting/query';
import { compileSourceMetrics } from '../server/bigquery/sourceMetrics';
import { SOURCE_DEFINITIONS, SOURCE_ROLES } from '../contracts/sourceCoverage';

const scope = { clientId: 'default_tenant', startDate: '2026-08-01', endDate: '2026-08-31', filters: { vendor: { operator: 'in' as const, values: ['MTN'] } } };

test('every active legacy query generator and Explore dimension passes the read-only boundary without contacting the SDK', async t => {
  const captured: Query[] = [];
  const rejected: string[] = [];
  t.mock.method(AnalyticsBigQueryClient.prototype, 'query', (options: Query) => {
    // Stub at the application boundary; no cloud SDK query method can run.
    try { captured.push(guardedQueryOptions(options)); }
    catch (error) { rejected.push((error as Error).message); throw error; }
    return Promise.resolve([[], {}] as [never[], {}]);
  });
  const names = Object.keys(legacy).filter(key => key.startsWith('get')) as Array<keyof typeof legacy>;
  for (const name of names) {
    const count = captured.length;
    const generate = legacy[name] as (input: typeof scope & { leadId: string }) => Promise<unknown>;
    await withAnalyticsScope(scope, () => generate({ ...scope, leadId: 'fixture-lead' }));
    assert.ok(captured.length > count, `${name} must compile at least one query`);
  }
  for (const cohortType of ['daily', 'weekly', 'monthly']) for (const metricType of ['sale', 'activation', 'call_coverage']) {
    await withAnalyticsScope(scope, () => corrected.getCohortStats({ ...scope, cohortType, metricType }));
  }
  await withAnalyticsScope(scope, () => corrected.getLeadTimeline({ ...scope, leadId: 'fixture-lead' }));
  for (const grain of ['lead', 'semantic', 'transaction']) await exportData({ ...scope, grain });
  for (const metric of Object.keys(ALLOWED_METRICS)) {
    for (const dimension of Object.keys(getAllowedDimensions('Africa/Johannesburg'))) {
      await withAnalyticsScope(scope, () => executeDynamicQuery({ ...scope, metric, dimension, secondaryDimension: 'source' }));
    }
    await withAnalyticsScope(scope, () => generateDriverInsights({ ...scope, metric, dimension: 'source' }));
  }
  assert.deepEqual(rejected, []);
  assert.ok(captured.length > 200, 'coverage includes all legacy functions and Explore metric/dimension combinations');
  t.diagnostic(`${names.length} legacy generators and ${captured.length} compiled query executions accepted; SDK queries: 0`);
});

test('versioned report and evidence compilers pass the read-only boundary for all date bases, groupings and metrics', () => {
  const cutoff = '2026-09-20T00:00:00.000Z';
  const reference = (name: string) => ({ table: `project.cx_reporting.fixture_${name}`, createdAt: cutoff, snapshotTime: cutoff });
  const release: ReleaseManifest = {
    releaseId: 'fixture', tenantId: scope.clientId, modelVersion: MODEL_VERSION, metricVersion: METRIC_VERSION, engineHash: ENGINE_HASH,
    status: 'PUBLISHED', builtAt: cutoff, cutoff, sourceBatchIds: ['fixture-batch'],
    snapshots: Object.fromEntries(FACTS.map(f => [f, reference(f)])) as ReleaseManifest['snapshots'],
    provenance: Object.fromEntries(['records', 'batches', 'contracts'].map(f => [f, reference(f)])) as ReleaseManifest['provenance'],
    sources: FACTS.map(fact => ({ fact, status: 'COMPLETE', contractVersion: 'fixture-v1', completeThrough: cutoff, earliestAvailable: '2026-01-01T00:00:00.000Z', owner: 'fixture', approvalReference: 'synthetic-only' })),
    checks: REQUIRED_CHECKS.map(id => ({ id, status: 'PASS', expected: '0', observed: '0', jobId: 'fixture' })), approvedBy: 'fixture', approvalReference: 'synthetic-only',
  };
  for (const dateBasis of ['capture_cohort', 'event_date'] as const) for (const grouping of ['none', 'source', 'vendor', 'capture_month'] as const) {
    const request: ReportRequest = { tenantId: scope.clientId, startDate: scope.startDate, endDate: scope.endDate, observationCutoff: cutoff, dateBasis, grouping, currency: 'ZAR', metrics: METRICS.map(m => m.id), filters: { vendor: ['MTN'], source: ['DELETE'], medium: ['UPDATE'] } };
    const aggregate = compileReport(request, release);
    assert.ok(aggregate); assert.doesNotThrow(() => readOnlyQueryOptions(aggregate));
    for (const metric of METRICS.filter(m => m.dateBases.includes(dateBasis))) {
      // Distinct lead totals cannot be allocated to overlapping vendor groups.
      if (grouping === 'vendor' && metric.id === 'fetched_leads') continue;
      assert.doesNotThrow(() => readOnlyQueryOptions(compileEvidence(request, release, metric.id, grouping === 'none' ? null : 'fixture-group')));
    }
  }
});

test('all physical source and vetting compiler templates pass the read-only boundary', () => {
  for (const role of SOURCE_ROLES) {
    const definition = SOURCE_DEFINITIONS[role];
    const fields = [...new Set([definition.dateField, ...definition.metrics.flatMap(m => m.field ? [m.field] : []), 'channel'])].map(name => ({ name, type: 'STRING' }));
    const compiled = compileSourceMetrics(role, { ...scope, filters: {} }, { schema: { fields } }, role === 'marketing' ? 'channel' : null);
    assert.doesNotThrow(() => readOnlyQueryOptions(compiled));
  }
  const fields = ['lead_id', 'fetched', 'offershop_source', 'offernet_medium', 'offershop_grade', 'offershop_color_vetting', 'offershop_grade_date', 'offershop_color_vetting_date', 'valid_lead', 'valid_idno', 'phone_valid'].map(name => ({ name, type: 'STRING' }));
  for (const interval of ['day', 'week', 'month']) {
    const compiled = compileVetting({ ...scope, filters: {}, interval, classValue: 'A', colourValue: 'Green' }, { schema: { fields } });
    assert.doesNotThrow(() => readOnlyQueryOptions(compiled));
  }
});

test('production server import graph cannot reach warehouse mutation scripts', async () => {
  const result = await build({ entryPoints: ['server.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false, metafile: true, logLevel: 'silent' });
  const imported = Object.keys(result.metafile!.inputs);
  assert.ok(imported.includes('server/bigquery/readOnly.ts'));
  assert.ok(imported.includes('server/bigquery/queries.ts'));
  assert.ok(!imported.includes('server/queries.ts'), 'inactive historical query module is not a runtime reader');
  assert.ok(!imported.some(path => path.startsWith('scripts/')));
  assert.ok(!imported.some(path => path.startsWith('warehouse/')));
  for (const output of result.outputFiles) {
    assert.doesNotMatch(output.text, /bootstrap-warehouse|ingest-canonical|publish-release/);
  }
});
