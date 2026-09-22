import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Columns3, Download, Info, Search } from 'lucide-react';
import { PAGE_TITLES } from '../../contracts/naming';
import { compareExactDecimal } from '../../contracts/exactDecimal';
import { METRIC_BY_ID, type MetricResult, type ReportResult } from '../../contracts/reporting';
import { formatReportValue } from '../lib/reportPreflight';
import { exactMovement, metricValue, pivotReportGroups } from '../lib/evidenceWorkspace';
import { createEvidenceReport } from '../lib/reportingClient';
import { useEvidenceWorkspace } from '../lib/useEvidenceWorkspace';
import EvidenceScopeBar from '../components/operations/EvidenceScopeBar';
import WorkspaceState from '../components/operations/WorkspaceState';
import MetricRail from '../components/operations/MetricRail';
import ExactBarChart from '../components/operations/ExactBarChart';
import EvidenceInspector from '../components/operations/EvidenceInspector';
import { VisualTable } from '../components/visuals/DataVisual';

const METRICS = ['delivered_episodes','called_episodes','call_attempts','call_coverage','sale_events','activation_events','sale_activation_rate','expected_value','approved_value','invoiced_value','collected_value'];
const LEAD_METRICS = ['fetched_leads'];
const CHART_METRICS = ['delivered_episodes','call_coverage','sale_events','activation_events','collected_value'];
const TABLE_COLUMNS = ['delivered_episodes','called_episodes','call_attempts','call_coverage','sale_events','activation_events','sale_activation_rate','expected_value','approved_value','invoiced_value','collected_value'];

function availableValue(metric: MetricResult | null | undefined): string | null { return metric?.calculationStatus === 'CHECKED' ? metric.value : null; }
function exportRows(rows: unknown[], filename: string) { const href=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=href;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(href),1000); }

