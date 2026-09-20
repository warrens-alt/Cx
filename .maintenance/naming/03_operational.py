from pathlib import Path
import re
R=Path.cwd()
def write(p,s):(R/p).write_text(s)
def edit(p,fn):f=R/p;f.write_text(fn(f.read_text()))
write('src/pages/CallPerformance.tsx', '''import React, { useState } from 'react';
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
const number = (v: unknown, digits = 1) => v === null || v === undefined ? 'Unavailable' : Number(v).toLocaleString('en-ZA', { maximumFractionDigits: digits });
const pct = (v: unknown) => v === null || v === undefined ? 'Unavailable' : number(v) + '%';
function Table({ headings, rows }: { headings: string[]; rows: (string | number)[][] }) {
  return <div className="overflow-x-auto"><table className="enterprise-table w-full"><thead><tr>{headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell,j) => <td key={j}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headings.length}>No records returned for this view.</td></tr>}</tbody></table></div>;
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
        <section className="enterprise-card p-5"><h2 className="font-semibold mb-3">Lead-Level Outcomes</h2><Table headings={['Call-Attempt Band','Lead Records','RPC / Leads in Band (%)','Sales / Leads in Band (%)','Activations / Leads in Band (%)','Recorded Revenue / Lead','Recorded Revenue']}
          rows={bands.map((b:any)=>[b.bucket,number(b.current,0),pct(b.rpc),pct(b.sale),pct(b.activation),money(b.revPerLead),money(b.totalRevenue)])}/></section>
      </>}
      {tab==='timing' && <>
        <p className="text-sm">Counts are dialled lead records grouped by their first recorded dial, not total attempts or answered calls. Hours use the legacy timestamp interpretation; only hours 06–22 are returned. No operating roster or optimal calling window is inferred.</p>
        <div className="grid lg:grid-cols-2 gap-6">{[['hourly','First-Dial Hour','label'],['dayOfWeek','First-Dial Weekday','day']].map(([key,title,label]) => <section key={key} className="enterprise-card p-5"><h2 className="font-semibold mb-3">{title}</h2><Table headings={[title,'Dialled Leads','RPC / Dialled Leads (%)','Sales / Dialled Leads (%)','Recorded Revenue']}
          rows={(data[key]||[]).map((r:any)=>[r[label],number(r.volume,0),pct(r.rpcRate),pct(r.saleRate),money(r.revenue)])}/></section>)}</div>
      </>}
      {tab==='vendors' && <>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Vendor Transaction Summary</h2>
          <p className="text-sm">Fetched leads are distinct lead IDs; the dialled and outcome counts below are transaction-row flags. Rates are row ratios, not deduplicated lead conversion rates. Recorded call counters may overlap across legacy transaction rows.</p>
          <label className="text-sm block">Find Vendor<input className="block border rounded p-2" value={vendorSearch} onChange={e=>setVendorSearch(e.target.value)}/></label>
          <Table headings={['Vendor','Fetched Leads','Dialled Transaction Rows','Attempts / Dialled Row','One-Call Rows / Dialled Rows (%)','RPC Flag Rows / Dialled Rows (%)','Sale Flag Rows / Dialled Rows (%)','Recorded Revenue / Dialled Row']}
            rows={vendors.map((v:any)=>[v.vendor,number(v.totalLeads,0),number(v.calledLeads,0),number(v.avgCallsPerLead),pct(v.oneCallRate),pct(v.rpcRate),pct(v.saleRate),money(v.revPerLead)])}/>
        </section>
        <section className="enterprise-card p-5 space-y-3"><h2 className="font-semibold">Recorded Dispositions</h2>
          <p className="text-sm">Transaction IDs are counted within each disposition. Percentages use flag-row counts / distinct transaction IDs; records may overlap. Share refers to the returned top-ten groups only.</p>
          <Table headings={['Disposition','Distinct Transaction IDs','Share of Returned Groups (%)','RPC Flag Rows / Transaction IDs (%)','Sale Flag Rows / Transaction IDs (%)','Recorded Revenue']}
            rows={(data.dispositions||[]).map((d:any)=>[d.disposition,number(d.volume,0),pct(d.share),pct(d.rpcRate),pct(d.saleRate),money(d.revenue)])}/>
        </section>
      </>}
    </div>
  </PageShell>;
}
''')
write('src/pages/SpeedToLead.tsx', '''import React from 'react';
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
  const n=(v:any)=>v==null?'Unavailable':Number(v).toLocaleString('en-ZA',{maximumFractionDigits:2});
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
        <table className="enterprise-table w-full"><thead><tr>{['Elapsed Whole Minutes','Transaction Rows','RPC Flag Rows','Sale Flag Rows','Sale Flags with Recorded Revenue','Activation Flag Rows','Recorded Revenue','Recorded Revenue / Row'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{buckets.map((b:any)=><tr key={b.bucket}><th scope="row">{b.bucket}</th><td>{n(b.leads)}</td><td>{n(b.rpcCount)}<small className="block">{pct(b.rpc)} of rows in band</small></td>
            <td>{n(b.saleCount)}<small className="block">{pct(b.sale)} of rows in band</small></td><td>{n(b.billableCount)}<small className="block">{pct(b.billableRate)} of sale flag rows</small></td>
            <td>{n(b.actCount)}<small className="block">{pct(b.activation)} of sale flag rows</small></td><td>{clientConfig?.currency||'ZAR'} {n(b.revenue)}</td><td>{clientConfig?.currency||'ZAR'} {n(b.revPerLead)}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  </PageShell>;
}
''')
p='src/pages/Outcomes.tsx';s=(R/p).read_text()
s=s.replace('Lead-level sale flags and transaction-level revenue matches.','Lead-level funnel counts and transaction-row sale flags.')
s=s.replace('title="Leads with Sales"','title="Sale Flags (Transaction Rows)"').replace('title="Leads with Sales and Recorded Revenue"','title="Sale Flags with Recorded Revenue"')
s=s.replace('title="Sales without Matched Revenue"','title="Sale Flags without Matched Revenue"').replace('Lead records with a sale flag','Transaction rows with a sale flag')
s=s.replace('lineage={METRICS.sales}','lineage={METRICS.transaction_sale_flags}').replace('lineage={METRICS.sales_with_revenue}','lineage={METRICS.transaction_sales_with_revenue}')
s=s.replace('% of leads with sales','% of sale flag rows').replace('% of leads with sales without matched revenue','% of sale flag rows without matched revenue').replace('} leads with sales</span>','} transaction rows with sale flags</span>')
s=s.replace('Average ticket yield','Recorded revenue / sale flag rows with recorded revenue').replace('Full funnel yield','Recorded revenue / distinct lead IDs')
s=s.replace('>Sale Events<','>Sale Flag Rows<').replace('>Billable %<','>Revenue-Matched / Sale Flag Rows (%)<')
s=s.replace('Recorded Revenue (Revenue > 0)','Recorded Revenue').replace('End-to-end progression and drop-off analysis from capture through billable realization.','Distinct lead IDs at each recorded stage. Sales with revenue are not necessarily delivered or contractually billable.')
s=s.replace("'5. Sale Event'","'5. Leads with Sales'").replace("'6. Sale Flags with Recorded Revenue'","'6. Leads with Sales and Recorded Revenue'")
s=s.replace("'Right-Party Contact'","'Leads with RPC'")
write(p,s)
for name in ['RoutingIntelligence','Revetting','DataTrust','ConsumerReentry']:
 p='src/pages/'+name+'.tsx';s=(R/p).read_text()
 replacements={'Total Revenue':'Recorded Revenue','Realized Rev':'Recorded Revenue','Rev / Lead':'Recorded Revenue / Lead','Rev / Consumer':'Recorded Revenue / Consumer',
  'Sale Event %':'Sales / Fetched Leads (%)','Billable Sale %':'Revenue-Matched Sales / Fetched Leads (%)','Call Rate %':'Dialled / Fetched Leads (%)','RPC Rate %':'RPC / Fetched Leads (%)','Delivered %':'Delivered / Fetched Leads (%)',
  'Original Billable Sale':'Revenue-Matched Sale Share (Original Leads)','Re-vetted Billable Sale':'Revenue-Matched Sale Share (Re-vetted Leads)',
  'Original Rev / Lead':'Recorded Revenue / Original Lead','Re-vetted Rev / Lead':'Recorded Revenue / Re-vetted Lead',
  'Billable Sale Rate':'Revenue-Matched Sale Share','paying sales':'leads with sales and recorded revenue',
  'Billable Sale':'Sale Flag with Recorded Revenue','Sale Event':'Sale Flag','Lifetime Leads':'Recorded Leads',
  'total realized revenue across all lifetime entries':'recorded revenue across retained entries','Deduplicated revenue':'Revenue summed by recorded consumer ID; not verified lifetime value',
  '1st Entry Billable Rate':'Revenue-Matched Sale Share (Single-Lead Consumers)', 'Repeat Billable Rate':'Revenue-Matched Sale Share (Repeat Consumers)',
  'Single Consumer Rev':'Recorded Revenue (Single-Lead Consumers)','Repeat Consumer Rev':'Recorded Revenue (Repeat Consumers)','Total Consumer Rev':'Recorded Revenue (All Consumers)',
  'Single-lead consumers':'Consumers with a revenue-matched sale / single-lead consumers','Recycled consumers':'Consumers with a revenue-matched sale / repeat consumers',
  'Audited Vendor Records':'Vendor Transaction Rows Checked','Hospital Plan Mismatches':'Hospital Flag / Timestamp Mismatches','Applied without plan flag':'Recorded flag and timestamp disagree',
 }
 for a,b in replacements.items():s=s.replace(a,b)
 if name=='ConsumerReentry':
  a=s.index('Consumers w/ Sale');b=s.index('</table>',a)
  fragment=s[a:b].replace('Sales / Fetched Leads (%)','Consumers with Sales / Consumers (%)').replace('Revenue-Matched Sales / Fetched Leads (%)','Consumers with Revenue-Matched Sales / Consumers (%)')
  s=s[:a]+fragment+s[b:]
 write(p,s)
