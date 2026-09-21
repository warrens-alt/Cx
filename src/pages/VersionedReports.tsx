import DataVisual from '../components/visuals/DataVisual';
import { Database, FileCheck2, ArrowRight, RefreshCw, Info, X } from 'lucide-react';
import { PAGE_TITLES } from '../../contracts/naming';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReportBreakdown from '../components/reporting/ReportBreakdown';
import { formatReportValue, unavailableDateMetrics, validateReportDraft } from '../lib/reportPreflight';
import { useClient } from '../lib/ClientContext';
import { METRICS, METRIC_BY_ID, type MetricResult, type ReportRequest, type ReportResult } from '../../contracts/reporting';
import { exactNumber } from '../../contracts/format';
async function requestJson(path: string, signal?: AbortSignal, body?: unknown) {
  const res = await fetch('/api/reporting' + path, { signal, credentials: 'same-origin', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success !== true || !json.data) throw new Error(typeof json?.error === 'string' ? json.error : `Report request failed (${res.status}). Retry the request.`);
  return json.data;
}
export default function VersionedReports() {
  const { selectedClient } = useClient();
  const queryClient = useQueryClient();
  const [cancelled, setCancelled] = useState(false), [showValidation, setShowValidation] = useState(false);
  const catalogue = useQuery({ queryKey: ['reporting-catalogue', selectedClient], queryFn: ({ signal }) => requestJson('/catalogue?' + new URLSearchParams({ tenantId: selectedClient }), signal), retry: false, staleTime: 60000, refetchOnWindowFocus: false });
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
  const currentRelease = catalogue.data?.available ? catalogue.data.release : null;
  const scopeError = useMemo(() => validateReportDraft(scope, currentRelease?.cutoff), [scope, currentRelease?.cutoff]);
  const unavailableMetrics = useMemo(() => unavailableDateMetrics(scope), [scope]);
  const selectionMatches = !!submitted && JSON.stringify(scope) === JSON.stringify(submitted.request);
  const matches = selectionMatches && !!currentRelease && submitted?.releaseId === currentRelease.releaseId;
  const report = useQuery<ReportResult>({ queryKey: ['versioned-report', submitted], queryFn: ({ signal }) => requestJson('/reports',signal,submitted), enabled: !!submitted && matches, retry: false, refetchOnWindowFocus: false, staleTime: Infinity, gcTime: 120000 });
  const data = matches && !report.isFetching && !report.error && !catalogue.isFetching && !catalogue.error ? report.data : null;
  useEffect(() => {
    evidenceController.current?.abort(); setBusy(false); setEvidence(null); setEvidenceError(null); setDefinition(null);
    return () => evidenceController.current?.abort();
  }, [submitted, matches, report.isFetching, catalogue.isFetching, data?.executionId]);
  useEffect(() => {
    if (submitted && !matches) void queryClient.cancelQueries({ queryKey: ['versioned-report', submitted], exact: true });
  }, [matches, submitted, queryClient]);
  const submit = () => {
    if (!currentRelease || catalogue.error || catalogue.isFetching || scopeError || report.isFetching) return;
    setCancelled(false);
    if (matches) { void report.refetch(); return; }
    setSubmitted({ request: scope, releaseId: currentRelease.releaseId });
  };
  const cancelRequest = () => {
    if (submitted) void queryClient.cancelQueries({ queryKey: ['versioned-report', submitted], exact: true });
    evidenceController.current?.abort(); setSubmitted(null); setCancelled(true);
  };
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
  const metricValue = (metric: MetricResult) => formatReportValue(metric, data?.request.currency || currency);
  return <div className="cx-page cx-report">
    <header className="cx-page-header"><div><h1 className="text-page-title">{PAGE_TITLES['/reports']}</h1><p>Build a report from a fixed data release. Every metric keeps its definition, exact value and supporting records.</p></div><a className="cx-button-secondary" href="#report-scope"><FileCheck2 size={16}/>Configure report</a></header>
    <ol className="cx-report-workflow" aria-label="Report workflow"><li aria-current={!data?'step':undefined}>1. Scope and metrics</li><li aria-current={report.isFetching?'step':undefined}>2. Run pinned report</li><li aria-current={data?'step':undefined}>3. Inspect and export</li></ol>
    {catalogue.isLoading && <p role="status">Loading release catalogue…</p>}
    {catalogue.error && <div role="alert" className="enterprise-card p-5">{catalogue.error.message}<button className="block underline mt-2" onClick={()=>catalogue.refetch()}>Retry catalogue</button></div>}
    {catalogue.data && !catalogue.data.available && <section className="cx-report-empty" role="status"><Database className="cx-empty-icon" size={28} aria-hidden="true"/><h2>No approved release available</h2><p>{catalogue.data.reason}</p><p className="mt-2">No figures are substituted from legacy dashboards or demonstration data. Source contracts, warehouse checks and immutable snapshots must be published first.</p></section>}
    {catalogue.data?.release && <div className="cx-release-strip"><Database size={19} aria-hidden="true"/><div><strong>Available release: {catalogue.data.release.releaseId}</strong><p>Data Available Through: {catalogue.data.release.cutoff}. {catalogue.data.release.sourceBatchIds.length} retained source batches.</p></div><span className="cx-release-label">Fixed source snapshots</span></div>}
    <form id="report-scope" className="enterprise-card cx-report-form" aria-describedby={currentRelease && scopeError ? "report-preflight" : undefined} onSubmit={e=>{e.preventDefault();submit();}}>
      <div className="cx-report-form-heading"><div><h2>Reporting scope</h2><p>Choose the population and observation window. Dates below are explicitly UTC.</p></div><span className="cx-status">{metrics.length} metrics selected</span></div>
      <div className="cx-report-fields">
        <label className="cx-field"><span>From (UTC)</span><input required aria-label="From (UTC)" type="date" max={end || undefined} value={start} onChange={e=>setStart(e.target.value)}  /></label>
        <label className="cx-field"><span>Through (UTC)</span><input required aria-label="Through (UTC)" type="date" min={start || undefined} max={currentRelease?.cutoff?.slice(0,10)} value={end} onChange={e=>setEnd(e.target.value)}  /></label>
        <label className="cx-field"><span>Observation cutoff (ISO UTC)</span><input required aria-label="Observation cutoff" spellCheck={false} autoComplete="off" value={cutoff} onChange={e=>setCutoff(e.target.value)}  /></label>
        <label className="cx-field"><span>Date basis</span><select aria-label="Date basis" value={basis} onChange={e=>setBasis(e.target.value as any)} ><option value="capture_cohort">Lead Capture Cohort</option><option value="event_date">Event Date</option></select></label>
        <label className="cx-field"><span>Vendor (exact name)</span><input aria-label="Vendor" value={vendor} onChange={e=>setVendor(e.target.value)}  /></label>
        <label className="cx-field"><span>Source (exact name)</span><input aria-label="Source" value={source} onChange={e=>setSource(e.target.value)}  /></label>
        <label className="cx-field"><span>Medium (exact name)</span><input aria-label="Medium" value={medium} onChange={e=>setMedium(e.target.value)}  /></label>
        <label className="cx-field"><span>Grouping</span><select aria-label="Grouping" value={grouping} onChange={e=>setGrouping(e.target.value as any)} ><option value="none">Totals only</option><option value="source">Source</option><option value="vendor">Vendor</option><option value="capture_month">Capture month (UTC)</option></select></label>
        <label className="cx-field"><span>Currency</span><input required aria-label="Currency" pattern="[A-Z]{3}" value={currency} onChange={e=>setCurrency(e.target.value)}  /></label>
      </div>
      <fieldset className="cx-metric-picker"><legend>Metrics</legend><p>Keep event counts, lead counts and commercial amounts distinct.</p><div className="cx-metric-options">{METRICS.map(m=><label key={m.id} className="cx-metric-choice" data-selected={metrics.includes(m.id)}><input type="checkbox" checked={metrics.includes(m.id)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id))}/><span>{m.label}</span></label>)}</div></fieldset>
      {currentRelease && scopeError && <p id="report-preflight" className="cx-preflight" role="status"><Info size={16} aria-hidden="true"/>{scopeError}</p>}
      {unavailableMetrics.length > 0 && <p className="cx-preflight cx-preflight-note" role="note">{unavailableMetrics.join(', ')} {unavailableMetrics.length === 1 ? 'requires' : 'require'} a capture cohort. These metrics will remain unavailable in Event Date mode; your selection has not been changed.</p>}
      <footer className="cx-report-form-footer"><p id="report-run-reason"><Info size={14} aria-hidden="true"/>{!currentRelease?'An approved release is required before running a report.':catalogue.isFetching?'Checking the available release…':scopeError||'Source completeness is separate from calculation checks.'}</p><button type="submit" aria-describedby="report-run-reason" disabled={!currentRelease || !!catalogue.error || catalogue.isFetching || !!scopeError || report.isFetching} className="cx-button-primary">{report.isFetching?<RefreshCw size={15} className="animate-spin"/>:<ArrowRight size={15}/>}Create snapshot-bound report</button></footer>
    </form>
    {submitted && selectionMatches && !matches && <p className="cx-preflight" role="status">The available release changed or is unavailable. Create a new report from the current release.</p>}
    {submitted && !selectionMatches && <p role="status">The selection changed. Create a new report; previous figures are hidden to prevent scope confusion.</p>}
    {matches && report.isFetching && <div className="cx-request-state" role="status"><RefreshCw size={17} className="animate-spin" aria-hidden="true"/><div><strong>Calculating against the pinned release…</strong><p>Previous results and exports stay hidden during revalidation.</p></div><button type="button" className="cx-button-secondary" onClick={cancelRequest}>Cancel request</button><small>Cancels the browser request, not a warehouse job already running.</small></div>}
    {cancelled && <p className="cx-preflight cx-preflight-note" role="status">Request cancelled. Your reporting scope is unchanged.</p>}
    {matches && report.error && <div className="cx-request-state cx-request-error" role="alert"><p>{report.error.message}</p><button type="button" className="cx-button-secondary" onClick={()=>report.refetch()}>Retry report</button></div>}
    {data && <section className="cx-report-results" aria-label="Report results">
      <div className="cx-execution-strip"><h2>Report results</h2><p>Execution: <code className="break-all">{data.executionId}</code></p><p>Release {data.releaseId} · {data.metricVersion} · Event cutoff {data.request.observationCutoff}</p><p className="break-all">Query job: {data.queryJobId || 'Unavailable'}</p><button className="cx-link-button mr-4" onClick={()=>report.refetch()}>Revalidate and replay</button><button className="cx-link-button mt-2" onClick={()=>{const {token,...safe}=data;download(safe,`cx-${data.executionId.slice(0,12)}.json`);}}>Export exact report JSON</button></div>
      <DataVisual id="report.totals" data={data.totals} context={{note:`Snapshot ${data.releaseId} · ${data.metricVersion} · ${data.request.startDate} to ${data.request.endDate}. Each metric retains its own unit and population.`}}/>
      <div className="cx-result-grid">{data.totals.map(m=><article key={m.metricId} className="enterprise-card cx-result-card" data-testid={`metric-${m.metricId}`}>
        <h2 className="text-sm font-semibold">{METRIC_BY_ID[m.metricId].label}</h2><p className="cx-exact-value" data-testid="metric-value">{metricValue(m)}</p>
        <p className="cx-result-status"><span className="cx-status" data-status={m.calculationStatus}>Calculation: {m.calculationStatus}</span><span className="cx-status" data-status={m.completeness}>Evidence: {m.completeness}</span></p>{m.reason&&<p className="text-xs mt-2">{m.reason}</p>}
        {m.denominator!==null&&<p className="text-xs mt-2">{METRIC_BY_ID[m.metricId].numeratorLabel}: {exactNumber(m.numerator)} / {METRIC_BY_ID[m.metricId].denominatorLabel}: {exactNumber(m.denominator)}</p>}
        <div className="cx-result-actions"><button className="cx-link-button" onClick={()=>setDefinition(m.metricId)}>Definition</button><button className="cx-link-button disabled:opacity-40" disabled={m.calculationStatus==='UNAVAILABLE'||busy} onClick={()=>inspect(m.metricId)}>Inspect records</button></div>
      </article>)}</div>
      {definition&&<aside className="cx-definition-panel" aria-label="Metric definition"><button type="button" className="cx-icon-button float-right" aria-label="Close metric definition" onClick={()=>setDefinition(null)}><X size={18}/></button><h2 className="font-semibold">{METRIC_BY_ID[definition].label}</h2><p>{METRIC_BY_ID[definition].definition}</p><p className="mt-2 text-sm"><strong>Formula:</strong> {METRIC_BY_ID[definition].formula}</p><p className="mt-1 text-sm"><strong>Unit counted:</strong> {METRIC_BY_ID[definition].numeratorLabel}</p><p className="text-sm mt-2">Grain: {METRIC_BY_ID[definition].grain}. Aggregation: {METRIC_BY_ID[definition].aggregation}.</p><p>{METRIC_BY_ID[definition].overlapWarning}</p></aside>}
      <div key={data.executionId}><ReportBreakdown rows={data.groups} grouping={data.request.grouping} busy={busy} formatValue={metricValue} inspect={inspect}/></div>
      <details className="enterprise-card cx-report-details" onToggle={event=>setShowValidation(event.currentTarget.open)}><summary>Release validation and source evidence</summary>{showValidation && <pre className="text-xs whitespace-pre-wrap break-all mt-3">{JSON.stringify({checks:data.validation,sources:data.sources,batches:data.sourceBatchIds},null,2)}</pre>}</details>
      {busy&&<p role="status">Reading evidence from the same snapshots…</p>}{evidenceError&&<p role="alert">{evidenceError}</p>}
      {evidence && evidence.executionId===data.executionId && <section className="enterprise-card cx-evidence-panel"><h2 className="font-semibold">Evidence: {METRIC_BY_ID[evidence.metricId].label}</h2><p>{evidence.rowCount} records. Truncation: no. Preview shows up to 20 records.</p><button className="cx-link-button my-3" onClick={()=>download(evidence,`cx-evidence-${evidence.metricId}.json`)}>Download complete scoped evidence JSON</button><DataVisual id="report.evidence" data={evidence.rows} context={{title:`Evidence Records · ${METRIC_BY_ID[evidence.metricId].label}`,note:`All returned evidence rows for execution ${data.executionId}; not just the 20-row text preview. Distinct entities are not inferred from row counts.`}}/><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(evidence.rows.slice(0,20),null,2)}</pre></section>}
    </section>}
  </div>;
}
