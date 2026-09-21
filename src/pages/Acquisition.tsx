import { VisualTable } from '../components/visuals/DataVisual';
import React from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { DataState } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { exactNumber } from '../../contracts/format';
export default function Acquisition(){
  const {data,loading,error,refetch}=useAnalyticsData<any>('acquisition');
  return <PageShell><PageHeader title="Acquisition & Media" description="API-sourced media records. Platform lead actions are separate from ledger leads."/>
    {loading||error||!data?<DataState loading={loading} error={error} empty={!data} retry={refetch}/>:<div className="space-y-5">
      <div className="enterprise-card p-5" role="note"><strong>Financial metrics remain unavailable.</strong><p>{data.financialReason}</p><p className="text-sm mt-2">Scope: {data.scope.startDate} to {data.scope.endDate} · {data.dateBasis}. Source timezone is not independently verified.</p></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{data.metrics.map((m:any)=><article className="enterprise-card p-5" key={m.id}><h2 className="text-sm font-medium">{m.label}</h2><p className="text-2xl font-semibold mt-2">{m.value===null?'Unavailable':exactNumber(m.value)}</p><p className="text-xs mt-2">{m.status}</p>{m.reason&&<p className="text-sm mt-2">{m.reason}</p>}</article>)}</div>
      <section className="enterprise-card p-5"><h2 className="font-semibold mb-3">By Media Channel</h2><div className="overflow-x-auto"><VisualTable visual={{id:'media.groups',data:(data.groups)}} className="enterprise-table w-full" aria-label="Media channel metrics"><thead><tr><th scope="col">Channel</th>{data.metrics.map((m:any)=><th scope="col" key={m.id}>{m.label}</th>)}</tr></thead><tbody>
        {data.groups.map((g:any,i:number)=><tr key={i}><th scope="row">{g.group??'Unspecified'}</th>{g.metrics.map((m:any)=><td key={m.id}>{m.value===null?'Unavailable':exactNumber(m.value)}</td>)}</tr>)}
        {!data.groups.length&&<tr><td colSpan={data.metrics.length+1}>No media rows were returned for this period.</td></tr>}
      </tbody></VisualTable></div></section>
      <details className="enterprise-card p-4"><summary>Source and query evidence</summary><p className="text-sm mt-3 break-all">Table: {data.table}</p><p className="text-sm">Job: {data.queryJobId??'Unavailable'}</p><p className="text-sm">{data.validationStatus}. {data.warning}</p></details>
    </div>}
  </PageShell>;
}
