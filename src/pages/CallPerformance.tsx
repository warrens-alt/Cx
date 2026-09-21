import { VisualTable } from '../components/visuals/DataVisual';
import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TableSkeleton } from '../components/Skeleton';
import { DiminishingReturnsChart } from '../components/charts/DiminishingReturnsChart';
import { DistributionBar } from '../components/charts/DistributionBar';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { METRICS } from '../lib/metrics';
import { LEGACY_LABELS as L } from '../../contracts/naming';
const number = (v: unknown, digits = 1) => v === null || v === undefined ? 'Unavailable' : Number(v).toLocaleString('en-GB', { maximumFractionDigits: digits });
const pct = (v: unknown) => v === null || v === undefined ? 'Unavailable' : number(v) + '%';
function Table({ headings, rows, visual }: { headings: string[]; rows: (string | number)[][]; visual: any }) {
  return <div className="overflow-x-auto"><VisualTable visual={visual} className="enterprise-table w-full"><thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headings.length}>No records returned for this view.</td></tr>}</tbody></VisualTable></div>;
}
export default function CallPerformance() {
  const { data, loading, error, refetch } = useAnalyticsData('calls');
  const { clientConfig } = useClient();
  const [tab,setTab] = useState('attempts'), [vendorSearch,setVendorSearch] = useState('');
  const currency = clientConfig?.currency || 'ZAR';
  const money = (v: unknown) => v === null || v === undefined ? 'Unavailable' : currency + ' ' + number(v,2);
  if (loading) return <PageShell><PageHeader title="Call Performance" /><TableSkeleton /></PageShell>;
  if (error || !data) return <PageShell><PageHeader title="Call Performance" /><div role="alert">{error || 'No report was returned.'}<button className="block underline mt-2" onClick={()=>refetch?.()}>Retry</button></div></PageShell>;
  const bands = data.chart || [], vendors = (data.vendors || []).filter((v:any) => v.vendor.toLowerCase().includes(vendorSearch.toLowerCase()));
  return <PageShell><PageHeader title="Call Performance" description="Recorded dialling activity. A call attempt is not proof of contact, resolution or a sale." />
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard title={L.called} value={data.calledLeads} subtitle="Lead records with a first-call timestamp" lineage={METRICS.called_leads} />
        <KpiCard title={L.total_calls} value={data.totalCalls} subtitle="Legacy call counters; not independently deduplicated events" lineage={METRICS.total_calls} />
        <KpiCard title={L.calls_per_called_lead} value={data.avgCalls} subtitle="Recorded call attempts / dialled leads" lineage={METRICS.calls_per_called_lead} />
        <KpiCard title={L.one_call_rate} value={data.oneCallRate} suffix="%" subtitle={`${number(data.oneCallLeads,0)} leads with exactly one attempt / dialled leads; not a resolution rate`} />
        <KpiCard title={L.repeat_call_rate} value={data.repeatCallRate} suffix="%" subtitle={`${number(data.repeatCallLeads,0)} leads with two or more attempts / dialled leads`} />
        <KpiCard title="Recorded Call Duration" value={data.totalDurationHours} suffix="hours" subtitle="Sum of source duration counters; not verified talk time" />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Call report views">{[['attempts','Call-Attempt Bands'],['timing','First-Dial Timing'],['vendors','Vendor & Disposition Records']].map(([id,label]) => <button key={id} onClick={()=>setTab(id)} aria-pressed={tab===id} className="border rounded px-3 py-2 text-sm">{label}</button>)}</nav>
      {tab==='attempts' && <>
        <p className="text-sm">Each band counts lead records by their recorded total attempts. These are not outcomes achieved on a particular attempt. The returned bands start at one attempt; zero-call leads are not included.</p>
        <div className="grid lg:grid-cols-2 gap-6">
          <DiminishingReturnsChart title="Recorded Outcomes by Call-Attempt Band" subtitle="Outcome lead flags / lead records in each band. Association does not establish an effect of making more calls."
            data={bands} volumeKey="current" volumeName="Leads in Band" primaryLineKey="rpc" primaryLineName="RPC / Leads in Band (%)" secondaryLineKey="sale" secondaryLineName="Sales / Leads in Band (%)" />
          <DistributionBar title="Lead Counts by Recorded Attempts" subtitle="Counts of lead records, not call events or distinct consumers." data={bands} bucketKey="bucket" valueKey="current" />
        </div>
        <section className="enterprise-card p-5"><h2 className="font-semibold mb-3">Lead-Level Outcomes</h2><Table visual={{id:'calls.bands',data:bands}} headings={['Call-Attempt Band','Lead Records','RPC / Leads in Band (%)','Sales / Leads in Band (%)','Activations / Leads in Band (%)','Recorded Revenue / Lead','Recorded Revenue']}
          rows={bands.map((b:any)=>[b.bucket,number(b.current,0),pct(b.rpc),pct(b.sale),pct(b.activation),money(b.revPerLead),money(b.totalRevenue)])}/></section>
      </>}
      {tab==='timing' && <>
        <p className="text-sm">Counts are dialled lead records grouped by their first recorded dial, not total attempts or answered calls. Hours use the legacy timestamp interpretation; only hours 06–22 are returned. No operating roster or optimal calling window is inferred.</p>
        <div className="grid lg:grid-cols-2 gap-6">{[['hourly','First-Dial Hour','label'],['dayOfWeek','First-Dial Weekday','day']].map(([key,title,label]) => <section key={key} className="enterprise-card p-5"><h2 className="font-semibold mb-3">{title}</h2><Table visual={{id:key==='hourly'?'calls.hourly':'calls.weekdays',data:data[key]||[]}} headings={[title,'Dialled Leads','RPC / Dialled Leads (%)','Sales / Dialled Leads (%)','Recorded Revenue']}
          rows={(data[key]||[]).map((r:any)=>[r[label],number(r.volume,0),pct(r.rpcRate),pct(r.saleRate),money(r.revenue)])}/></section>)}</div>
      </>}
      {tab==='vendors' && <>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Vendor Transaction Summary</h2>
          <p className="text-sm">Fetched leads are distinct lead IDs; the dialled and outcome counts below are transaction-row flags. Rates are row ratios, not deduplicated lead conversion rates. Recorded call counters may overlap across legacy transaction rows.</p>
          <label className="text-sm block">Find Vendor<input className="block border rounded p-2" value={vendorSearch} onChange={e=>setVendorSearch(e.target.value)}/></label>
          <Table visual={{id:'calls.vendors',data:vendors}} headings={['Vendor','Fetched Leads','Dialled Transaction Rows','Attempts / Dialled Row','One-Call Rows / Dialled Rows (%)','RPC Flag Rows / Dialled Rows (%)','Sale Flag Rows / Dialled Rows (%)','Recorded Revenue / Dialled Row']}
            rows={vendors.map((v:any)=>[v.vendor,number(v.totalLeads,0),number(v.calledLeads,0),number(v.avgCallsPerLead),pct(v.oneCallRate),pct(v.rpcRate),pct(v.saleRate),money(v.revPerLead)])}/>
        </section>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Recorded Dispositions</h2>
          <p className="text-sm">Transaction IDs are counted within each disposition. Percentages use flag-row counts / distinct transaction IDs; records may overlap. Share refers to the returned top-ten groups only.</p>
          <Table visual={{id:'calls.dispositions',data:data.dispositions||[]}} headings={['Disposition','Distinct Transaction IDs','Share of Returned Groups (%)','RPC Flag Rows / Transaction IDs (%)','Sale Flag Rows / Transaction IDs (%)','Recorded Revenue']}
            rows={(data.dispositions||[]).map((d:any)=>[d.disposition,number(d.volume,0),pct(d.share),pct(d.rpcRate),pct(d.saleRate),money(d.revenue)])}/>
        </section>
      </>}
    </div>
  </PageShell>;
}
