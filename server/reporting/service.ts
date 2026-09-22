import { METRIC_BY_ID, type QueryExecutionEvidence, type ReportResult, type MetricResult, type ReleaseManifest } from '../../contracts/reporting';
import { RequestError } from '../bigquery/filters';
import { reportRequest } from './scope';
import { metricAvailability, validateRelease } from './release';
import { ExecutionSigner, digest } from './execution';
import { compileReport, compileEvidence } from './query';
import type { ReportRepository } from './repository';
import type { Principal } from '../securityPolicy';
import { requireTenant } from '../securityPolicy';
export class ReportService {
  constructor(private readonly repository: ReportRepository, private readonly signer: ExecutionSigner) {}
  async create(input: unknown, principal: Principal, releaseId?: string): Promise<ReportResult> {
    const req = reportRequest(input); requireTenant(principal, req.tenantId);
    if (releaseId !== undefined && (typeof releaseId !== 'string' || !/^r[a-z0-9_]{5,63}$/.test(releaseId))) throw new RequestError('Invalid release ID');
    const release = await this.repository.release(req.tenantId, releaseId);
    if (!release) throw new RequestError('No approved data release is available. Live legacy queries are not a substitute.', 503);
    const token = this.signer.create(principal.subject, req, release);
    return this.run(token, principal);
  }
  private async resolve(token: string, principal: Principal) {
    const ticket = this.signer.verify(token, principal.subject); requireTenant(principal, ticket.request.tenantId);
    const release = await this.repository.release(ticket.request.tenantId, ticket.releaseId);
    if (!release) throw new RequestError('The pinned release is no longer available', 410);
    validateRelease(release);
    if (digest(release) !== ticket.releaseHash) throw new RequestError('Release metadata changed; report cannot be replayed silently', 409);
    await this.repository.assertSnapshots(release);
    return { request: ticket.request, release };
  }
  async run(token: string, principal: Principal): Promise<ReportResult> {
    const { request, release } = await this.resolve(token, principal);
    const query = compileReport(request, release);
    const result = query ? await this.repository.query(query) : { rows: [], jobId: 'not-run-no-eligible-metrics' };
    const queryEvidence: QueryExecutionEvidence = result.evidence ?? { durationMs: 0, bytesProcessed: null, cacheHit: null, subqueryCount: 0, completion: 'NOT_RUN' };
    if (result.rows.length > 5000) throw new RequestError('Report has too many groups; narrow the selection. No partial totals were published.', 413);
    const seen = new Set<string>();
    for (const row of result.rows) {
      if (!row || typeof row.metric_id !== 'string' || !request.metrics.includes(row.metric_id) || !metricAvailability(row.metric_id, request, release).available || typeof row.is_total !== 'boolean' || (row.group_key !== null && typeof row.group_key !== 'string') || (row.is_total && row.group_key !== null) || (!row.is_total && request.grouping === 'none')) throw new RequestError('Report aggregate shape does not match the signed reporting scope', 502);
      const key = JSON.stringify([row.metric_id, row.is_total, row.group_key]);
      if (seen.has(key)) throw new RequestError('Duplicated report aggregate; no partial totals were published', 502);
      seen.add(key);
    }
    const totals: MetricResult[] = [], groups: MetricResult[] = [];
    for (const id of request.metrics) {
      const availability = metricAvailability(id, request, release), definition = METRIC_BY_ID[id];
      if (!availability.available) { totals.push({ metricId: id, group: null, value: null, numerator: null, denominator: null, unit: definition.unit, calculationStatus: 'UNAVAILABLE', completeness: availability.completeness, reason: availability.reason }); continue; }
      const rows = result.rows.filter(r => r.metric_id === id);
      if (rows.filter(r => r.is_total === true).length !== 1) throw new RequestError(`Missing or duplicated aggregate for ${id}`, 502);
      for (const row of rows) {
        for (const key of ['value', 'numerator', 'denominator']) if (row[key] !== null && (typeof row[key] !== 'string' || !/^-?\d+(\.\d+)?$/.test(row[key]))) throw new RequestError('Metric precision contract was violated', 502);
        const metric: MetricResult = { metricId: id, group: row.is_total ? null : row.group_key, value: row.value, numerator: row.numerator, denominator: row.denominator, unit: definition.unit,
          calculationStatus: 'CHECKED', completeness: availability.completeness, reason: row.value === null ? 'No eligible denominator; a percentage is undefined.' : availability.reason };
        (row.is_total ? totals : groups).push(metric);
      }
    }
    return { executionId: digest({ request, release: digest(release) }), queryJobId: result.jobId, queryEvidence, engineHash: release.engineHash, token, request, releaseId: release.releaseId,
      modelVersion: release.modelVersion, metricVersion: release.metricVersion, releaseCutoff: release.cutoff,
      sourceBatchIds: release.sourceBatchIds, metricDefinitions: request.metrics.map(id => METRIC_BY_ID[id]), totals, groups, generatedAt: new Date().toISOString(), validation: release.checks, sources: release.sources };
  }
  async evidence(token: string, principal: Principal, metric: string, group: string | null, groupIsNull = false) {
    const { request, release } = await this.resolve(token, principal);
    const result = await this.repository.query(compileEvidence(request, release, metric, group, groupIsNull));
    if (result.rows.length > 50000) throw new RequestError('Evidence export exceeds 50,000 records. Narrow the signed report scope; truncation is not allowed.', 413);
    return { executionId: digest({ request, release: digest(release) }), request, releaseId: release.releaseId, metricVersion: release.metricVersion,
      metricId: metric, metricDefinition: METRIC_BY_ID[metric], group, groupIsNull, rows: result.rows, rowCount: result.rows.length, truncated: false, jobId: result.jobId,
      queryEvidence: result.evidence ?? { durationMs: 0, bytesProcessed: null, cacheHit: null, subqueryCount: 0, completion: 'NOT_RUN' } };
  }
}
