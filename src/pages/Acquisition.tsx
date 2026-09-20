import React from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TrendChart } from '../components/charts/TrendChart';
import { DataState, EvidenceNotice, displayNumber } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
export default function Acquisition() {
  const { data, loading, error, refetch } = useAnalyticsData('acquisition'), { clientConfig } = useClient();
  const prefix = clientConfig?.currency === 'ZAR' ? 'R ' : `${clientConfig?.currency || ''} `;
  if (loading || error || !data?.summary) return <PageShell><PageHeader title="Acquisition & Media" /><DataState loading={loading} error={error} empty={!data?.summary} retry={refetch} /></PageShell>;
  const s = data.summary;
  const chart = new Map<string, any>();
  for (const row of data.timeseries || []) { const point = chart.get(row.date) || { date: row.date, spend: 0 }; point.spend += Number(row.spend) || 0; chart.set(row.date, point); }
  return <PageShell><PageHeader title="Acquisition & Media" category="Marketing Attribution" description="Costs are displayed only when their source field and filter scope are supported." />
    <div className="space-y-6"><EvidenceNotice>{data.unavailableReason || 'Recorded revenue is not verified cash collected. Campaign-level attribution is not mapped.'}</EvidenceNotice>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Measured Spend" value={s.spend ?? 'Unavailable'} prefix={s.spend == null ? '' : prefix} />
        <KpiCard title="Fetched Leads" value={s.fetchedLeads ?? 'Unavailable'} />
        <KpiCard title="Cost per Fetched Lead" value={s.cplFetched ?? 'Unavailable'} prefix={s.cplFetched == null ? '' : prefix} />
        <KpiCard title="Impressions" value={s.impressions ?? 'Unavailable'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[['Delivered Leads', 'delivered', 'cplDelivered'], ['Called Leads', 'called', 'cplDialed'], ['Leads with a Sale', 'sales', 'cpSale'], ['Activated Leads', 'activations', 'cpsActivated']].map(([title, count, cost]) =>
        <div key={count} className="h-full"><KpiCard title={title} value={s[count] ?? 'Unavailable'} subtitle={`Cost per outcome: ${s[cost] == null ? 'Unavailable' : prefix + displayNumber(s[cost], 2)}`} /></div>)}</div>
      {s.spend !== null && chart.size > 0 && <TrendChart title="Measured Spend by Media Date" subtitle="Media spend uses media event date, not lead capture date." data={[...chart.values()]} xAxisKey="date" currentKey="spend" valuePrefix={prefix} />}
      <section className="enterprise-card p-5"><h2 className="font-semibold">Channel-Level Media Performance</h2><p className="text-sm mb-4">Campaign-level detail is unavailable in the mapped query. No campaign totals are inferred.</p>
        <div className="overflow-x-auto"><table className="enterprise-table w-full"><thead><tr>{['Channel', 'Spend', 'Impressions', 'Clicks', 'Platform Leads'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
          {(data.channels || []).map((row: any) => <tr key={row.channel}><td>{row.channel}</td><td>{prefix}{displayNumber(row.spend, 2)}</td><td>{displayNumber(row.impressions)}</td><td>{displayNumber(row.clicks)}</td><td>{displayNumber(row.leads)}</td></tr>)}
          {!data.channels?.length && <tr><td colSpan={5}>No comparable media data is available for this selection.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  </PageShell>;
}
