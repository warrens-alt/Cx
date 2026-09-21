import DataVisual from '../components/visuals/DataVisual';
import { LEGACY_LABELS } from '../../contracts/naming';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useClient } from '../lib/ClientContext';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { TrendChart } from '../components/charts/TrendChart';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart';
import AnalyseDrawer from '../components/AnalyseDrawer';

export default function Overview() {
  const { clientConfig } = useClient();
  const location = useLocation();
  const { data, metadata, loading, error, refetch } = useAnalyticsData('overview');
  const [trendMetric, setTrendMetric] = useState('leads');
  const [analyseMetric, setAnalyseMetric] = useState<{ id: string; label: string } | null>(null);
  const currency = clientConfig?.currency === 'ZAR' ? 'R ' : `${clientConfig?.currency || ''} `;
  if (loading) return <PageShell><PageHeader title="Executive Overview" description="Loading the selected reporting scope." /><Skeleton className="h-40 w-full" /></PageShell>;
  if (error) return <PageShell><PageHeader title="Executive Overview" /><div role="alert" className="enterprise-card p-6 space-y-3"><h2 className="font-semibold">Report unavailable</h2><p>{error}</p><p>No zero values or reconciliation claims are substituted for a failed request.</p><button onClick={() => refetch?.()} className="rounded border px-4 py-2">Retry</button></div></PageShell>;
  if (!data || data.leads === 0) return <PageShell><PageHeader title="Executive Overview" /><EmptyState message="No lead records were returned for the selected scope." /></PageShell>;
  const primary = [
    { label: 'Fetched Leads', metric: 'leads', value: data.leads },
    { label: 'Delivered Leads', metric: 'delivered', value: data.delivered },
    { label: 'Dialled Leads', metric: 'called', value: data.called },
    { label: 'Leads with Sales', metric: 'sales', value: data.sales },
    { label: 'Leads with Sales and Recorded Revenue', metric: 'billable_sales', value: data.billableSales },
    { label: 'Leads with Activations', metric: 'activations', value: data.activations },
    { label: 'Recorded Revenue', metric: 'revenue', value: data.revenue },
  ];
  return <PageShell>
    <PageHeader title="Executive Overview" category="Lead-to-Revenue Reporting" description="Lead capture cohorts with outcomes attributed to the selected vendor transactions." />
    <div className="space-y-6"><DataVisual id="api.response" data={data} context={{endpoint:"overview"}}/>
      <section role="status" className="enterprise-card p-5 border-amber-300 bg-amber-50">
        <h2 className="font-semibold">Independent reconciliation not completed</h2>
        <p className="text-sm mt-2">These are recorded warehouse values, not verified invoices or cash collections. Join cardinality and source completeness still require live checks.</p>
        <p className="text-sm mt-2">Spend-based returns are withheld until incurred spend and cost allocation are confirmed. Data refresh time has not been verified.</p>
        <Link to={{ pathname: '/validation', search: location.search }} className="underline text-sm">View validation status</Link>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primary.map(card => <div key={card.metric} className="h-full"><KpiCard title={card.label} value={card.value} prefix={card.metric === 'revenue' ? currency : ''} metadata={metadata}
          onWhyChanged={() => setAnalyseMetric({ id: card.metric, label: card.label })} onAnalyse={() => setAnalyseMetric({ id: card.metric, label: card.label })} /></div>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title={LEGACY_LABELS.lead_to_sale_rate} value={data.leadToSaleRate} suffix="%" subtitle="Leads with sales / fetched leads" />
        <KpiCard title={LEGACY_LABELS.sale_rate} value={data.saleRate} suffix="%" subtitle="Leads with sales / dialled leads" />
        <KpiCard title={LEGACY_LABELS.activation_rate} value={data.activationRate} suffix="%" subtitle="Leads with activations / leads with sales" />
      </div>
      {(data.attentionItems || []).length > 0 && <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.attentionItems.map((item: any) => <article key={item.id} className="enterprise-card p-5"><h2 className="font-semibold">{item.title}</h2><p className="mt-2">{item.magnitude}</p><p className="text-sm mt-2">{item.reason}</p><Link className="underline text-sm" to={{ pathname: item.actionPath, search: location.search }}>{item.actionLabel}</Link></article>)}
      </section>}
      <TrendChart title="Daily Capture-Cohort Performance" subtitle="Outcomes grouped by lead capture date, not sale or payment date." data={data.trend || []} xAxisKey="date" currentKey={trendMetric}
        options={[{ label: 'Fetched Leads', value: 'leads' }, { label: 'Dialled Leads', value: 'called' }, { label: 'Leads with Sales', value: 'sales' }, { label: 'Recorded Revenue', value: 'revenue' }]}
        selectedOption={trendMetric} onOptionChange={setTrendMetric} valuePrefix={trendMetric === 'revenue' ? currency : ''} height={360} />
      <HorizontalBarChart title="Largest Sources by Lead Volume" subtitle="Up to ten sources; this is not a complete source-share distribution." data={data.sources || []} categoryKey="source" valueKey="leads" height={320} />
    </div>
    {analyseMetric && <AnalyseDrawer isOpen onClose={() => setAnalyseMetric(null)} metric={analyseMetric.id} metricLabel={analyseMetric.label} />}
  </PageShell>;
}
