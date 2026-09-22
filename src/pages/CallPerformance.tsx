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
import { exactNumber } from '../../contracts/format';
import { AlertTriangle } from 'lucide-react';

const number = (value: unknown) => typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value) ? exactNumber(value) : 'Unavailable';
const pct = (value: unknown) => value === null || value === undefined ? 'Unavailable' : `${number(value)}%`;
const coordinate = (value: unknown) => typeof value === 'string' && Number.isFinite(Number(value)) ? Number(value) : null;

function Table({ headings, rows, visual }: { headings: string[]; rows: React.ReactNode[][]; visual: any }) {
  return <div className="overflow-x-auto"><VisualTable visual={visual} className="enterprise-table w-full"><thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headings.length}>No records matched this selection.</td></tr>}</tbody></VisualTable></div>;
}

function SectionUnavailable({ section }: { section?: { status: string; reason: string | null } }) {
  if (!section || section.status === 'AVAILABLE') return null;
  return <div className="cx-section-unavailable" role="status"><AlertTriangle size={19} aria-hidden="true"/><div><strong>{section.status === 'SOURCE_UNAVAILABLE' ? 'Required source unavailable' : 'Section unavailable'}</strong><p>{section.reason || 'Unavailable — this section could not be calculated.'}</p></div></div>;
}

