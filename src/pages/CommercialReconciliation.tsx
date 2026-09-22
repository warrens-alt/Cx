import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowRight, Download, Info, Search } from 'lucide-react';
import { PAGE_TITLES } from '../../contracts/naming';
import { compareExactDecimal, subtractExactDecimals } from '../../contracts/exactDecimal';
import { METRIC_BY_ID, type MetricResult } from '../../contracts/reporting';
import { exactNumber } from '../../contracts/format';
import { formatReportValue } from '../lib/reportPreflight';
import { exactMovement, metricValue, pivotReportGroups } from '../lib/evidenceWorkspace';
import { useEvidenceWorkspace } from '../lib/useEvidenceWorkspace';
import EvidenceScopeBar from '../components/operations/EvidenceScopeBar';
import WorkspaceState from '../components/operations/WorkspaceState';
import MetricRail from '../components/operations/MetricRail';
import ExactBarChart from '../components/operations/ExactBarChart';
import EvidenceInspector from '../components/operations/EvidenceInspector';
import { VisualTable } from '../components/visuals/DataVisual';

const METRICS = ['sale_events','activation_events','expected_value','approved_value','invoiced_value','collected_value'];
const STAGES = ['expected_value','approved_value','invoiced_value','collected_value'];
const available=(metric:MetricResult|null|undefined)=>metric?.calculationStatus==='CHECKED'?metric.value:null;
const exportRows=(rows:unknown[],name:string)=>{const href=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);};

