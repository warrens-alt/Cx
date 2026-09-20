import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterCondition, Filters } from '../../server/bigquery/filters';
import { clearLegacyFilters, defaultLegacyDates, readLegacyScope, resetLegacyScope, writeLegacyFilter } from './legacyScope';
export type { FilterCondition };
export type UniversalFilters = Filters;

interface FilterContextType {
  startDate: string; endDate: string; startMonth: string; endMonth: string;
  setStartDate: (value: string) => void; setEndDate: (value: string) => void;
  setDateRange: (start: string, end: string) => void;
  filters: Filters; filterError: string | null;
  setFilter: (key: string, condition: FilterCondition | null) => void;
  clearFilters: () => void; resetScope: () => void;
  source: string; vendor: string; medium: string;
  setSource: (value: string) => void; setVendor: (value: string) => void; setMedium: (value: string) => void;
}
const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingParams = useRef(new URLSearchParams(searchParams));
  const [editError, setEditError] = useState<string | null>(null);
  // Router callbacks do not queue updates like React state. Keep same-tick edits composable;
  // browser back/forward navigation still replaces this snapshot after each committed location.
  useLayoutEffect(() => { pendingParams.current = new URLSearchParams(searchParams); setEditError(null); }, [searchParams]);
  const parsed = useMemo(() => {
    try { return { ...readLegacyScope(searchParams), filterError: null }; }
    catch (error) { return { ...defaultLegacyDates(), filters: {} as Filters, filterError: error instanceof Error ? error.message : 'Invalid reporting selection.' }; }
  }, [searchParams]);
  const commit = useCallback((change: (params: URLSearchParams) => URLSearchParams) => {
    try {
      const next = change(new URLSearchParams(pendingParams.current));
      pendingParams.current = next;
      setEditError(null);
      setSearchParams(next, { replace: true });
    } catch (error) { setEditError(error instanceof Error ? error.message : 'The filter could not be applied.'); }
  }, [setSearchParams]);
  const setFilter = useCallback((key: string, condition: FilterCondition | null) => commit(params => writeLegacyFilter(params, key, condition)), [commit]);
  const setDateRange = useCallback((start: string, end: string) => commit(params => {
    start ? params.set('startDate', start) : params.delete('startDate');
    end ? params.set('endDate', end) : params.delete('endDate');
    return params;
  }), [commit]);
  const clearFilters = useCallback(() => commit(clearLegacyFilters), [commit]);
  const resetScope = useCallback(() => commit(params => resetLegacyScope(params)), [commit]);
  const value = useMemo<FilterContextType>(() => {
    const get = (key: string) => parsed.filters[key]?.operator === 'in' ? parsed.filters[key].values!.join(',') : '';
    const set = (key: string, text: string) => setFilter(key, text ? { operator: 'in', values: text.split(',') } : null);
    return {
      ...parsed, filterError: parsed.filterError || editError,
      startMonth: parsed.startDate.slice(0, 7), endMonth: parsed.endDate.slice(0, 7),
      setStartDate: start => setDateRange(start, parsed.endDate), setEndDate: end => setDateRange(parsed.startDate, end),
      setDateRange, setFilter, clearFilters, resetScope,
      source: get('source'), vendor: get('vendor'), medium: get('medium'),
      setSource: text => set('source', text), setVendor: text => set('vendor', text), setMedium: text => set('medium', text),
    };
  }, [parsed, editError, setDateRange, setFilter, clearFilters, resetScope]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within a FilterProvider');
  return context;
}