p='contracts/legacyMetrics.ts';s=(R/p).read_text()
s=s.replace('  ...core,','''  ...core,
  transaction_sale_flags: { ...metric('transaction_sale_flags','Sale Flags (Transaction Rows)','COUNTIF(sale = true)','Sale Flag Rows'), grain:'vendor_transaction_row', source:'vw_lead_vendor_transactions' },
  transaction_sales_with_revenue: { ...metric('transaction_sales_with_revenue','Sale Flags with Recorded Revenue','COUNTIF(is_billable_sale = true)','Sale Flag Rows with Positive Recorded Revenue', 'N/A', null, 'records', 'Transaction-row sale flags with positive recorded revenue; not proof of sale delivery, contractual billability or cash collection.'), grain:'vendor_transaction_row', source:'vw_lead_vendor_transactions' },''',1)
write(p,s)
p='src/pages/SourceAnalysis.tsx';s=(R/p).read_text()
s=s.replace('row.callCoverage || row.callRate || 0','row.callCoverage ?? 0').replace('row.leadToSaleRate || row.saleRate || 0','row.leadToSaleRate ?? 0')
s=s.replace('Activation Rate','Activations / Revenue-Matched Sales').replace('>Activation %<','>Activations / Revenue-Matched Sales (%)<')
write(p,s)
p='src/pages/LeadExplorer.tsx';s=(R/p).read_text();s=s.replace('>Campaign<','>Traffic Medium<').replace('>Value<','>Recorded Revenue<').replace('>Calls<','>Recorded Call Attempts<')
write(p,s)
p='src/pages/DataCoverage.tsx';s=(R/p).read_text();s=s.replace('Parameter Coverage','Parameter Mapping Coverage').replace('Tables Scanned','Tables Listed').replace('Source Conflicts','Measured Source Conflicts')
s=s.replace('multi-vendor telemetry coverage','vendor field presence and positive outcome flags')
s=s.replace('>Delivery<','>Attempted-Delivery Timestamp Present (%)<').replace('>1st Call<','>First-Dial Timestamp Present (%)<').replace('>Last Call<','>Last-Dial Timestamp Present (%)<')
s=s.replace('>RPC<','>Positive RPC Flag (%)<').replace('>Sale<','>Positive Sale Flag (%)<').replace('>Activation<','>Positive Activation Flag (%)<').replace('>Revenue<','>Positive Recorded Revenue (%)<')
write(p,s)
p='src/pages/DataQuality.tsx';s=(R/p).read_text();s=s.replace('Latest Sale','Latest Capture among Leads with Sales').replace('Data Freshness','Latest Recorded Timestamps')
write(p,s)
p='src/components/charts/DiminishingReturnsChart.tsx';s=(R/p).read_text();s=s.replace("volumeName = 'Leads Contacted'","volumeName = 'Records in Band'").replace("primaryLineName = 'RPC Rate'","primaryLineName = 'RPC Flag Share (%)'").replace("secondaryLineName = 'Sale Rate'","secondaryLineName = 'Sale Flag Share (%)'")
write(p,s)
p='src/pages/VersionedReports.tsx';s=(R/p).read_text()
s=s.replace('Numerator {exactNumber(m.numerator)} / denominator {exactNumber(m.denominator)}','{METRIC_BY_ID[m.metricId].numeratorLabel}: {exactNumber(m.numerator)} / {METRIC_BY_ID[m.metricId].denominatorLabel}: {exactNumber(m.denominator)}')
s=s.replace('{METRIC_BY_ID[definition].definition}', '{METRIC_BY_ID[definition].definition}')
write(p,s)
