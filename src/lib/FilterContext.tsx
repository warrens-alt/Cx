import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateFilters, type FilterCondition, type Filters } from '../../server/bigquery/filters';
export type { FilterCondition };
export type UniversalFilters = Filters;
export function defaultDateRange(now = new Date()) { const end = now.toISOString().slice(0, 10); return { start: new Date(Date.parse(end) - 29 * 86400000).toISOString().slice(0, 10), end }; }
function readFilters(params: URLSearchParams): Filters {
  const encoded = params.get('filters');
  if (encoded) return validateFilters(encoded);
  const result: Filters = {};
  for (const key of ['source', 'vendor', 'medium']) { const value = params.get(key); if (value) result[key] = { operator: 'in', values: value.split(',') }; }
  return validateFilters(result);
}
interface FilterContextType {
  startDate: string; endDate: string; startMonth: string; endMonth: string;
  setStartDate: (value: string) => void; setEndDate: (value: string) => void; setDateRange: (start: string, end: string) => void;
  filters: Filters; filterError: string | null; setFilter: (key: string, condition: FilterCondition | null) => void; clearFilters: () => void;
  source: string; vendor: string; medium: string; setSource: (value: string) => void; setVendor: (value: string) => void; setMedium: (value: string) => void;
}
const Context = createContext<FilterContextType | undefined>(undefined);
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [params, setParams] = useSearchParams(), defaults = defaultDateRange();
  const startDate = params.get('startDate') || defaults.start, endDate = params.get('endDate') || defaults.end;
  const parsed = useMemo(() => { try { return { filters: readFilters(params), filterError: null }; } catch (e) { return { filters: {} as Filters, filterError: e instanceof Error ? e.message : 'Invalid filters' }; } }, [params]);
  const update = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); value ? next.set(key, value) : next.delete(key); return next; }, { replace: true });
  const setDateRange = (start: string, end: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('startDate', start); next.set('endDate', end); return next; }, { replace: true });
  const setFilter = (key: string, condition: FilterCondition | null) => setParams(previous => {
    const next = new URLSearchParams(previous), filters = { ...readFilters(previous) };
    if (condition === null) delete filters[key]; else filters[key] = condition;
    const validated = validateFilters(filters);
    for (const legacy of ['source', 'vendor', 'medium']) next.delete(legacy);
    Object.keys(validated).length ? next.set('filters', JSON.stringify(validated)) : next.delete('filters');
    return next;
  }, { replace: true });
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); for (const key of ['filters', 'source', 'vendor', 'medium']) next.delete(key); return next; }, { replace: true });
  const get = (key: string) => parsed.filters[key]?.operator === 'in' ? parsed.filters[key].values?.join(',') || '' : '';
  const set = (key: string, value: string) => setFilter(key, value ? { operator: 'in', values: value.split(',') } : null);
  return <Context.Provider value={{ startDate, endDate, startMonth: startDate.slice(0, 7), endMonth: endDate.slice(0, 7),
    setStartDate: value => update('startDate', value), setEndDate: value => update('endDate', value), setDateRange,
    ...parsed, setFilter, clearFilters, source: get('source'), vendor: get('vendor'), medium: get('medium'),
    setSource: value => set('source', value), setVendor: value => set('vendor', value), setMedium: value => set('medium', value) }}>{children}</Context.Provider>;
}
export function useFilters() { const context = useContext(Context); if (!context) throw new Error('FilterProvider is required'); return context; }
