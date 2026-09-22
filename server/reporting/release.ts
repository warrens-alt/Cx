import { ENGINE_HASH } from './buildStamp';
import { FACTS, METRIC_BY_ID, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest, type ReportRequest } from '../../contracts/reporting';
import { RequestError } from '../bigquery/filters';
import { isoTimestamp } from './scope';
export const REQUIRED_CHECKS = ['revision_conflicts', 'batch_accounting', 'fact_uniqueness', 'relationships', 'chronology', 'amounts', 'raw_fact_counts', 'field_reconciliation'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const releaseTimestamp = (value: unknown, name: string) => {
  try { return isoTimestamp(value, name); }
  catch { throw new RequestError(`Invalid ${name} in published reporting release`, 503); }
};
export function validateRelease(input: unknown): ReleaseManifest {
  if (!record(input)) throw new RequestError('Invalid reporting release', 503);
  const r = input as unknown as ReleaseManifest;
  if (typeof r.releaseId !== 'string' || !/^r[a-z0-9_]{5,63}$/.test(r.releaseId) || typeof r.tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(r.tenantId)) throw new RequestError('Invalid release identity', 503);
  if (r.status !== 'PUBLISHED') throw new RequestError('Reporting release is not published or has been revoked', 410);
  if (r.engineHash !== ENGINE_HASH) throw new RequestError('Published release uses a different reporting implementation; open it with its retained engine version', 409);
  if (r.modelVersion !== MODEL_VERSION || r.metricVersion !== METRIC_VERSION) throw new RequestError('This release requires a different version of the report engine', 409);
  releaseTimestamp(r.cutoff, 'release cutoff'); releaseTimestamp(r.builtAt, 'release builtAt');
  if (Date.parse(r.cutoff) > Date.parse(r.builtAt)) throw new RequestError('Release cutoff is after its build', 503);
  if (!text(r.approvedBy) || !text(r.approvalReference) || !Array.isArray(r.sourceBatchIds) || !r.sourceBatchIds.length || r.sourceBatchIds.some(id => !text(id)) || new Set(r.sourceBatchIds).size !== r.sourceBatchIds.length) throw new RequestError('Release approval or batch lineage is missing or invalid', 503);
  if (!Array.isArray(r.checks) || r.checks.some(c => !record(c) || !text(c.id) || !text(c.jobId) || c.status !== 'PASS' || typeof c.observed !== 'string' || typeof c.expected !== 'string') || REQUIRED_CHECKS.some(id => r.checks.filter(c => c.id === id && c.observed === '0' && c.expected === '0').length !== 1)) throw new RequestError('Independent release checks are incomplete or failed', 503);
  if (!record(r.provenance) || ['records', 'batches', 'contracts'].some(k => !record(r.provenance[k]))) throw new RequestError('Pinned source lineage is missing', 503);
  if (!record(r.snapshots)) throw new RequestError('Missing or invalid release snapshots', 503);
  for (const snapshot of [...Object.values(r.snapshots), ...Object.values(r.provenance)]) {
    if (!record(snapshot) || typeof snapshot.table !== 'string' || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(snapshot.table)) throw new RequestError('Invalid snapshot identity', 503);
    releaseTimestamp(snapshot.createdAt, 'snapshot creation'); releaseTimestamp(snapshot.snapshotTime, 'snapshot time');
  }
  if (!Array.isArray(r.sources) || r.sources.some(s => !record(s) || !FACTS.includes(s.fact))) throw new RequestError('Source coverage is not specified for every fact', 503);
  for (const fact of FACTS) {
    const table = r.snapshots?.[fact];
    if (!table || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(table.table)) throw new RequestError('Missing or invalid release snapshot', 503);
    const sources = r.sources?.filter(s => s.fact === fact);
    if (!sources || sources.length !== 1 || !['COMPLETE', 'PARTIAL', 'UNAVAILABLE'].includes(sources[0].status)) throw new RequestError('Source coverage is not specified for every fact', 503);
    const s = sources[0];
    if (s.status !== 'UNAVAILABLE') {
      if (!text(s.contractVersion) || !text(s.owner) || !text(s.approvalReference) || !s.completeThrough || !s.earliestAvailable) throw new RequestError('Source evidence is incomplete', 503);
      releaseTimestamp(s.completeThrough, 'source completeThrough'); releaseTimestamp(s.earliestAvailable, 'source earliestAvailable');
      if (Date.parse(s.completeThrough) > Date.parse(r.cutoff)) throw new RequestError('Source watermark exceeds frozen release knowledge', 503);
      if (Date.parse(s.earliestAvailable) > Date.parse(s.completeThrough)) throw new RequestError('Source coverage interval is reversed', 503);
    }
  }
  return r;
}
export function metricAvailability(metricId: string, req: ReportRequest, release: ReleaseManifest) {
  const m = METRIC_BY_ID[metricId];
  if (!m.dateBases.includes(req.dateBasis)) return { available: false, completeness: 'UNAVAILABLE' as const, reason: 'This ratio requires a capture cohort; event-date numerator and denominator would be different populations.' };
  if (metricId === 'fetched_leads' && req.grouping === 'vendor') return { available: false, completeness: 'UNAVAILABLE' as const, reason: 'A lead may belong to several vendors. Use delivery-episode counts or a vendor filter; distinct leads are not allocated to a first vendor.' };
  const needs = [...new Set([...m.requires, ...(req.filters.vendor ? ['deliveries' as const] : [])])];
  const sources = release.sources.filter(s => needs.includes(s.fact));
  if (sources.some(s => s.status === 'UNAVAILABLE')) return { available: false, completeness: 'UNAVAILABLE' as const, reason: 'Required source evidence is unavailable; absence is not zero.' };
  const partial = sources.some(s => s.status !== 'COMPLETE' || Date.parse(s.completeThrough!) < Date.parse(req.observationCutoff) || Date.parse(s.earliestAvailable!) > Date.parse(req.startDate));
  // Unobserved events cannot support a definitive coverage ratio. Partial counts may be shown as recorded counts.
  if (partial && m.aggregation === 'ratio') return { available: false, completeness: 'PARTIAL' as const, reason: 'Coverage ratio withheld because its evidence window is incomplete.' };
  return { available: true, completeness: partial ? 'PARTIAL' as const : 'COMPLETE' as const, reason: partial ? 'Recorded events only; source coverage is incomplete for this scope.' : null };
}