export default function CommercialReconciliation() {
  const workspace=useEvidenceWorkspace({metrics:METRICS,grouping:'vendor',comparisons:true});
  const report=workspace.current.data, previous=workspace.previous.data, currency=workspace.request.currency;
  const rows=useMemo(()=>pivotReportGroups(report),[report]);
  const [search,setSearch]=useState(''), deferredSearch=useDeferredValue(search.trim().toLowerCase());
  const [sort,setSort]=useState('collected_value'), [selectedVendor,setSelectedVendor]=useState<string|null>(null), [inspection,setInspection]=useState<{metricId:string;group:string|null;label:string}|null>(null);
  const filtered=useMemo(()=>rows.filter(row=>!deferredSearch||row.group.toLowerCase().includes(deferredSearch)).sort((a,b)=>{const av=available(a.metrics[sort]),bv=available(b.metrics[sort]);return av===null&&bv===null?0:av===null?1:bv===null?-1:-compareExactDecimal(av,bv);}),[rows,deferredSearch,sort]);
  const format=(metric:MetricResult|null|undefined)=>metric?formatReportValue(metric,currency):'Unavailable';
  const total=(id:string)=>metricValue(report,id), prior=(id:string)=>metricValue(previous,id);
  const kpis=STAGES.map(id=>({id,label:METRIC_BY_ID[id].label,value:format(total(id)),change:exactMovement(available(total(id)),available(prior(id))),comparison:'vs previous comparable period',note:id==='collected_value'?'Signed collection changes only.':`${METRIC_BY_ID[id].definition}`,status:total(id)?.calculationStatus}));
  const gap=(left:string,right:string)=>{const a=available(total(left)),b=available(total(right));return a===null||b===null?'Unavailable':`${currency} ${exactNumber(subtractExactDecimals(a,b),2)}`;};
  const stageChart=STAGES.map(id=>({label:METRIC_BY_ID[id].label,value:available(total(id)),formatted:format(total(id))}));
  const selected=rows.find(row=>row.group===selectedVendor)??filtered[0];
  const loading=workspace.catalogue.isLoading||workspace.current.isLoading, error=workspace.catalogue.error||workspace.current.error;
  return <div className="cx-page cx-ops-page cx-commercial-page">
    <header className="cx-page-header"><div><p className="cx-ops-eyebrow">Commercial control</p><h1 className="text-page-title">{PAGE_TITLES['/reconciliation']}</h1><p>Follow recorded outcomes through expected, approved, invoiced and collected value without collapsing those stages into a single revenue label.</p></div><a className="cx-button-secondary" href="#commercial-ledger">Review ledger evidence <ArrowRight size={15}/></a></header>
    <EvidenceScopeBar releaseId={workspace.release?.releaseId} cutoff={workspace.release?.cutoff} busy={workspace.current.isFetching}/>
    <WorkspaceState loading={loading} error={error} missingRelease={workspace.catalogue.data&&!workspace.catalogue.data.available?workspace.catalogue.data.reason:null} scopeError={workspace.scopeError} retry={()=>{void workspace.catalogue.refetch();void workspace.current.refetch();}}/>
    {report&&<>
      <MetricRail items={kpis}/>
      <section className="cx-commercial-flow" aria-label="Commercial stage flow">{STAGES.map((id,index)=><React.Fragment key={id}><button type="button" onClick={()=>setInspection({metricId:id,group:null,label:METRIC_BY_ID[id].label})}><span>{index+1}</span><div><small>{METRIC_BY_ID[id].label}</small><strong>{format(total(id))}</strong></div></button>{index<STAGES.length-1&&<ArrowRight aria-hidden="true"/>}</React.Fragment>)}</section>
      <section className="cx-ops-analysis-grid"><ExactBarChart data={stageChart} title="Commercial stage values" description="Signed ledger deltas at each stage. Reversals reduce the relevant stage and remain visible in supporting evidence." onSelect={label=>{const id=STAGES.find(stage=>METRIC_BY_ID[stage].label===label);if(id)setInspection({metricId:id,group:null,label});}}/>
        <aside className="enterprise-card cx-commercial-gaps"><header><h2>Stage reconciliation gaps</h2><p>Arithmetic differences are descriptive balances, not loss or profit.</p></header><dl><div><dt>Expected less approved</dt><dd>{gap('expected_value','approved_value')}</dd></div><div><dt>Approved less invoiced</dt><dd>{gap('approved_value','invoiced_value')}</dd></div><div><dt>Invoiced less collected</dt><dd>{gap('invoiced_value','collected_value')}</dd></div></dl><p><Info size={16}/>Negative differences can arise from later-stage value or reversals; inspect ledger events before drawing a conclusion.</p></aside>
      </section>
      <section className="cx-commercial-controls"><article className="enterprise-card"><span>Agreement / rate card</span><strong>Evidence field available</strong><p>Commercial evidence exposes the recorded agreement version. No rate-card registry has been approved, so rates are not recalculated.</p></article><article className="enterprise-card"><span>Effective-date eligibility</span><strong>Contract foundation ready</strong><p>Deterministic vendor, currency, product, grade, event and effective-date resolution rejects overlapping versions.</p></article><article className="enterprise-card" data-status="unavailable"><span>Invoice matching</span><strong>Unavailable</strong><p>No approved invoice identity is present in the commercial fact contract. Invoiced stage events are not called matched invoices.</p></article><article className="enterprise-card" data-status="unavailable"><span>Collection matching</span><strong>Unavailable</strong><p>No approved collection identity is present. Collected ledger deltas remain distinct from bank settlement evidence.</p></article></section>
      <section id="commercial-ledger" className="enterprise-card cx-ops-table-card"><header><div><p className="cx-ops-eyebrow">Vendor reconciliation</p><h2>Commercial stage table</h2><p>Exact values grouped by vendor. Selecting a value opens records from the same release and execution.</p></div><button type="button" className="cx-button-secondary" onClick={()=>exportRows(filtered.map(row=>({vendor:row.group,...Object.fromEntries(STAGES.map(id=>[id,row.metrics[id]?.value??null]))})),`cx-commercial-${workspace.request.startDate}-${workspace.request.endDate}.json`)}><Download size={15}/>Export {filtered.length} matching rows</button></header>
        <div className="cx-ops-table-tools"><label><Search size={15}/><span className="sr-only">Search vendors</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search vendors"/></label><label>Sort by<select value={sort} onChange={event=>setSort(event.target.value)}>{STAGES.map(id=><option key={id} value={id}>{METRIC_BY_ID[id].label}</option>)}</select></label></div>
        <p className="cx-ops-table-count">{filtered.length} matching vendors · {rows.length} total returned</p><div className="cx-ops-table-scroll"><VisualTable initialView="table" visual={{id:'commercial.reconciliation',data:filtered,context:{currency}}} className="enterprise-table" aria-label="Commercial reconciliation by vendor"><thead><tr><th scope="col">Vendor</th><th scope="col">Recorded sales</th>{STAGES.map(id=><th key={id} scope="col">{METRIC_BY_ID[id].label}</th>)}<th scope="col">Invoice-to-collection gap</th></tr></thead><tbody>{filtered.map(row=>{const invoiced=available(row.metrics.invoiced_value),collected=available(row.metrics.collected_value);return <tr key={row.group} data-selected={selected?.group===row.group}><th scope="row"><button className="cx-link-button" type="button" onClick={()=>setSelectedVendor(row.group)}>{row.group}</button></th><td>{format(row.metrics.sale_events)}</td>{STAGES.map(id=><td key={id}>{row.metrics[id]?.calculationStatus==='CHECKED'?<button type="button" className="cx-ops-value-button" onClick={()=>setInspection({metricId:id,group:row.group,label:METRIC_BY_ID[id].label})}>{format(row.metrics[id])}</button>:'Unavailable'}</td>)}<td>{invoiced===null||collected===null?'Unavailable':`${currency} ${exactNumber(subtractExactDecimals(invoiced,collected),2)}`}</td></tr>;})}</tbody></VisualTable></div>
        {!filtered.length&&<p role="status" className="cx-ops-empty">No vendors matched the local search. No warehouse request was rerun.</p>}
      </section>
      <section className="enterprise-card cx-commercial-evidence-note"><h2>What this reconciliation does—and does not—prove</h2><div><p><strong>Supported:</strong> signed expected, approved, invoiced and collected ledger events, linked to a recorded sale and grouped by vendor.</p><p><strong>Not supported:</strong> authoritative profit, cost allocation, invoice-document matching or bank settlement matching. Those remain unavailable until approved contracts and identities exist.</p></div></section>
      <EvidenceInspector report={report} selection={inspection} onClose={()=>setInspection(null)}/>
    </>}
  </div>;
}