export default function VendorPerformance() {
  const workspace = useEvidenceWorkspace({ metrics: METRICS, grouping: 'vendor', comparisons: true });
  const leadTotals = useEvidenceWorkspace({ metrics: LEAD_METRICS, grouping: 'none', comparisons: true });
  const report = workspace.current.data;
  const previous = workspace.previous.data;
  const matched = workspace.matched.data;
  const currency = workspace.request.currency;
  const [chartMetric,setChartMetric]=useState('delivered_episodes'), [search,setSearch]=useState(''), [sortMetric,setSortMetric]=useState('delivered_episodes');
  const [direction,setDirection]=useState<'asc'|'desc'>('desc'), [page,setPage]=useState(0), [selectedVendor,setSelectedVendor]=useState<string|null>(null);
  const [visible,setVisible]=useState(()=>new Set(TABLE_COLUMNS));
  const [inspection,setInspection]=useState<{metricId:string;group:string|null;label:string}|null>(null);
  const deferredSearch=useDeferredValue(search.trim().toLowerCase());
  const rows=useMemo(()=>pivotReportGroups(report),[report]);
  const previousRows=useMemo(()=>pivotReportGroups(previous),[previous]);
  const matching=useMemo(()=>rows.filter(row=>!deferredSearch||row.group.toLowerCase().includes(deferredSearch)).sort((a,b)=>{
    const av=availableValue(a.metrics[sortMetric]), bv=availableValue(b.metrics[sortMetric]);
    const compared=av===null&&bv===null?0:av===null?1:bv===null?-1:compareExactDecimal(av,bv);
    return direction==='asc'?compared:-compared;
  }),[rows,deferredSearch,sortMetric,direction]);
  useEffect(()=>{setPage(0);},[deferredSearch,sortMetric,direction]);
  useEffect(()=>{if(!selectedVendor&&rows[0])setSelectedVendor(rows[0].group);if(selectedVendor&&!rows.some(row=>row.group===selectedVendor))setSelectedVendor(rows[0]?.group??null);},[rows,selectedVendor]);
  const selectedCurrent=rows.find(row=>row.group===selectedVendor), selectedPrevious=previousRows.find(row=>row.group===selectedVendor);
  const sourceRequest=useMemo(()=>selectedVendor?{...workspace.request,grouping:'source' as const,filters:{...workspace.request.filters,vendor:[selectedVendor]}}:null,[workspace.request,selectedVendor]);
  const sourceReport=useQuery<ReportResult>({queryKey:['vendor-source-breakdown',workspace.release?.releaseId,sourceRequest],queryFn:({signal})=>createEvidenceReport(sourceRequest!,workspace.release!.releaseId,signal),enabled:!!sourceRequest&&!!workspace.release&&!workspace.scopeError,retry:false,staleTime:Infinity});
  const format=(metric:MetricResult|null|undefined)=>metric?formatReportValue(metric,currency):'Unavailable';
  const total=(id:string)=>metricValue(report,id), previousTotal=(id:string)=>metricValue(previous,id);
  const kpi=(id:string,note:string)=>{const currentMetric=id==='fetched_leads'?metricValue(leadTotals.current.data,id):total(id),previousMetric=id==='fetched_leads'?metricValue(leadTotals.previous.data,id):previousTotal(id);return {id,label:METRIC_BY_ID[id].label,value:format(currentMetric),change:exactMovement(availableValue(currentMetric),availableValue(previousMetric)),comparison:`vs ${workspace.previousPeriod.startDate} — ${workspace.previousPeriod.endDate}`,note,status:currentMetric?.calculationStatus};};
  const chartRows=matching.slice(0,12).map(row=>({label:row.group,value:availableValue(row.metrics[chartMetric]),formatted:format(row.metrics[chartMetric]),secondary:availableValue(previousRows.find(item=>item.group===row.group)?.metrics[chartMetric]),secondaryFormatted:`Previous: ${format(previousRows.find(item=>item.group===row.group)?.metrics[chartMetric])}`}));
  const driverIds=[['delivered_episodes','Volume'],['call_coverage','Calling coverage'],['sale_events','Sales events'],['activation_events','Activation events'],['collected_value','Collected amount']] as const;
  const pageRows=matching.slice(page*10,page*10+10), pageCount=Math.max(1,Math.ceil(matching.length/10));
  const toggle=(id:string)=>setVisible(old=>{const next=new Set(old);next.has(id)?next.delete(id):next.add(id);return next;});
  const loading=workspace.catalogue.isLoading||workspace.current.isLoading||leadTotals.current.isLoading;
  const error=workspace.catalogue.error||workspace.current.error||leadTotals.current.error;
  return <div className="cx-page cx-ops-page">
    <header className="cx-page-header"><div><p className="cx-ops-eyebrow">Management workspace</p><h1 className="text-page-title">{PAGE_TITLES['/vendors']}</h1><p>Compare vendor supply, delivery, observed calling, recorded outcomes and commercial stages from one approved evidence release.</p></div><a className="cx-button-secondary" href="#vendor-table">Review vendor evidence <ArrowRight size={15}/></a></header>
    <EvidenceScopeBar releaseId={workspace.release?.releaseId} cutoff={workspace.release?.cutoff} busy={workspace.current.isFetching}/>
    <WorkspaceState loading={loading} error={error} missingRelease={workspace.catalogue.data&&!workspace.catalogue.data.available?workspace.catalogue.data.reason:null} scopeError={workspace.scopeError} retry={()=>{void workspace.catalogue.refetch();void workspace.current.refetch();}}/>
    {report&&<>
      <MetricRail items={[kpi('fetched_leads','Distinct captured leads in the selected scope; vendor rows are not summed because populations can overlap.'),kpi('delivered_episodes','Observed successful vendor delivery episodes.'),kpi('call_coverage','Delivered episodes with a subsequent observed call.'),kpi('sale_activation_rate','Distinct sales with at least one observed activation.'),kpi('collected_value','Signed collected-stage ledger changes; not expected or invoiced value.')]}/>
      <section className="cx-ops-analysis-grid"><div className="cx-ops-primary">
        <div className="cx-ops-viewbar" aria-label="Vendor chart controls"><div><strong>Vendor comparison</strong><span>Local controls — no new warehouse query</span></div><label>Measure<select value={chartMetric} onChange={event=>setChartMetric(event.target.value)}>{CHART_METRICS.map(id=><option key={id} value={id}>{METRIC_BY_ID[id].label}</option>)}</select></label></div>
        <ExactBarChart data={chartRows} title={`${METRIC_BY_ID[chartMetric].label} by vendor`} description="Exact values are retained in labels and the evidence table. Bar lengths use display-only coordinates." onSelect={setSelectedVendor}/>
      </div><aside className="enterprise-card cx-ops-periods"><header><h2>Period comparison</h2><p>Current, previous comparable period and previous matched calendar days.</p></header>{[['Current',report],['Previous',previous],['Matched days',matched]].map(([label,data])=><div key={label as string}><span>{label as string}</span><strong>{format(metricValue(data as ReportResult|undefined,chartMetric))}</strong><small>{label==='Current'?`${workspace.request.startDate} — ${workspace.request.endDate}`:label==='Previous'?`${workspace.previousPeriod.startDate} — ${workspace.previousPeriod.endDate}`:`${workspace.matchedPeriod.startDate} — ${workspace.matchedPeriod.endDate}`}</small></div>)}</aside></section>
      <section className="enterprise-card cx-ops-driver" aria-label="Descriptive driver decomposition"><header><div><p className="cx-ops-eyebrow">Where movement appears</p><h2>{selectedVendor??'Select a vendor'} · descriptive change signals</h2><p>Signals compare independent measures with the previous period. They are not additive contributions and do not claim causation.</p></div><span className="cx-status">Previous comparable period</span></header>
        <div>{driverIds.map(([id,label])=>{const current=availableValue(selectedCurrent?.metrics[id]),prior=availableValue(selectedPrevious?.metrics[id]);return <article key={id}><span>{label}</span><strong>{format(selectedCurrent?.metrics[id])}</strong><small>{exactMovement(current,prior)===null?'No comparable value':`${exactMovement(current,prior)}% vs previous`}</small></article>;})}<article data-status="unavailable"><span>Contact (RPC)</span><strong>Unavailable</strong><small>RPC is not inferred from a sale; no approved RPC fact exists in this release.</small></article></div>
      </section>
      <section className="cx-ops-secondary-grid"><div className="enterprise-card cx-ops-breakdown"><header><div><h2>Source mix · {selectedVendor}</h2><p>Delivery episodes grouped by source for the selected vendor.</p></div></header>{sourceReport.isLoading?<p role="status">Calculating source mix…</p>:sourceReport.error?<p role="alert">Source mix unavailable — this section could not be calculated.</p>:<ExactBarChart data={pivotReportGroups(sourceReport.data).slice(0,8).map(row=>({label:row.group,value:availableValue(row.metrics.delivered_episodes),formatted:format(row.metrics.delivered_episodes)}))} title="Delivery source mix" description="Source groups use the same selected-period release and vendor population."/>}</div>
        <div className="enterprise-card cx-ops-coverage"><h2>Class and colour coverage</h2><p className="cx-ops-unavailable"><Info size={18}/>Unavailable in the approved release contract. Class and colour fields are not attached to the versioned lead fact, so no vendor split is inferred from legacy rows.</p><dl><div><dt>Source status</dt><dd>Not mapped to versioned fact</dd></div><div><dt>Missing-data policy</dt><dd>Unavailable, not zero</dd></div><div><dt>Next evidence step</dt><dd>Approve lead classification fields and release reconciliation.</dd></div></dl></div></section>
      <section id="vendor-table" className="enterprise-card cx-ops-table-card"><header><div><p className="cx-ops-eyebrow">Vendor evidence</p><h2>Performance table</h2><p>Exact snapshot-bound values. Select a vendor or inspect the supporting records for any measured value.</p></div><button type="button" className="cx-button-secondary" onClick={()=>exportRows(matching.map(row=>({vendor:row.group,...Object.fromEntries(Object.entries(row.metrics).map(([id,metric])=>[id,metric.value]))})),`cx-vendors-${workspace.request.startDate}-${workspace.request.endDate}.json`)}><Download size={15}/>Export {matching.length} matching rows</button></header>
        <div className="cx-ops-table-tools"><label><Search size={15}/><span className="sr-only">Search vendors</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search vendors"/></label><label>Sort by<select value={sortMetric} onChange={event=>setSortMetric(event.target.value)}>{TABLE_COLUMNS.map(id=><option key={id} value={id}>{METRIC_BY_ID[id].label}</option>)}</select></label><button type="button" className="cx-button-secondary" onClick={()=>setDirection(old=>old==='desc'?'asc':'desc')}>{direction==='desc'?'Highest first':'Lowest first'}</button><details><summary><Columns3 size={15}/>Columns</summary><div>{TABLE_COLUMNS.map(id=><label key={id}><input type="checkbox" checked={visible.has(id)} onChange={()=>toggle(id)}/>{METRIC_BY_ID[id].label}</label>)}</div></details></div>
        <p className="cx-ops-table-count">Showing {matching.length?page*10+1:0}–{Math.min((page+1)*10,matching.length)} of {matching.length} matching vendors · {rows.length} total returned</p>
        <div className="cx-ops-table-scroll"><VisualTable initialView="table" visual={{id:'vendor.performance',data:pageRows,context:{currency}}} className="enterprise-table" aria-label="Vendor performance evidence"><thead><tr><th scope="col">Vendor</th>{TABLE_COLUMNS.filter(id=>visible.has(id)).map(id=><th key={id} scope="col">{METRIC_BY_ID[id].label}</th>)}</tr></thead><tbody>{pageRows.map(row=><tr key={row.group} data-selected={selectedVendor===row.group}><th scope="row"><button type="button" className="cx-link-button" onClick={()=>setSelectedVendor(row.group)}>{row.group}</button></th>{TABLE_COLUMNS.filter(id=>visible.has(id)).map(id=><td key={id}>{row.metrics[id]?.calculationStatus==='CHECKED'?<button type="button" className="cx-ops-value-button" onClick={()=>setInspection({metricId:id,group:row.group,label:METRIC_BY_ID[id].label})}>{format(row.metrics[id])}</button>:<span title={row.metrics[id]?.reason??'Required evidence unavailable'}>Unavailable</span>}</td>)}</tr>)}</tbody></VisualTable></div>
        {!matching.length&&<p className="cx-ops-empty" role="status">No vendor groups matched the local search. The reporting result was not changed.</p>}
        <footer><span>Page {Math.min(page+1,pageCount)} of {pageCount}</span><div><button type="button" className="cx-button-secondary" disabled={page===0} onClick={()=>setPage(old=>old-1)}>Previous</button><button type="button" className="cx-button-secondary" disabled={page+1>=pageCount} onClick={()=>setPage(old=>old+1)}>Next</button></div></footer>
      </section>
      <EvidenceInspector report={report} selection={inspection} onClose={()=>setInspection(null)}/>
    </>}
  </div>;
}
