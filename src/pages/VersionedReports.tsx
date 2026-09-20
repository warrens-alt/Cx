import React, { useEffect, useMemo, useState } from 'react';
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
  useEffect(() => { setEvidence(null); setEvidenceError(null); setDefinition(null); }, [submitted, matches]);
  const inspect = async(metricId: string, group: string | null = null) => {
    if (!data) return;
    const executionId = data.executionId;
    setBusy(true); setEvidenceError(null); setEvidence(null);
    try { const result = await requestJson('/evidence',undefined,{ token:data.token,metricId,group }); if (result.executionId !== executionId) throw new Error('Evidence is from a different reporting execution'); setEvidence(result); }
    catch(e) { setEvidenceError(e instanceof Error ? e.message : 'Evidence request failed'); }
    finally { setBusy(false); }
  };
  const download = (payload: unknown, name: string) => { const href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})); const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000); };
  const metricValue=(m:MetricResult)=> m.value===null?'Unavailable':`${m.unit==='currency'?currency+' ':''}${exactNumber(m.value,m.unit==='currency'?2:0)}${m.unit==='percent'?'%':''}`;
  return <div className="max-w-[1500px] mx-auto p-4 sm:p-8 space-y-6">
    <header><p className="text-xs uppercase tracking-wide">Versioned analytical reporting</p><h1 className="text-2xl font-bold mt-1">Evidence reports</h1><p className="mt-2 text-sm">Snapshot-bound metrics, exact decimal values and traceable records. UTC dates are used explicitly; source completeness is assessed separately from calculation checks.</p></header>
    {catalogue.isLoading && <p role="status">Loading release catalogue…</p>}
    {catalogue.error && <div role="alert" className="enterprise-card p-5">{catalogue.error.message}<button className="block underline mt-2" onClick={()=>catalogue.refetch()}>Retry catalogue</button></div>}
    {catalogue.data && !catalogue.data.available && <section className="enterprise-card p-5" role="status"><h2 className="font-semibold">No approved release available</h2><p>{catalogue.data.reason}</p><p className="mt-2">No figures are substituted from legacy dashboards or demonstration data. Source contracts, warehouse checks and immutable snapshots must be published first.</p></section>}
    {catalogue.data?.release && <div className="enterprise-card p-4 text-sm"><strong>Available release: {catalogue.data.release.releaseId}</strong><p>Knowledge cutoff: {catalogue.data.release.cutoff}. {catalogue.data.release.sourceBatchIds.length} retained source batches.</p></div>}
    <form className="enterprise-card p-5 space-y-4" onSubmit={e=>{e.preventDefault();if(!catalogue.data?.available)return;setSubmitted({request:scope,releaseId:catalogue.data.release.releaseId});}}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="text-sm">From (UTC)<input required aria-label="From (UTC)" type="date" value={start} onChange={e=>setStart(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Through (UTC)<input required aria-label="Through (UTC)" type="date" value={end} onChange={e=>setEnd(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Observation cutoff (ISO UTC)<input required aria-label="Observation cutoff" value={cutoff} onChange={e=>setCutoff(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Date basis<select aria-label="Date basis" value={basis} onChange={e=>setBasis(e.target.value as any)} className="block border rounded p-2 w-full"><option value="capture_cohort">Lead capture cohort</option><option value="event_date">Individual event date</option></select></label>
        <label className="text-sm">Vendor (exact name)<input aria-label="Vendor" value={vendor} onChange={e=>setVendor(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Source (exact name)<input aria-label="Source" value={source} onChange={e=>setSource(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Medium (exact name)<input aria-label="Medium" value={medium} onChange={e=>setMedium(e.target.value)} className="block border rounded p-2 w-full" /></label>
        <label className="text-sm">Grouping<select aria-label="Grouping" value={grouping} onChange={e=>setGrouping(e.target.value as any)} className="block border rounded p-2 w-full"><option value="none">Totals only</option><option value="source">Source</option><option value="vendor">Vendor</option><option value="capture_month">Capture month (UTC)</option></select></label>
        <label className="text-sm">Money currency<input required aria-label="Currency" pattern="[A-Z]{3}" value={currency} onChange={e=>setCurrency(e.target.value)} className="block border rounded p-2 w-full" /></label>
      </div>
      <fieldset><legend className="font-semibold text-sm mb-2">Metrics</legend><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{METRICS.map(m=><label key={m.id} className="text-sm flex gap-2"><input type="checkbox" checked={metrics.includes(m.id)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id))}/>{m.label}</label>)}</div></fieldset>
      <button type="submit" disabled={!catalogue.data?.available || !metrics.length || report.isFetching} className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50">Create snapshot-bound report</button>
    </form>
    {submitted && !matches && <p role="status">The selection changed. Create a new report; previous figures are hidden to prevent scope confusion.</p>}
    {matches && report.isFetching && <p role="status">Calculating against the pinned release…</p>}
    {matches && report.error && <p role="alert">{report.error.message}</p>}
    {data && <section className="space-y-5" aria-label="Report results">
      <div className="enterprise-card p-4 text-sm"><p>Execution: <code className="break-all">{data.executionId}</code></p><p>Release {data.releaseId} · {data.metricVersion} · Event cutoff {data.request.observationCutoff}</p><p className="break-all">Query job: {data.queryJobId || 'Unavailable'}</p><button className="underline mr-4" onClick={()=>report.refetch()}>Revalidate and replay</button><button className="underline mt-2" onClick={()=>{const {token,...safe}=data;download(safe,`cx-${data.executionId.slice(0,12)}.json`);}}>Export exact report JSON</button></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{data.totals.map(m=><article key={m.metricId} className="enterprise-card p-5" data-testid={`metric-${m.metricId}`}>
        <h2 className="text-sm font-semibold">{METRIC_BY_ID[m.metricId].label}</h2><p className="text-2xl font-bold mt-2 break-words" data-testid="metric-value">{metricValue(m)}</p>
        <p className="text-xs mt-2">Calculation: {m.calculationStatus}. Evidence: {m.completeness}.</p>{m.reason&&<p className="text-xs mt-2">{m.reason}</p>}
        {m.denominator!==null&&<p className="text-xs mt-2">Numerator {exactNumber(m.numerator)} / denominator {exactNumber(m.denominator)}</p>}
        <div className="flex gap-3 mt-3 text-xs"><button className="underline" onClick={()=>setDefinition(m.metricId)}>Definition</button><button className="underline disabled:opacity-40" disabled={m.calculationStatus==='UNAVAILABLE'||busy} onClick={()=>inspect(m.metricId)}>Inspect records</button></div>
      </article>)}</div>
      {definition&&<aside className="enterprise-card p-5" aria-label="Metric definition"><h2 className="font-semibold">{METRIC_BY_ID[definition].label}</h2><p>{METRIC_BY_ID[definition].definition}</p><p className="text-sm mt-2">Grain: {METRIC_BY_ID[definition].grain}. Aggregation: {METRIC_BY_ID[definition].aggregation}.</p><p>{METRIC_BY_ID[definition].overlapWarning}</p></aside>}
      <div className="enterprise-card overflow-x-auto"><table className="enterprise-table w-full"><caption className="text-left p-4">Breakdown: {data.request.grouping}. Distinct populations may overlap; percentages are not averaged.</caption><thead><tr>{['Group','Metric','Value','Numerator','Denominator','Evidence'].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{data.groups.map((m,i)=><tr key={`${m.metricId}:${m.group}:${i}`}><td>{m.group??'Unspecified'}</td><th scope="row">{METRIC_BY_ID[m.metricId].label}</th><td>{metricValue(m)}</td><td>{exactNumber(m.numerator)}</td><td>{m.denominator===null?'Not applicable':exactNumber(m.denominator)}</td><td><button className="underline" disabled={busy} onClick={()=>inspect(m.metricId,m.group)}>{m.completeness}</button></td></tr>)}</tbody></table></div>
      <details className="enterprise-card p-5"><summary>Release validation and source evidence</summary><pre className="text-xs whitespace-pre-wrap break-all mt-3">{JSON.stringify({checks:data.validation,sources:data.sources,batches:data.sourceBatchIds},null,2)}</pre></details>
      {busy&&<p role="status">Reading evidence from the same snapshots…</p>}{evidenceError&&<p role="alert">{evidenceError}</p>}
      {evidence && evidence.executionId===data.executionId && <section className="enterprise-card p-5"><h2 className="font-semibold">Evidence: {METRIC_BY_ID[evidence.metricId].label}</h2><p>{evidence.rowCount} records. Truncation: no. Preview shows up to 20 records.</p><button className="underline my-3" onClick={()=>download(evidence,`cx-evidence-${evidence.metricId}.json`)}>Download complete scoped evidence JSON</button><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(evidence.rows.slice(0,20),null,2)}</pre></section>}
    </section>}
  </div>;
}
