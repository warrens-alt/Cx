import { Database, FileCheck2, ArrowRight, Download, RefreshCw, Info, X, Check, ChevronDown } from 'lucide-react';
import { PAGE_TITLES } from '../../contracts/naming';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClient } from '../lib/ClientContext';
import { METRICS, METRIC_BY_ID, type MetricResult, type ReportRequest, type ReportResult } from '../../contracts/reporting';
import { exactNumber } from '../../contracts/format';
async function requestJson(path: string, signal?: AbortSignal, body?: unknown) {
  const res = await fetch('/api/reporting' + path, { signal, credentials: 'same-origin', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const json = await res.json();
  if (!res.ok || json.success !== true) throw new Error(json.error || 'Report request failed');
  return json.data;
}
export default function VersionedReports() {
  const { selectedClient } = useClient();
  const catalogue = useQuery({ queryKey: ['reporting-catalogue', selectedClient], queryFn: ({ signal }) => requestJson('/catalogue?' + new URLSearchParams({ tenantId: selectedClient }), signal), retry: false });
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [cutoff, setCutoff] = useState('');
  const [vendor, setVendor] = useState(''), [source, setSource] = useState(''), [medium, setMedium] = useState('');
  const [basis, setBasis] = useState<ReportRequest['dateBasis']>('capture_cohort');
  const [grouping, setGrouping] = useState<ReportRequest['grouping']>('source');
  const [currency, setCurrency] = useState('ZAR');
  const [metrics, setMetrics] = useState<string[]>(['fetched_leads','delivered_episodes','call_attempts','call_coverage','sale_events','activation_events','expected_value','collected_value']);
  const [submitted, setSubmitted] = useState<{ request: ReportRequest; releaseId: string } | null>(null);
  const [evidence, setEvidence] = useState<any>(null), [evidenceError, setEvidenceError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const evidenceController = useRef<AbortController | null>(null);
  const [definition, setDefinition] = useState<string | null>(null);
  useEffect(() => {
    const last = catalogue.data?.release?.cutoff;
    if (last && !cutoff) { setStart(last.slice(0,7)+'-01'); setEnd(last.slice(0,10)); setCutoff(last); }
  }, [catalogue.data, cutoff]);
  const scope = useMemo<ReportRequest>(() => ({ tenantId: selectedClient, startDate: start, endDate: end, observationCutoff: cutoff,
    dateBasis: basis, grouping, currency, metrics, filters: { ...(vendor ? {vendor:[vendor]} : {}), ...(source ? {source:[source]} : {}), ...(medium ? {medium:[medium]} : {}) } }), [selectedClient,start,end,cutoff,basis,grouping,currency,metrics,vendor,source,medium]);
  const matches = !!submitted && JSON.stringify(scope) === JSON.stringify(submitted.request);
  const report = useQuery<ReportResult>({ queryKey: ['versioned-report', submitted], queryFn: ({ signal }) => requestJson('/reports',signal,submitted), enabled: !!submitted && matches, retry: false, refetchOnWindowFocus: false, staleTime: Infinity });
  const data = matches && !report.error && !catalogue.error ? report.data : null;
  useEffect(() => {
    evidenceController.current?.abort(); setBusy(false); setEvidence(null); setEvidenceError(null); setDefinition(null);
    return () => evidenceController.current?.abort();
  }, [submitted, matches]);
  const inspect = async(metricId: string, group: string | null = null) => {
    if (!data) return;
    evidenceController.current?.abort();
    const controller = new AbortController(); evidenceController.current = controller;
    const executionId = data.executionId;
    setBusy(true); setEvidenceError(null); setEvidence(null);
    try { const result = await requestJson('/evidence',controller.signal,{ token:data.token,metricId,group }); if (result.executionId !== executionId) throw new Error('Evidence is from a different reporting execution'); if (!controller.signal.aborted) setEvidence(result); }
    catch(e) { if (!controller.signal.aborted) setEvidenceError(e instanceof Error ? e.message : 'Evidence request failed'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const download = (payload: unknown, name: string) => { const href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})); const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000); };
  const metricValue=(m:MetricResult)=> m.value===null?'Unavailable':`${m.unit==='currency'?currency+' ':''}${exactNumber(m.value,m.unit==='currency'?2:0)}${m.unit==='percent'?'%':''}`;
  return <div className="cx-page cx-report">
    <header className="cx-page-header"><div><h1 className="text-page-title">{PAGE_TITLES['/reports']}</h1><p>Build a report from a fixed data release. Every metric keeps its definition, exact value and supporting records.</p></div><a className="cx-button-secondary" href="#report-scope"><FileCheck2 size={16}/>Configure report</a></header>
    {catalogue.isLoading && <p role="status">Loading release catalogue…</p>}
    {catalogue.error && <div role="alert" className="enterprise-card p-5">{catalogue.error.message}<button className="block underline mt-2" onClick={()=>catalogue.refetch()}>Retry catalogue</button></div>}
    {catalogue.data && !catalogue.data.available && <section className="cx-report-empty" role="status"><Database className="cx-empty-icon" size={28} aria-hidden="true"/><h2>No approved release available</h2><p>{catalogue.data.reason}</p><p className="mt-2">No figures are substituted from legacy dashboards or demonstration data. Source contracts, warehouse checks and immutable snapshots must be published first.</p></section>}
    {catalogue.data?.release && <div className="cx-release-strip"><Database size={19} aria-hidden="true"/><div><strong>Available release: {catalogue.data.release.releaseId}</strong><p>Data Available Through: {catalogue.data.release.cutoff}. {catalogue.data.release.sourceBatchIds.length} retained source batches.</p></div><span className="cx-release-label">Fixed source snapshots</span></div>}
    <form id="report-scope" className="enterprise-card cx-report-form" onSubmit={e=>{e.preventDefault();if(!catalogue.data?.available)return;setSubmitted({request:scope,releaseId:catalogue.data.release.releaseId});}}>
      <div className="cx-report-form-heading"><div><h2>Reporting scope</h2><p>Choose the population and observation window. Dates below are explicitly UTC.</p></div><span className="cx-status">{metrics.length} metrics selected</span></div>
      <div className="cx-report-fields">
        <label className="cx-field"><span>From (UTC)</span><input required aria-label="From (UTC)" type="date" value={start} onChange={e=>setStart(e.target.value)}  /></label>
        <label className="cx-field"><span>Through (UTC)</span><input required aria-label="Through (UTC)" type="date" value={end} onChange={e=>setEnd(e.target.value)}  /></label>
        <label className="cx-field"><span>Observation cutoff (ISO UTC)</span><input required aria-label="Observation cutoff" value={cutoff} onChange={e=>setCutoff(e.target.value)}  /></label>
        <label className="cx-field"><span>Date basis</span><select aria-label="Date basis" value={basis} onChange={e=>setBasis(e.target.value as any)} ><option value="capture_cohort">Lead Capture Cohort</option><option value="event_date">Event Date</option></select></label>
        <label className="cx-field"><span>Vendor (exact name)</span><input aria-label="Vendor" value={vendor} onChange={e=>setVendor(e.target.value)}  /></label>
        <label className="cx-field"><span>Source (exact name)</span><input aria-label="Source" value={source} onChange={e=>setSource(e.target.value)}  /></label>
        <label className="cx-field"><span>Medium (exact name)</span><input aria-label="Medium" value={medium} onChange={e=>setMedium(e.target.value)}  /></label>
        <label className="cx-field"><span>Grouping</span><select aria-label="Grouping" value={grouping} onChange={e=>setGrouping(e.target.value as any)} ><option value="none">Totals only</option><option value="source">Source</option><option value="vendor">Vendor</option><option value="capture_month">Capture month (UTC)</option></select></label>
        <label className="cx-field"><span>Currency</span><input required aria-label="Currency" pattern="[A-Z]{3}" value={currency} onChange={e=>setCurrency(e.target.value)}  /></label>
      </div>
      <fieldset className="cx-metric-picker"><legend>Metrics</legend><p>Keep event counts, lead counts and commercial amounts distinct.</p><div className="cx-metric-options">{METRICS.map(m=><label key={m.id} className="cx-metric-choice" data-selected={metrics.includes(m.id)}><input type="checkbox" checked={metrics.includes(m.id)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id))}/><span>{m.label}</span></label>)}</div></fieldset>
      <footer className="cx-report-form-footer"><p><Info size={14} aria-hidden="true"/>Source completeness is separate from calculation checks.</p><button type="submit" disabled={!catalogue.data?.available || !metrics.length || report.isFetching} className="cx-button-primary">{report.isFetching?<RefreshCw size={15} className="animate-spin"/>:<ArrowRight size={15}/>}Create snapshot-bound report</button></footer>
    </form>
    {submitted && !matches && <p role="status">The selection changed. Create a new report; previous figures are hidden to prevent scope confusion.</p>}
    {matches && report.isFetching && <p role="status">Calculating against the pinned release…</p>}
    {matches && report.error && <p role="alert">{report.error.message}</p>}
    {data && <section className="cx-report-results" aria-label="Report results">
      <div className="cx-execution-strip"><h2>Report results</h2><p>Execution: <code className="break-all">{data.executionId}</code></p><p>Release {data.releaseId} · {data.metricVersion} · Event cutoff {data.request.observationCutoff}</p><p className="break-all">Query job: {data.queryJobId || 'Unavailable'}</p><button className="cx-link-button mr-4" onClick={()=>report.refetch()}>Revalidate and replay</button><button className="cx-link-button mt-2" onClick={()=>{const {token,...safe}=data;download(safe,`cx-${data.executionId.slice(0,12)}.json`);}}>Export exact report JSON</button></div>
      <div className="cx-result-grid">{data.totals.map(m=><article key={m.metricId} className="enterprise-card cx-result-card" data-testid={`metric-${m.metricId}`}>
        <h2 className="text-sm font-semibold">{METRIC_BY_ID[m.metricId].label}</h2><p className="cx-exact-value" data-testid="metric-value">{metricValue(m)}</p>
        <p className="cx-result-status"><span className="cx-status" data-status={m.calculationStatus}>Calculation: {m.calculationStatus}</span><span className="cx-status" data-status={m.completeness}>Evidence: {m.completeness}</span></p>{m.reason&&<p className="text-xs mt-2">{m.reason}</p>}
        {m.denominator!==null&&<p className="text-xs mt-2">{METRIC_BY_ID[m.metricId].numeratorLabel}: {exactNumber(m.numerator)} / {METRIC_BY_ID[m.metricId].denominatorLabel}: {exactNumber(m.denominator)}</p>}
        <div className="cx-result-actions"><button className="cx-link-button" onClick={()=>setDefinition(m.metricId)}>Definition</button><button className="cx-link-button disabled:opacity-40" disabled={m.calculationStatus==='UNAVAILABLE'||busy} onClick={()=>inspect(m.metricId)}>Inspect records</button></div>
      </article>)}</div>
      {definition&&<aside className="cx-definition-panel" aria-label="Metric definition"><button type="button" className="cx-icon-button float-right" aria-label="Close metric definition" onClick={()=>setDefinition(null)}><X size={18}/></button><h2 className="font-semibold">{METRIC_BY_ID[definition].label}</h2><p>{METRIC_BY_ID[definition].definition}</p><p className="mt-2 text-sm"><strong>Formula:</strong> {METRIC_BY_ID[definition].formula}</p><p className="mt-1 text-sm"><strong>Unit counted:</strong> {METRIC_BY_ID[definition].numeratorLabel}</p><p className="text-sm mt-2">Grain: {METRIC_BY_ID[definition].grain}. Aggregation: {METRIC_BY_ID[definition].aggregation}.</p><p>{METRIC_BY_ID[definition].overlapWarning}</p></aside>}
      <div className="enterprise-card overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable report breakdown"><table className="enterprise-table w-full"><caption className="text-left p-4">Breakdown: {data.request.grouping}. Distinct populations may overlap; percentages are not averaged.</caption><thead><tr>{['Group','Metric','Value','Numerator','Denominator','Evidence'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.groups.length===0&&<tr><td colSpan={6} className="cx-empty-table">{data.request.grouping==='none'?'Totals-only report. No grouped breakdown was requested.':'No grouped records were returned.'}</td></tr>}{data.groups.map((m,i)=><tr key={`${m.metricId}:${m.group}:${i}`}><td>{m.group??'Unspecified'}</td><th scope="row">{METRIC_BY_ID[m.metricId].label}</th><td>{metricValue(m)}</td><td>{exactNumber(m.numerator)}</td><td>{m.denominator===null?'Not applicable':exactNumber(m.denominator)}</td><td><button className="underline" disabled={busy} onClick={()=>inspect(m.metricId,m.group)}>{m.completeness}</button></td></tr>)}</tbody></table></div>
      <details className="enterprise-card cx-report-details"><summary>Release validation and source evidence</summary><pre className="text-xs whitespace-pre-wrap break-all mt-3">{JSON.stringify({checks:data.validation,sources:data.sources,batches:data.sourceBatchIds},null,2)}</pre></details>
      {busy&&<p role="status">Reading evidence from the same snapshots…</p>}{evidenceError&&<p role="alert">{evidenceError}</p>}
      {evidence && evidence.executionId===data.executionId && <section className="enterprise-card cx-evidence-panel"><h2 className="font-semibold">Evidence: {METRIC_BY_ID[evidence.metricId].label}</h2><p>{evidence.rowCount} records. Truncation: no. Preview shows up to 20 records.</p><button className="cx-link-button my-3" onClick={()=>download(evidence,`cx-evidence-${evidence.metricId}.json`)}>Download complete scoped evidence JSON</button><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(evidence.rows.slice(0,20),null,2)}</pre></section>}
    </section>}
  </div>;
}
