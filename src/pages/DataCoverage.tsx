import DataVisual, { VisualTable } from '../components/visuals/DataVisual';
import React,{useEffect,useState} from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { DataState } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { useFilters } from '../lib/FilterContext';
import { exactNumber } from '../../contracts/format';
export default function DataCoverage(){
  const {data,loading,error,refetch}=useAnalyticsData<any>('source-coverage');
  const {selectedClient}=useClient(),{startDate,endDate}=useFilters();
  const [role,setRole]=useState('leads'),[result,setResult]=useState<any>(null),[failure,setFailure]=useState<string|null>(null),[checking,setChecking]=useState(false);
  const [controller,setController]=useState<AbortController|null>(null);
  useEffect(()=>{controller?.abort();setResult(null);setFailure(null);setChecking(false);},[role,selectedClient,startDate,endDate]);
  useEffect(()=>()=>controller?.abort(),[controller]);
  async function check(){
    controller?.abort();const request=new AbortController();setController(request);setChecking(true);setFailure(null);setResult(null);
    try{const q=new URLSearchParams({clientId:selectedClient,startDate,endDate});
      const response=await fetch(`/api/analytics/source-metrics/${role}?${q}`,{signal:request.signal,credentials:'same-origin'}),body=await response.json();
      if(!response.ok||!body.success)throw new Error(body.error||'Source metrics could not be read');
      if(!request.signal.aborted)setResult(body.data);
    }catch(e){if(!request.signal.aborted)setFailure(e instanceof Error?e.message:'Source query failed');}finally{if(!request.signal.aborted)setChecking(false);}
  }
  const visibleResult=result?.role===role&&result?.scope?.clientId===selectedClient&&result?.scope?.startDate===startDate&&result?.scope?.endDate===endDate?result:null;
  return <PageShell><PageHeader title="Source Field Mappings" description="Live source metadata, metric dependencies and API query evidence. Schema presence is not proof of data completeness."/>
    {loading||error||!data?<DataState loading={loading} error={error} empty={!data} retry={refetch}/>:<div className="space-y-5">
      <div className="enterprise-card p-5" role="note"><strong>{data.inventoryComplete?'Dataset inventory retrieved.':'Dataset inventory is incomplete.'}</strong><p>Mapped tables are checked independently. Unmapped tables are listed, not automatically joined. Approved Evidence Reports read their pinned fact snapshots, not these raw tables.</p></div>
      <section className="enterprise-card p-5"><h2 className="font-semibold mb-3">Configured Tables and API Consumers</h2><div className="overflow-x-auto"><VisualTable visual={{id:'sources.coverage',data:(data.sources)}} className="enterprise-table w-full" aria-label="Source table coverage"><thead><tr>{['Source','Physical Table','Schema Check','Metadata Row Count','API / Reports'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
        {data.sources.map((s:any)=><tr key={s.role}><th scope="row">{s.label}</th><td>{s.table??'Not configured'}</td><td>{s.status}{s.reason&&<p className="text-sm">{s.reason}</p>}</td><td>{s.rowCount==null?'Unavailable':exactNumber(s.rowCount)}</td><td>{s.api}<p className="text-sm">{s.legacyConsumers.join(', ')}</p></td></tr>)}
      </tbody></VisualTable></div><p className="text-xs mt-3">Metadata row counts are not period-filtered counts and can be unavailable for views.</p></section>
      <section className="enterprise-card p-5 space-y-4"><h2 className="font-semibold">Check Populated Source Metrics</h2><p className="text-sm">This runs an aggregate API query for the selected source and date range. Legacy vendor, source and medium filters are not applied in this source-level diagnostic. Counts use each table’s stated date field; they are not reconciled cohort totals.</p>
        <div className="flex flex-wrap items-end gap-3"><label className="cx-field"><span>Source to inspect</span><select value={role} onChange={e=>setRole(e.target.value)}>{data.sources.map((s:any)=><option value={s.role} key={s.role}>{s.label}</option>)}</select></label><button type="button" className="cx-button-primary" disabled={checking} onClick={check}>{checking?'Checking…':'Check source metrics'}</button></div>
        {failure&&<p role="alert">{failure}</p>}{visibleResult&&<div><p className="text-sm mb-3">{result.dateBasis} · {startDate} to {endDate}. {result.warning}</p><div className="overflow-x-auto"><VisualTable visual={{id:'sources.metrics',data:(result.metrics)}} className="enterprise-table w-full" aria-label="Populated source metrics"><thead><tr>{['Metric','Value','Status','Valid / Missing / Invalid Rows'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{result.metrics.map((m:any)=><tr key={m.id}><th scope="row">{m.label}</th><td>{m.value===null?'Unavailable':exactNumber(m.value)}</td><td>{m.status}{m.reason&&<p className="text-sm">{m.reason}</p>}</td><td>{[m.validRows,m.missingRows,m.invalidRows].map(v=>v==null?'—':exactNumber(v)).join(' / ')}</td></tr>)}</tbody></VisualTable></div><p className="text-xs mt-3 break-all">Query job: {result.queryJobId??'Unavailable'} · {result.table}</p></div>}
      </section>
      <section className="enterprise-card p-5"><h2 className="font-semibold">Unmapped Dataset Tables</h2><DataVisual id="sources.unmapped" data={data.unmappedTables}/>{data.unmappedTables.length?<ul className="mt-3 space-y-2">{data.unmappedTables.map((t:any)=><li key={t.table}><code className="break-all">{t.table}</code><p className="text-sm">{t.reason}</p></li>)}</ul>:<p className="text-sm mt-2">{data.inventoryComplete?'No additional tables were returned by the authorised dataset inventory.':'Unknown: at least one dataset could not be listed.'}</p>}</section>
      <section className="enterprise-card p-5"><h2 className="font-semibold">Evidence Report Dependencies</h2><p className="text-sm my-3">These metrics require canonical fact releases. Raw-table availability alone does not populate or approve a release.</p><div className="overflow-x-auto"><VisualTable visual={{id:'sources.dependencies',data:(data.metricLineage.versioned)}} className="enterprise-table w-full" aria-label="Metric fact dependencies"><thead><tr><th scope="col">Metric</th><th scope="col">Required Facts</th><th scope="col">API</th></tr></thead><tbody>{data.metricLineage.versioned.map((m:any)=><tr key={m.metricId}><th scope="row">{m.label}</th><td>{m.requiredFacts.join(', ')}</td><td>{m.api}</td></tr>)}</tbody></VisualTable></div></section>
    </div>}
  </PageShell>;
}
