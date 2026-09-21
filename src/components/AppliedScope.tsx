import { X } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';
import { filterDescription, filterLabel } from '../lib/scopePresentation';

export default function AppliedScope() {
  const { startDate, endDate, filters, filterError, setFilter, clearFilters } = useFilters();
  if (filterError) return <span className="cx-scope-summary">Reporting selection needs attention</span>;
  return <div className="cx-applied-scope" aria-label="Applied reporting scope">
    <span className="cx-scope-summary">Capture dates: <strong>{startDate}</strong> to <strong>{endDate}</strong></span>
    {Object.entries(filters).map(([key, condition]) => <button type="button" className="cx-filter-chip" key={key}
      aria-label={`Remove ${filterLabel(key)} filter`} onClick={()=>setFilter(key,null)}>
      <span><strong>{filterLabel(key)}:</strong> {filterDescription(key,condition)}</span><X size={14} aria-hidden="true"/>
    </button>)}
    {!!Object.keys(filters).length && <button type="button" className="cx-link-button" onClick={clearFilters}>Clear filters</button>}
  </div>;
}
