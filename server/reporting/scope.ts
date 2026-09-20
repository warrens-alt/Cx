import { METRIC_BY_ID, type ReportRequest } from '../../contracts/reporting';
import { RequestError, validateDate } from '../bigquery/filters';
const exactKeys = (input: object, allowed: string[]) => { for (const key of Object.keys(input)) if (!allowed.includes(key)) throw new RequestError(`Unsupported reporting parameter: ${key}`); };
export function isoTimestamp(input: unknown, name: string): string {
  if (typeof input !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(input) || !Number.isFinite(Date.parse(input))) throw new RequestError(`${name} requires an explicit UTC offset`);
  if (Number(input.slice(11,13)) > 23 || Number(input.slice(14,16)) > 59 || Number(input.slice(17,19)) > 59) throw new RequestError(`${name} has invalid clock fields`);
  // Validate the calendar date before accepting Date's overflow normalisation.
  validateDate(input.slice(0, 10), name);
  return new Date(input).toISOString();
}
export function reportRequest(input: unknown): ReportRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestError('A report request is required');
  exactKeys(input, ['tenantId', 'startDate', 'endDate', 'observationCutoff', 'dateBasis', 'grouping', 'currency', 'metrics', 'filters']);
  if (JSON.stringify(input).length > 10000) throw new RequestError('Report scope is too large');
  const x = input as ReportRequest;
  if (typeof x.tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(x.tenantId)) throw new RequestError('Invalid tenant');
  const startDate = validateDate(x.startDate, 'startDate'), endDate = validateDate(x.endDate, 'endDate');
  if (!startDate || !endDate || startDate > endDate || Date.parse(endDate) - Date.parse(startDate) > 365 * 86400000) throw new RequestError('Use a valid range of at most 366 inclusive days');
  const observationCutoff = isoTimestamp(x.observationCutoff, 'observationCutoff');
  if (observationCutoff.slice(0, 10) < endDate) throw new RequestError('Observation cutoff cannot precede the reporting end date');
  if (!['capture_cohort', 'event_date'].includes(x.dateBasis)) throw new RequestError('Invalid date basis');
  if (!['none', 'source', 'vendor', 'capture_month'].includes(x.grouping)) throw new RequestError('Unsupported grouping');
  if (typeof x.currency !== 'string' || !/^[A-Z]{3}$/.test(x.currency)) throw new RequestError('Currency must be an ISO-style three-letter code');
  if (!Array.isArray(x.metrics) || !x.metrics.length || x.metrics.length > 12 || x.metrics.some(m => typeof m !== 'string' || !Object.hasOwn(METRIC_BY_ID, m))) throw new RequestError('Select supported metrics');
  if (!x.filters || typeof x.filters !== 'object' || Array.isArray(x.filters)) throw new RequestError('filters must be an object');
  exactKeys(x.filters, ['source', 'vendor', 'medium']);
  const filters: ReportRequest['filters'] = {};
  for (const key of ['source', 'vendor', 'medium'] as const) {
    const values = x.filters[key];
    if (values !== undefined) {
      if (!Array.isArray(values) || !values.length || values.length > 50 || values.some(v => typeof v !== 'string' || !v.trim() || v.length > 200 || /[\x00-\x1f]/.test(v))) throw new RequestError(`Invalid ${key} filter`);
      filters[key] = [...new Set(values)].sort();
    }
  }
  return { tenantId: x.tenantId, startDate, endDate, observationCutoff, dateBasis: x.dateBasis, grouping: x.grouping, currency: x.currency, metrics: [...new Set(x.metrics)].sort(), filters };
}
