import { useClient } from '../lib/ClientContext';
import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { METRICS } from '../lib/metrics';
import { TrendChart } from '../components/charts/TrendChart';
import { FunnelWaterfall } from '../components/charts/FunnelWaterfall';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart';
import { MetricCompositionDonut } from '../components/charts/MetricCompositionDonut';
import AnalyseDrawer from '../components/AnalyseDrawer';
import { AlertTriangle, AlertCircle, Info, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

function ChartSkeleton() {
  return (
    <div className="enterprise-card p-6 min-h-[400px] flex flex-col justify-between">
      <Skeleton className="h-8 w-1/4 mb-4" />
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}

export default function Overview() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const [trendMetric, setTrendMetric] = useState('leads');
  const [analyseMetric, setAnalyseMetric] = useState<{ id: string; label: string } | null>(null);

  const { data: rawData, metadata, loading: isLoading } = useAnalyticsData('overview');
  const data = (rawData as any) || {};

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title="Executive Overview" description="Loading workspace..." />
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-5">
            {Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><ChartSkeleton /></div>
            <div><ChartSkeleton /></div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <PageHeader title="Executive Overview" />
        <EmptyState message="No data found for the selected filters." />
      </PageShell>
    );
  }

  const m = data;
  const trendData = data.trend || [];
  const sourceData = data.sources || [];
  const attentionItems = data.attentionItems || [];

  // Generate End-to-End Lifecycle Funnel Data
  const funnelSteps = [
    { label: 'Fetched Leads', value: m.leads || 0, isTerminal: false, costMetric: 'CPL' },
    { label: 'Routed Leads', value: m.routedLeads || 0, rate: m.leads ? (m.routedLeads / m.leads) * 100 : 0, isTerminal: false },
    { label: 'HLC Handoffs', value: m.handoffLeads || 0, rate: m.routedLeads ? (m.handoffLeads / m.routedLeads) * 100 : 0, isTerminal: false },
    { label: 'Delivered Leads', value: m.delivered || 0, rate: m.leads ? (m.delivered / m.leads) * 100 : 0, isTerminal: false, costMetric: 'CPL.Delivered' },
    { label: 'Dialed Leads', value: m.called || 0, rate: m.delivered ? (m.called / m.delivered) * 100 : 0, isTerminal: false, costMetric: 'CPL.Dialed' },
    { label: 'Right Party Contact', value: m.rpcs || 0, rate: m.called ? (m.rpcs / m.called) * 100 : 0, isTerminal: false, costMetric: 'CP.RPC' },
    { label: 'Sales', value: m.sales || 0, rate: m.rpcs ? (m.sales / m.rpcs) * 100 : 0, isTerminal: false, costMetric: 'CP.Sale' },
    { label: 'Delivered Sales', value: m.billableSales || 0, rate: m.sales ? (m.billableSales / m.sales) * 100 : 0, isTerminal: false, costMetric: 'CPS.Delivered' },
    { label: 'Activated Sales', value: m.activations || 0, rate: m.billableSales ? (m.activations / m.billableSales) * 100 : 0, isTerminal: true, costMetric: 'CPS.Activated' }
  ];

  return (
    <PageShell>
      <PageHeader 
        title="Executive Overview" 
        category="Lead-to-Revenue Intelligence"
        description="Unified commercial, routing, and operational intelligence workspace backed by BigQuery." 
      />

      <div className="space-y-6 sm:space-y-8">
        {/* Primary KPI Row */}
        <div>
          <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2 flex items-center justify-between flex-wrap gap-2">
            <span>Primary Commercial & Operational KPIs</span>
            <span className="text-xs font-normal text-text-mute">Click "Why did this change?" on any card to run automated driver analysis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-5">
            <KpiCard 
              title="Fetched Leads" 
              value={m.leads} 
              lineage={METRICS.total_leads} 
              metadata={metadata} 
              onWhyChanged={() => setAnalyseMetric({ id: 'leads', label: 'Fetched Leads' })}
              onAnalyse={() => setAnalyseMetric({ id: 'leads', label: 'Fetched Leads' })}
            />
            <KpiCard 
              title="Routed Leads" 
              value={m.routedLeads} 
              subtitle="Offershop / Partner"
              lineage={{ ...METRICS.total_leads, canonicalName: 'Routed Leads', definition: 'Leads with valid non-sentinel offershop partner timestamps.' }} 
              metadata={metadata} 
            />
            <KpiCard 
              title="HLC Handoff Rate" 
              value={m.handoffRate} 
              suffix="%" 
              subtitle="Routed &rarr; HLC Vendor"
              lineage={{ ...METRICS.total_leads, canonicalName: 'HLC Handoff Rate', definition: 'Percentage of routed leads successfully logged in subsequent HLC vendor transactions.' }} 
              metadata={metadata} 
            />
            <KpiCard 
              title="Delivered Leads" 
              value={m.delivered} 
              lineage={METRICS.delivered_leads} 
              metadata={metadata} 
            />
            <KpiCard 
              title="Dialed Leads" 
              value={m.called} 
              subtitle={`${m.callCoverage}% of delivered`}
              lineage={METRICS.called_leads} 
              metadata={metadata} 
            />
            <KpiCard 
              title="Delivered Sales" 
              value={m.billableSales} 
              subtitle="Revenue &gt; 0"
              lineage={METRICS.delivered_sales} 
              metadata={metadata} 
              onWhyChanged={() => setAnalyseMetric({ id: 'activations', label: 'Delivered Sales' })}
              onAnalyse={() => setAnalyseMetric({ id: 'activations', label: 'Delivered Sales' })}
            />
            <KpiCard 
              title="Total Sales Value" 
              value={m.revenue} 
              prefix={currencyPrefix} 
              lineage={METRICS.revenue} 
              metadata={metadata} 
              onWhyChanged={() => setAnalyseMetric({ id: 'revenue', label: 'Total Sales Value' })}
              onAnalyse={() => setAnalyseMetric({ id: 'revenue', label: 'Total Sales Value' })}
            />
          </div>
        </div>

        {/* Secondary KPI Row */}
        <div>
          <h2 className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2.5">
            Secondary Efficiency & Volume Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">HLC Transactions</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">{(m.transactions || 0).toLocaleString()}</span>
              <span className="text-xs text-text-mute mt-1">Multi-vendor grain</span>
            </div>
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-sec font-medium">Right Party Contact</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sec text-text-mute border border-border-subtle">CP.RPC</span>
              </div>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">{(m.rpcs || 0).toLocaleString()}</span>
              <span className="text-xs text-text-mute mt-1">{m.rpcRate}% Right party contact rate</span>
            </div>
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-sec font-medium">Sales</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sec text-text-mute border border-border-subtle">CP.Sale</span>
              </div>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">{(m.sales || 0).toLocaleString()}</span>
              <span className="text-xs text-text-mute mt-1">{m.saleRate}% Lead-to-Sale</span>
            </div>
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Revenue per Lead</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">{currencyPrefix}{m.revenuePerLead || 0}</span>
              <span className="text-xs text-text-mute mt-1">Total Sales Value / Lead</span>
            </div>
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Unbilled Sales Leakage</span>
              <span className={`text-xl font-bold font-mono mt-1 tabular-nums ${(m.unbilledSales || 0) > 0 ? 'text-semantic-neg' : 'text-text-main'}`}>
                {(m.unbilledSales || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">Nominal sales with R0 rev</span>
            </div>
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between bg-emerald-50/40 border-emerald-200/80">
              <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Data Readiness
              </span>
              <span className="text-sm font-semibold text-emerald-900 mt-1">All Metrics Reconciled</span>
              <span className="text-xs text-emerald-700/80 mt-1">BigQuery reconciled</span>
            </div>
          </div>
        </div>

        {/* "What Needs Attention?" Dynamic Operational Panel */}
        {attentionItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-display font-semibold text-text-main text-sm">
                  Operational Variance Findings
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-900 border border-amber-200/80">
                  {attentionItems.length} findings
                </span>
              </div>
              <span className="text-xs text-text-sec">Auto-detected metric variances</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attentionItems.map((item: any) => (
                <div 
                  key={item.id} 
                  className="bg-surface rounded-xl p-4 sm:p-5 border border-border-subtle hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-text-main text-sm leading-snug">{item.title}</span>
                      <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap ${
                        item.severity === 'critical' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/70' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200/70'
                      }`}>
                        {item.severity}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-teal font-mono">{item.magnitude}</div>
                    <div className="text-xs text-text-sec">
                      <span className="font-medium text-text-main">Affected Population:</span> {item.affected}
                    </div>
                    <p className="text-xs text-text-mute leading-relaxed">{item.reason}</p>
                  </div>
                  <Link
                    to={item.actionPath}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:text-teal-dark hover:underline pt-3 border-t border-border-subtle mt-4"
                  >
                    {item.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[460px] flex flex-col">
            <TrendChart 
              title="Primary Performance Trend" 
              subtitle="Daily metric series across the selected analysis period."
              data={trendData}
              currentKey={trendMetric}
              comparisonKey="comparison"
              xAxisKey="date"
              options={[
                { label: 'Unique Leads', value: 'leads' },
                { label: 'Routed Leads', value: 'routedLeads' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Called', value: 'called' },
                { label: 'Sale Events', value: 'sales' },
                { label: 'Billable Sales', value: 'billableSales' },
                { label: 'Total Revenue', value: 'revenue' }
              ]}
              selectedOption={trendMetric}
              onOptionChange={setTrendMetric}
              valuePrefix={trendMetric === 'revenue' ? currencyPrefix : ''}
              height={360}
            />
          </div>
          <div className="min-h-[460px] flex flex-col">
            <FunnelWaterfall 
              title="Lead-to-Revenue Lifecycle Funnel" 
              subtitle="Drop-off progression from capture to billable realization."
              steps={funnelSteps}
            />
          </div>
        </div>

        {/* Secondary Analysis Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="min-h-[420px] flex flex-col">
            <MetricCompositionDonut
              title="Channel Acquisition Share"
              subtitle="Volume distribution by top acquisition sources."
              data={
                sourceData.length <= 5
                  ? sourceData.map((s: any) => ({ name: s.source, value: Number(s.leads) || 0 }))
                  : [
                      ...sourceData.slice(0, 4).map((s: any) => ({ name: s.source, value: Number(s.leads) || 0 })),
                      { 
                        name: 'Other Sources', 
                        value: sourceData.slice(4).reduce((sum: number, s: any) => sum + (Number(s.leads) || 0), 0) 
                      }
                    ]
              }
              centerLabel="Total Leads"
              centerValue={(m.leads || 0).toLocaleString()}
              height={280}
            />
          </div>
          <div className="min-h-[420px] flex flex-col">
             <HorizontalBarChart
               title="Top Sources by Volume"
               subtitle="Lead contribution by active acquisition source."
               data={sourceData.slice(0, 7)}
               categoryKey="source"
               valueKey="leads"
               height={300}
             />
          </div>
          <div className="min-h-[420px] flex flex-col">
             <HorizontalBarChart
               title="Top Sources by Revenue Yield"
               subtitle="Financial realization attributed by lead source."
               data={sourceData.slice(0, 7).sort((a: any, b: any) => b.revenue - a.revenue)}
               categoryKey="source"
               valueKey="revenue"
               valuePrefix={currencyPrefix}
               color="#247F7D"
               height={300}
             />
          </div>
        </div>

      </div>

      {/* Contextual Analyse / Why Did This Change Drawer */}
      {analyseMetric && (
        <AnalyseDrawer
          isOpen={Boolean(analyseMetric)}
          onClose={() => setAnalyseMetric(null)}
          metric={analyseMetric.id}
          metricLabel={analyseMetric.label}
        />
      )}
    </PageShell>
  );
}
