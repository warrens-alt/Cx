import { VisualTable } from '../visuals/DataVisual';
import React, { useDeferredValue, useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { METRIC_BY_ID, type MetricResult, type Grouping } from '../../../contracts/reporting';
import { exactNumber } from '../../../contracts/format';
import { indexBreakdown, pageBreakdown, selectBreakdown, type BreakdownOrder } from '../../lib/breakdown';

export default function ReportBreakdown({ rows, grouping, busy, formatValue, inspect }:
  { rows: MetricResult[]; grouping: Grouping; busy: boolean; formatValue: (row: MetricResult) => string; inspect: (metricId: string, group: string | null, groupIsNull?: boolean) => void }) {
  const [search, setSearch] = useState(''), [metric, setMetric] = useState(''), [order, setOrder] = useState<BreakdownOrder>('group_asc');
  const [page, setPage] = useState(1), [size, setSize] = useState(25);
  const deferredSearch = useDeferredValue(search), statusId = useId();
  const index = useMemo(() => indexBreakdown(rows), [rows]);
  const options = useMemo(() => [...new Set(rows.map(row => row.metricId))], [rows]);
  const selected = useMemo(() => selectBreakdown(index, deferredSearch, metric, order), [index, deferredSearch, metric, order]);
  const view = pageBreakdown(selected, page, size), updating = deferredSearch !== search;
  const clear = () => { setSearch(''); setMetric(''); setOrder('group_asc'); setPage(1); };
  return <section className="enterprise-card cx-breakdown" aria-label="Report breakdown">
    <div className="cx-breakdown-header"><div><h2>Report breakdown</h2><p>Browse the returned rows without changing the report scope or its totals.</p></div><span className="cx-status">{rows.length.toLocaleString('en-GB')} returned rows</span></div>
    {rows.length > 0 && <div className="cx-breakdown-controls">
      <label className="cx-field cx-breakdown-search"><span>Search breakdown</span><div><Search size={16} aria-hidden="true"/><input type="search" value={search} maxLength={200} placeholder="Find a group or metric" aria-controls="report-breakdown-table" onChange={event => { setSearch(event.target.value); setPage(1); }}/></div></label>
      <label className="cx-field"><span>Metric in breakdown</span><select aria-label="Metric in breakdown" value={metric} onChange={event => { setMetric(event.target.value); setPage(1); setOrder('group_asc'); }}><option value="">All returned metrics</option>{options.map(id => <option key={id} value={id}>{METRIC_BY_ID[id].label}</option>)}</select></label>
      <label className="cx-field"><span>Order breakdown</span><select aria-label="Order breakdown" value={order} onChange={event => { setOrder(event.target.value as BreakdownOrder); setPage(1); }}><option value="group_asc">Group: A to Z</option><option value="group_desc">Group: Z to A</option><option value="value_desc" disabled={!metric}>Value: high to low (one metric)</option><option value="value_asc" disabled={!metric}>Value: low to high (one metric)</option></select></label>
    </div>}
    <p className="cx-breakdown-note" id={statusId} role="status" aria-live="polite">{updating ? 'Updating the displayed rows…' : `Showing ${view.first}–${view.last} of ${view.total.toLocaleString('en-GB')} matching rows.`} {rows.length > 0 && 'Search and pagination affect this table only; exports retain the complete report.'}</p>
    <div className="cx-breakdown-scroll" tabIndex={0} role="region" aria-label="Scrollable report breakdown" aria-describedby={statusId} aria-busy={updating}>
      <VisualTable visual={{id:'report.groups',data:(selected.map(item=>item.row)), context:{grouping,note:"Snapshot-bound groups matching the table filters, before pagination. Chart controls do not change report totals."}}} id="report-breakdown-table" className="enterprise-table w-full" aria-label="Report breakdown rows"><caption className="sr-only">Breakdown: {grouping}. Distinct populations may overlap. Percentages are not averaged.</caption>
        <thead><tr>{['Group', 'Metric', 'Value', 'Numerator', 'Denominator', 'Evidence'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{view.rows.map(({ row, index: originalIndex }) => <tr key={`${row.metricId}:${row.group}:${originalIndex}`}>
          <td>{row.group ?? 'Unspecified (missing value)'}</td><th scope="row">{METRIC_BY_ID[row.metricId].label}</th><td className="cx-breakdown-number">{formatValue(row)}</td><td className="cx-breakdown-number">{exactNumber(row.numerator)}</td><td className="cx-breakdown-number">{row.denominator === null ? 'Not applicable' : exactNumber(row.denominator)}</td>
          <td><button type="button" className="cx-link-button" disabled={busy || row.calculationStatus === 'UNAVAILABLE'} aria-label={`Inspect ${METRIC_BY_ID[row.metricId].label} records for ${row.group ?? 'Unspecified (missing value)'}`} onClick={() => inspect(row.metricId, row.group, row.group === null)}>{row.completeness}</button></td>
        </tr>)}
        {!view.rows.length && <tr><td colSpan={6} className="cx-empty-table">{rows.length ? 'No breakdown rows match these table filters.' : grouping === 'none' ? 'Totals-only report. No grouped breakdown was requested.' : 'No grouped records were returned.'}{rows.length > 0 && <button type="button" className="cx-link-button" onClick={clear}>Clear table filters</button>}</td></tr>}</tbody>
      </VisualTable>
    </div>
    {rows.length > 0 && <footer className="cx-breakdown-footer">
      <div className="cx-inline-actions"><label className="cx-field cx-page-size"><span>Rows per page</span><select aria-label="Rows per page" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1); }}>{[25,50,100].map(count => <option value={count} key={count}>{count}</option>)}</select></label>{(search || metric) && <button type="button" className="cx-button-secondary" onClick={clear}><X size={14}/>Clear table filters</button>}</div>
      <nav aria-label="Breakdown pages" className="cx-inline-actions"><button type="button" className="cx-icon-button" aria-label="Previous breakdown page" disabled={view.page === 1 || updating} onClick={() => setPage(view.page - 1)}><ChevronLeft size={18}/></button><span aria-live="polite">Page {view.page} of {view.pages}</span><button type="button" className="cx-icon-button" aria-label="Next breakdown page" disabled={view.page === view.pages || updating} onClick={() => setPage(view.page + 1)}><ChevronRight size={18}/></button></nav>
    </footer>}
  </section>;
}
