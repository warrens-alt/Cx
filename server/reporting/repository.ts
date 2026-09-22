import { BigQuery } from '@google-cloud/bigquery';
import { RequestError } from '../bigquery/filters';
import { validateRelease } from './release';
import type { QueryExecutionEvidence, ReleaseManifest } from '../../contracts/reporting';
import type { CompiledQuery } from './query';
export interface ReportRepository {
  configured: boolean;
  release(tenant: string, releaseId?: string): Promise<ReleaseManifest | null>;
  assertSnapshots(release: ReleaseManifest): Promise<void>;
  query(query: CompiledQuery): Promise<{ rows: Record<string, any>[]; jobId: string; evidence?: QueryExecutionEvidence }>;
}
/** Dedicated read-only repository: no current-data fallback, no ambient legacy filter context. */
export class BigQueryReportRepository implements ReportRepository {
  readonly configured: boolean;
  private readonly dataset: string;
  private readonly bq: BigQuery;
  private readonly budget: string;
  constructor() {
    this.dataset = process.env.CX_REPORTING_DATASET || '';
    if (this.dataset && !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+$/.test(this.dataset)) throw new Error('Invalid CX_REPORTING_DATASET');
    this.configured = !!this.dataset;
    this.budget = process.env.BIGQUERY_MAX_BYTES_BILLED || '1000000000';
    if (!/^\d+$/.test(this.budget) || BigInt(this.budget) <= 0n) throw new Error('Invalid query budget');
    const credentials = process.env.BIGQUERY_CREDENTIALS ? JSON.parse(process.env.BIGQUERY_CREDENTIALS) : undefined;
    this.bq = new BigQuery({ projectId: this.dataset.split('.')[0] || undefined, credentials });
  }
  async release(tenant: string, releaseId?: string) {
    if (!this.configured) return null;
    const result = await this.query({ query: `SELECT status, TO_JSON_STRING(manifest) AS manifest FROM \`${this.dataset}.reporting_releases\`
      WHERE tenant_id=@tenant ${releaseId ? 'AND release_id=@releaseId' : "AND status='PUBLISHED'"} ORDER BY published_at DESC LIMIT 2`, params: { tenant, ...(releaseId ? { releaseId } : {}) } });
    if (!result.rows.length) return null;
    if (releaseId && result.rows.length !== 1) throw new RequestError('Duplicate reporting release IDs', 503);
    if (result.rows[0].status !== 'PUBLISHED') throw new RequestError('Reporting release was revoked', 410);
    const release = validateRelease(JSON.parse(result.rows[0].manifest));
    if (release.tenantId !== tenant || (releaseId && release.releaseId !== releaseId)) throw new RequestError('Release identity mismatch', 503);
    return release;
  }
  async assertSnapshots(release: ReleaseManifest) {
    await Promise.all([...Object.values(release.snapshots), ...Object.values(release.provenance)].map(async s => {
      const [project, dataset, id] = s.table.split('.');
      // Published facts must reside in the separately controlled reporting dataset.
      if (`${project}.${dataset}` !== this.dataset) throw new RequestError('Snapshot is outside the approved reporting dataset', 503);
      const [meta] = await this.bq.dataset(dataset, { projectId: project }).table(id).getMetadata();
      const snapshotTime = meta.snapshotDefinition?.snapshotTime;
      if (meta.type !== 'SNAPSHOT' || !snapshotTime || new Date(Number(meta.creationTime)).toISOString() !== new Date(s.createdAt).toISOString() || new Date(snapshotTime).toISOString() !== new Date(s.snapshotTime).toISOString()) throw new RequestError('Snapshot was replaced, is missing, or is not read-only', 409);
    }));
  }
  async query(compiled: CompiledQuery) {
    const started = Date.now();
    const [job] = await this.bq.createQueryJob({ ...compiled, useLegacySql: false, maximumBytesBilled: this.budget, jobTimeoutMs: 60000 });
    const [rows] = await job.getQueryResults();
    const [metadata] = await job.getMetadata();
    const statistics = metadata.statistics?.query;
    const selectStatements = compiled.query.match(/\bSELECT\b/gi)?.length ?? 0;
    return { rows, jobId: job.id || 'unavailable', evidence: {
      durationMs: Date.now() - started,
      bytesProcessed: typeof statistics?.totalBytesProcessed === 'string' ? statistics.totalBytesProcessed : null,
      cacheHit: typeof statistics?.cacheHit === 'boolean' ? statistics.cacheHit : null,
      subqueryCount: Math.max(0, selectStatements - 1),
      completion: 'COMPLETED' as const,
    } };
  }
}