export default function CallPerformance() {
  const { data, loading, error, refetch } = useAnalyticsData('calls');
  const { clientConfig } = useClient();
  const [tab,setTab] = useState('attempts'), [vendorSearch,setVendorSearch] = useState('');
  const currency = clientConfig?.currency || 'ZAR';
  const money = (value: unknown) => value === null || value === undefined ? 'Unavailable' : `${currency} ${number(value)}`;
  if (loading) return <PageShell><PageHeader title="Call Performance" /><TableSkeleton /></PageShell>;
  if (error || !data) return <PageShell><PageHeader title="Call Performance" /><div role="alert">{error || 'No report was returned.'}<button className="block underline mt-2" onClick={()=>refetch?.()}>Retry</button></div></PageShell>;
  const bands = data.chart || [], vendors = (data.vendors || []).filter((v:any) => String(v.vendor).toLowerCase().includes(vendorSearch.toLowerCase()));
  // Floating point is confined to chart coordinates. Tables, tooltips and exports retain exact source strings.
  const chartBands = bands.map((band:any) => ({...band,current:coordinate(band.current),rpc:coordinate(band.rpc),sale:coordinate(band.sale),activation:coordinate(band.activation)}));
  return <PageShell><PageHeader title="Call Performance" description="Observed dialling activity. A call attempt is not proof of contact, resolution or a sale." />
    <div className="space-y-6">
      <SectionUnavailable section={data.sections?.summary}/>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard title={L.called} value={data.calledLeads} subtitle="Lead records with supported first-call evidence" lineage={METRICS.called_leads} />
        <KpiCard title={L.total_calls} value={data.totalCalls} subtitle="Distinct event-level dialler rows; HLC snapshot counters excluded" lineage={METRICS.total_calls} />
        <KpiCard title={L.calls_per_called_lead} value={data.avgCalls} subtitle="Observed call events / dialled leads" lineage={METRICS.calls_per_called_lead} />
        <KpiCard title={L.one_call_rate} value={data.oneCallRate} suffix="%" subtitle={`${number(data.oneCallLeads)} leads with exactly one observed attempt / dialled leads`} />
        <KpiCard title={L.repeat_call_rate} value={data.repeatCallRate} suffix="%" subtitle={`${number(data.repeatCallLeads)} leads with two or more observed attempts / dialled leads`} />
        <KpiCard title="Recorded Call Duration" value={data.totalDurationHours} suffix="hours" subtitle="Sum of event-level duration values; not verified talk time" />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Call report views">{[['attempts','Call-Attempt Bands'],['timing','First-Dial Timing'],['vendors','Vendor & Disposition Records']].map(([id,label]) => <button key={id} onClick={()=>setTab(id)} aria-pressed={tab===id} className="border rounded px-3 py-2 text-sm">{label}</button>)}</nav>
      {tab==='attempts' && <>
        <p className="text-sm">Each band counts lead records by distinct event-level dialler attempts. HLC snapshot counters and sale flags do not add calls. Observed RPC means supported dialler RPC evidence only.</p>
        <SectionUnavailable section={data.sections?.callAttemptBands}/>
        {data.sections?.callAttemptBands?.status === 'AVAILABLE' && <div className="grid lg:grid-cols-2 gap-6">
          <DiminishingReturnsChart title="Recorded Outcomes by Call-Attempt Band" subtitle="Outcome lead flags / lead records in each band. Association does not establish an effect of making more calls."
            data={chartBands} volumeKey="current" volumeName="Leads in Band" primaryLineKey="rpc" primaryLineName="Observed RPC / Leads in Band (%)" secondaryLineKey="sale" secondaryLineName="Sales / Leads in Band (%)" />
          <DistributionBar title="Lead Counts by Observed Attempts" subtitle="Counts of lead records by distinct call-event population." data={chartBands} bucketKey="bucket" valueKey="current" />
        </div>}
        {data.sections?.callAttemptBands?.status === 'AVAILABLE' && <section className="enterprise-card p-5"><h2 className="font-semibold mb-3">Lead-Level Outcomes</h2><Table visual={{id:'calls.bands',data:bands}} headings={['Call-Attempt Band','Lead Records','Observed RPC / Leads (%)','Sales / Leads (%)','Activations / Leads (%)','Recorded Value / Lead','Recorded Value']}
          rows={bands.map((b:any)=>[b.bucket,number(b.current),pct(b.rpc),pct(b.sale),pct(b.activation),money(b.revPerLead),money(b.totalRevenue)])}/></section>}
      </>}
      {tab==='timing' && <>
        <p className="text-sm">Counts are dialled lead records grouped by their first supported dial timestamp, not total attempts or answered calls. Hours use the configured source timestamp interpretation; no operating roster or optimal calling window is inferred.</p>
        <div className="grid lg:grid-cols-2 gap-6">{[['hourly','First-Dial Hour','label','firstDialHour'],['dayOfWeek','First-Dial Weekday','day','firstDialWeekday']].map(([key,title,label,section]) => <section key={key} className="enterprise-card p-5"><h2 className="font-semibold mb-3">{title}</h2><SectionUnavailable section={data.sections?.[section]}/>{data.sections?.[section]?.status === 'AVAILABLE' && <Table visual={{id:key==='hourly'?'calls.hourly':'calls.weekdays',data:data[key]||[]}} headings={[title,'Dialled Leads','Observed RPC / Dialled Leads (%)','Sales / Dialled Leads (%)','Recorded Value']}
          rows={(data[key]||[]).map((r:any)=>[r[label],number(r.volume),pct(r.rpcRate),pct(r.saleRate),money(r.revenue)])}/>}</section>)}</div>
      </>}
      {tab==='vendors' && <>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Vendor Transaction Summary</h2>
          <p className="text-sm">Fetched leads are distinct lead IDs. Observed attempts aggregate event-level dialler rows once at lead/vendor grain; repeated HLC transaction rows cannot multiply them.</p>
          <label className="text-sm block">Find Vendor<input className="block border rounded p-2" value={vendorSearch} onChange={e=>setVendorSearch(e.target.value)}/></label>
          <SectionUnavailable section={data.sections?.vendors}/>{data.sections?.vendors?.status === 'AVAILABLE' && <Table visual={{id:'calls.vendors',data:vendors}} headings={['Vendor','Fetched Leads','Dialled Rows','Attempts / Dialled Row','One-Call / Dialled (%)','Observed RPC / Dialled (%)','Sales / Dialled (%)','Recorded Value / Dialled Row']}
            rows={vendors.map((v:any)=>[v.vendor,number(v.totalLeads),number(v.calledLeads),number(v.avgCallsPerLead),pct(v.oneCallRate),pct(v.rpcRate),pct(v.saleRate),money(v.revPerLead)])}/>
          }
        </section>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Recorded Dispositions</h2>
          <p className="text-sm">Transaction IDs are counted within each disposition. Observed RPC is kept separate from sale evidence. Share refers to the returned top-ten groups only.</p>
          <SectionUnavailable section={data.sections?.dispositions}/>{data.sections?.dispositions?.status === 'AVAILABLE' && <Table visual={{id:'calls.dispositions',data:data.dispositions||[]}} headings={['Disposition','Distinct Transaction IDs','Share of Returned Groups (%)','Observed RPC / Transactions (%)','Sales / Transactions (%)','Recorded Value']}
            rows={(data.dispositions||[]).map((d:any)=>[d.disposition,number(d.volume),pct(d.share),pct(d.rpcRate),pct(d.saleRate),money(d.revenue)])}/>
          }
        </section>
      </>}
      <details className="enterprise-card p-4"><summary>Call evidence definition</summary><p className="text-sm mt-3">{data.rpcDefinition}</p><p className="text-sm">Numeric API values use {data.precision}; charts alone use approximate coordinates.</p></details>
    </div>
  </PageShell>;
}
