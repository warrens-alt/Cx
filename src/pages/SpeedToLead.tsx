import { VisualTable } from '../components/visuals/DataVisual';
import React from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TableSkeleton } from '../components/Skeleton';
import { DistributionBar } from '../components/charts/DistributionBar';
import { DiminishingReturnsChart } from '../components/charts/DiminishingReturnsChart';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
const labels = ['0–5 Whole Minutes','>5–15 Whole Minutes','>15–60 Whole Minutes','>60 Whole Minutes'];
export default function SpeedToLead() {
  const {data,loading,error,refetch}=useAnalyticsData('speed-to-lead');
  const {clientConfig}=useClient();
  if(loading)return <PageShell><PageHeader title="Delivery & First-Dial Timing"/><TableSkeleton/></PageShell>;
  if(error||!data?.buckets)return <PageShell><PageHeader title="Delivery & First-Dial Timing"/><div role="alert">{error||'No timing report was returned.'}<button className="block underline" onClick={()=>refetch?.()}>Retry</button></div></PageShell>;
  const buckets=data.buckets.map((b:any,i:number)=>({...b,bucket:labels[i]||b.bucket}));
  const capture=data.metrics?.find((m:any)=>m.id==='capture_to_delivery'||m.name==='Capture to Delivery');
  const firstDial=data.metrics?.find((m:any)=>m.id==='delivery_to_first_dial'||m.name==='Delivery to First Call');
  const n=(v:any)=>v==null?'Unavailable':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
  const pct=(v:any)=>v==null?'Unavailable':n(v)+'%';
  return <PageShell><PageHeader title="Delivery & First-Dial Timing" description="Elapsed timing for vendor transaction rows with recorded delivery and first-dial timestamps."/>
    <div className="space-y-6"><p className="text-sm">Both averages use the dialled transaction subset, not every delivered lead. The legacy query measures whole elapsed minutes, excludes first dials before delivery, and does not adjust for operating hours. A first dial is not first contact.</p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Capture-to-Delivery Mean" value={capture?.avg??'Unavailable'} subtitle="Dialled transaction rows with valid capture-to-delivery chronology"/>
        <KpiCard title="Delivery-to-First-Dial Mean" value={firstDial?.avg??'Unavailable'} subtitle="Dialled transaction rows; elapsed time"/>
        <KpiCard title="Rows at 0–5 Whole Minutes" value={buckets[0]?.leads??null} subtitle="Transaction rows, not distinct leads"/>
        <KpiCard title="Rows at 0–60 Whole Minutes" value={buckets.slice(0,3).reduce((sum:number,b:any)=>sum+Number(b.leads||0),0)} subtitle="Includes the 60-whole-minute boundary"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-6"><DistributionBar title="Transaction Rows by First-Dial Delay" subtitle="Whole-minute delivery-to-first-dial intervals." data={buckets} bucketKey="bucket" valueKey="leads"/>
        <DiminishingReturnsChart title="Recorded Outcome Shares by Delay" subtitle="Outcome flag rows / rows in each interval; no causal effect or target is implied." data={buckets}
          volumeKey="leads" volumeName="Transaction Rows" primaryLineKey="rpc" primaryLineName="RPC Flag Rows / Rows in Band (%)" secondaryLineKey="sale" secondaryLineName="Sale Flag Rows / Rows in Band (%)"/>
      </div>
      <section className="enterprise-card p-5 overflow-x-auto"><h2 className="font-semibold mb-3">Transaction-Level Timing and Outcome Flags</h2>
        <VisualTable visual={{id:'speed.bands',data:(buckets)}} className="enterprise-table w-full"><thead><tr>{['Elapsed Whole Minutes','Transaction Rows','RPC Flag Rows','Sale Flag Rows','Sale Flags with Recorded Revenue','Activation Flag Rows','Recorded Revenue','Recorded Revenue / Row'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{buckets.map((b:any)=><tr key={b.bucket}><th scope="row">{b.bucket}</th><td>{n(b.leads)}</td><td>{n(b.rpcCount)}<small className="block">{pct(b.rpc)} of rows in band</small></td>
            <td>{n(b.saleCount)}<small className="block">{pct(b.sale)} of rows in band</small></td><td>{n(b.billableCount)}<small className="block">{pct(b.billableRate)} of sale flag rows</small></td>
            <td>{n(b.actCount)}<small className="block">{pct(b.activation)} of sale flag rows</small></td><td>{clientConfig?.currency||'ZAR'} {n(b.revenue)}</td><td>{clientConfig?.currency||'ZAR'} {n(b.revPerLead)}</td></tr>)}</tbody>
        </VisualTable>
      </section>
    </div>
  </PageShell>;
}
