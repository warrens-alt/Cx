import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterCondition {
  operator: 'in' | 'equals' | 'not_equals' | 'between' | 'greater_than' | 'less_than';
  values?: string[];
  value?: any;
  min?: number;
  max?: number;
}

export type UniversalFilters = Record<string, FilterCondition>;

interface FilterContextType {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  setDateRange: (start: string, end: string) => void;
  startMonth: string;
  endMonth: string;
  filters: UniversalFilters;
  setFilter: (key: string, condition: FilterCondition | null) => void;
  clearFilters: () => void;
  // Legacy aliases for components that still expect them
  source: string;
  setSource: (val: string) => void;
  vendor: string;
  setVendor: (val: string) => void;
  medium: string;
  setMedium: (val: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const startDate = searchParams.get('startDate') || '2026-08-01';
  const endDate = searchParams.get('endDate') || '2026-08-31';
  const startMonth = startDate.substring(0, 7);
  const endMonth = endDate.substring(0, 7);

  const updateParam = (key: string, val: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (val) newParams.set(key, val);
      else newParams.delete(key);
      return newParams;
    }, { replace: true });
  };

  const setDateRange = (start: string, end: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (start) newParams.set('startDate', start);
      else newParams.delete('startDate');
      if (end) newParams.set('endDate', end);
      else newParams.delete('endDate');
      return newParams;
    }, { replace: true });
  };

  const filters = useMemo(() => {
    const fStr = searchParams.get('filters');
    if (fStr) {
      try { return JSON.parse(fStr); } catch(e) {}
    }
    // Parse legacy source/vendor if filters object isn't used yet
    const legacy: UniversalFilters = {};
    const src = searchParams.get('source');
    if (src) legacy.source = { operator: 'in', values: src.split(',') };
    const vnd = searchParams.get('vendor');
    if (vnd) legacy.vendor = { operator: 'in', values: vnd.split(',') };
    return legacy;
  }, [searchParams]);

  const setFilter = (key: string, condition: FilterCondition | null) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      const currentFilters = { ...filters };
      if (condition === null) {
        delete currentFilters[key];
        // Clean up legacy
        if (key === 'source' || key === 'vendor') newParams.delete(key);
      } else {
        currentFilters[key] = condition;
      }
      
      if (Object.keys(currentFilters).length > 0) {
        newParams.set('filters', JSON.stringify(currentFilters));
      } else {
        newParams.delete('filters');
      }
      return newParams;
    }, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('filters');
      newParams.delete('source');
      newParams.delete('vendor');
      return newParams;
    }, { replace: true });
  }

  // legacy getters
  const source = filters.source && filters.source.operator === 'in' ? filters.source.values?.join(',') || '' : '';
  const vendor = filters.vendor && filters.vendor.operator === 'in' ? filters.vendor.values?.join(',') || '' : '';
  const medium = filters.medium && filters.medium.operator === 'in' ? filters.medium.values?.join(',') || '' : '';

  return (
    <FilterContext.Provider value={{ 
      startDate, setStartDate: (val) => updateParam('startDate', val),
      endDate, setEndDate: (val) => updateParam('endDate', val),
      setDateRange,
      startMonth,
      endMonth,
      filters, setFilter, clearFilters,
      source, setSource: (val) => setFilter('source', val ? { operator: 'in', values: val.split(',') } : null),
      vendor, setVendor: (val) => setFilter('vendor', val ? { operator: 'in', values: val.split(',') } : null),
      medium, setMedium: (val) => setFilter('medium', val ? { operator: 'in', values: val.split(',') } : null)
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within a FilterProvider');
  return context;
};
