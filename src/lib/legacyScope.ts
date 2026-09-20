import { validateDate, validateFilters, validateScope, type FilterCondition, type Filters } from '../../server/bigquery/filters';
import { utcDatePresets } from './presentation';

const SCOPE_KEYS = ['startDate', 'endDate', 'filters', 'source', 'vendor', 'medium'] as const;
const LEGACY_DIMENSIONS = ['source', 'vendor', 'medium'] as const;
export interface LegacyScope { startDate: string; endDate: string; filters: Filters; }

export function defaultLegacyDates(now = new Date()) {
  const { start, end } = utcDatePresets(now).find(p => p.id === 'last30')!;
  return { startDate: start, endDate: end };
}

/** An invalid URL is an error, never permission to query a broader population. */
export function readLegacyFilters(params: URLSearchParams): Filters {
  for (const key of SCOPE_KEYS) if (params.getAll(key).length > 1) throw new Error(`Repeated reporting parameter: ${key}`);
  const filters = validateFilters(params.get('filters') ?? undefined);
  for (const key of LEGACY_DIMENSIONS) {
    const text = params.get(key);
    if (!text) continue;
    const condition = validateFilters({ [key]: { operator: 'in', values: text.split(',') } })[key];
    if (filters[key]) {
      const existing = filters[key];
      if (existing.operator !== 'in' || JSON.stringify([...existing.values!].sort()) !== JSON.stringify([...condition.values!].sort())) {
        throw new Error(`Conflicting ${key} selections. Use one reporting filter.`);
      }
    } else filters[key] = condition;
  }
  return filters;
}

export function readLegacyScope(params: URLSearchParams, now = new Date()): LegacyScope {
  const filters = readLegacyFilters(params);
  const defaults = defaultLegacyDates(now);
  const endDate = validateDate(params.get('endDate') ?? undefined, 'endDate') || defaults.endDate;
  const startDate = validateDate(params.get('startDate') ?? undefined, 'startDate') ||
    new Date(Date.parse(endDate) - 29 * 86400000).toISOString().slice(0, 10);
  validateScope({ startDate, endDate, filters });
  if (Date.parse(endDate) - Date.parse(startDate) > 365 * 86400000) throw new Error('Choose at most 366 inclusive reporting days.');
  return { startDate, endDate, filters };
}

export function writeLegacyFilter(previous: URLSearchParams, key: string, condition: FilterCondition | null) {
  const next = new URLSearchParams(previous);
  const filters = { ...readLegacyFilters(previous) };
  if (condition === null) delete filters[key]; else filters[key] = condition;
  const validated = validateFilters(filters);
  for (const alias of LEGACY_DIMENSIONS) next.delete(alias);
  if (Object.keys(validated).length) next.set('filters', JSON.stringify(validated)); else next.delete('filters');
  return next;
}

export function clearLegacyFilters(previous: URLSearchParams) {
  const next = new URLSearchParams(previous);
  for (const key of ['filters', ...LEGACY_DIMENSIONS]) next.delete(key);
  return next;
}

export function resetLegacyScope(previous: URLSearchParams, now = new Date()) {
  const next = clearLegacyFilters(previous), defaults = defaultLegacyDates(now);
  next.set('startDate', defaults.startDate); next.set('endDate', defaults.endDate);
  return next;
}
