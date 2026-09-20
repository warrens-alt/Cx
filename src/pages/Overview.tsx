import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TrendChart } from '../components/charts/TrendChart';
import { FunnelWaterfall } from '../components/charts/FunnelWaterfall';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart';
import { MetricCompositionDonut } from '../components/charts/MetricCompositionDonut';
import AnalyseDrawer from '../components/AnalyseDrawer';
import { DataState, EvidenceNotice, displayNumber } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
export default function Overview() {
  const { data, metadata, loading, error, refetch } = useAnalyticsData('overview'), { clientConfig } = useClient(), location = useLocation();
  const [trendMetric, setTrendMetric] = useState('leads'), [analyseMetric, setAnalyseMetric] = useState<{ id: string; label: string } | null>(null);
  const prefix = clientConfig?.currency === 'ZAR' ? 'R ' : `${clientConfig?.currency || ''} `;
  if (loading || error || !data) return <PageShell><PageHeader title="Executive Overview" /><DataState loading={loading} error={error} empty={!data} retry={refetch} /></PageShell>;
  const cards = [
    ['leads', 'Fetched Leads', 'leads'], ['delivered', 'Delivered Leads', 'delivered'], ['called', 'Dialled Leads', 'called'],
    ['sales', 'Leads with a Sale', 'sales'], ['billableSales', 'Sales with Recorded Revenue', 'billable_sales'],
    ['activations', 'Activated Leads', 'activations'], ['revenue', 'Recorded Revenue', 'revenue'],
  ];
  const stages = [['Fetched Leads', data.leads], ['Delivered Leads', data.delivered], ['Dialled Leads', data.called], ['Right Party Contact', data.rpcs], ['Sales', data.sales], ['Activated Leads', data.activations]];
  const sourceData = data.sources || [];
  return <PageShell><PageHeader title="Executive Overview" category="Lead-to-Revenue Intelligence" description="Vendor-attributed outcomes for the selected lead-capture cohort." />
    <div className="space-y-6">
      <EvidenceNotice>Source timezone, identifier joins and revenue recognition still require warehouse sign-off. <Link className="underline" to={{ pathname: '/validation', search: location.search }}>Review validation evidence</Link>.</EvidenceNotice>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([key, title, metric]) => <div key={key} className="h-full"><KpiCard title={title} subtitle="No period comparison supplied" value={data[key] ?? 'Unavailable'} prefix={key === 'revenue' ? prefix : ''} metadata={metadata}
        onAnalyse={() => setAnalyseMetric({ id: metric, label: title })} onWhyChanged={() => setAnalyseMetric({ id: metric, label: title })} /></div>)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Fetched Lead to Sale Rate" value={data.leadToSaleRate ?? 'Unavailable'} suffix={data.leadToSaleRate == null ? '' : '%'} subtitle="Leads with a sale / fetched leads" />
        <KpiCard title="Called Lead to Sale Rate" value={data.saleRate ?? 'Unavailable'} suffix={data.saleRate == null ? '' : '%'} subtitle="Leads with a sale / called leads" />
        <KpiCard title="Sale to Activation Rate" value={data.activationRate ?? 'Unavailable'} suffix={data.activationRate == null ? '' : '%'} subtitle="Activated leads / leads with a sale" />
        <KpiCard title="Measured Media Spend" value={data.spend ?? 'Unavailable'} prefix={data.spend == null ? '' : prefix} subtitle={data.spendStatus === 'MEASURED' ? 'Verified spend field; selected scope' : data.spendStatus} />
      </div>
      {(data.attentionItems || []).map((item: any) => <div key={item.id} className="enterprise-card p-5"><h2 className="font-semibold">{item.title}</h2><p>{item.magnitude} — {item.reason}</p><Link className="underline" to={{ pathname: item.actionPath, search: location.search }}>{item.actionLabel}</Link></div>)}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><TrendChart title="Performance by Capture Date" subtitle="Observed downstream outcomes of each capture cohort; not an event-date revenue ledger."
        data={data.trend || []} currentKey={trendMetric} xAxisKey="date" options={cards.map(([value, label]) => ({ label, value }))}
        selectedOption={trendMetric} onOptionChange={setTrendMetric} valuePrefix={trendMetric === 'revenue' ? prefix : ''} height={360} /></div>
        <FunnelWaterfall title="Observed Lifecycle Coverage" subtitle="Coverage counts are not guaranteed to form a strictly nested funnel."
          steps={stages.map(([label, value], i) => ({ label: String(label), value: Number(value) || 0, isTerminal: i === stages.length - 1 }))} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><MetricCompositionDonut title="Source Share" subtitle="All returned source groups are included."
        data={sourceData.map((s: any) => ({ name: s.source, value: Number(s.leads) || 0 }))} centerLabel="Fetched leads" centerValue={displayNumber(data.leads)} height={280} />
        <HorizontalBarChart title="Top Sources by Volume" subtitle="Fetched lead counts" data={[...sourceData].sort((a, b) => b.leads - a.leads).slice(0, 7)} categoryKey="source" valueKey="leads" height={300} />
        <HorizontalBarChart title="Top Sources by Recorded Revenue" subtitle="Expected or recorded values; not verified cash collected" data={[...sourceData].sort((a, b) => b.revenue - a.revenue).slice(0, 7)} categoryKey="source" valueKey="revenue" valuePrefix={prefix} height={300} /></div>
    </div>{analyseMetric && <AnalyseDrawer isOpen onClose={() => setAnalyseMetric(null)} metric={analyseMetric.id} metricLabel={analyseMetric.label} />}
  </PageShell>;
}
