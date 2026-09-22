import type { AnalyticsScope } from './analyticsRequest';

export interface SourceMetricResult {
  id: string; label: string; value: string | null; status: 'MEASURED' | 'PARTIAL' | 'UNAVAILABLE';
  validRows: string | null; missingRows: string | null; invalidRows: string | null; reason?: string | null;
}
export interface SourceMetricResponse {
  role: string; table: string; dateBasis: string; warning: string; queryJobId: string | null;
  scope: Pick<AnalyticsScope, 'clientId' | 'startDate' | 'endDate'>;
  metrics: SourceMetricResult[];
}

/** Diagnostic rows must belong to this exact request and retain their warehouse decimal strings. */
export function validateSourceMetricResponse(value: unknown, expected: SourceMetricResponse['scope'] & { role: string }): SourceMetricResponse {
  const body = value as SourceMetricResponse | null;
  if (!body || body.role !== expected.role || !body.scope || ['clientId', 'startDate', 'endDate'].some(key => body.scope[key] !== expected[key])) {
    throw new Error('Source metrics do not match the selected workspace, source and dates. No rows were displayed.');
  }
  if (typeof body.table !== 'string' || typeof body.dateBasis !== 'string' || typeof body.warning !== 'string'
    || !(body.queryJobId === null || typeof body.queryJobId === 'string') || !Array.isArray(body.metrics) || !body.metrics.length) {
    throw new Error('Source metrics response is incomplete. No empty result was substituted.');
  }
  const ids = new Set<string>();
  for (const metric of body.metrics) {
    if (!metric || typeof metric.id !== 'string' || !metric.id || ids.has(metric.id) || typeof metric.label !== 'string'
      || !['MEASURED', 'PARTIAL', 'UNAVAILABLE'].includes(metric.status)
      || !(metric.reason === undefined || metric.reason === null || typeof metric.reason === 'string')
      || !(metric.value === null || typeof metric.value === 'string' && /^-?\d+(?:\.\d+)?$/.test(metric.value))
      || [metric.validRows, metric.missingRows, metric.invalidRows].some(count => !(count === null || typeof count === 'string' && /^\d+$/.test(count)))) {
      throw new Error('Source metrics contain malformed or imprecise values. No rows were displayed.');
    }
    ids.add(metric.id);
  }
  return body;
}
