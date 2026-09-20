import React from 'react';
import { useClient } from '../lib/ClientContext';
import { PageShell } from '../components/PageShell';
import { formatTableNumber, formatChartAxis } from '../lib/formatters';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart';
import { ScatterPlot } from '../components/charts/ScatterPlot';
import { MetricCompositionDonut } from '../components/charts/MetricCompositionDonut';
import KpiCard from '../components/KpiCard';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { Compass, Sparkles, TrendingUp, DollarSign } from 'lucide-react';

export default function SourceAnalysis() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data: sourceData, loading } = useAnalyticsData('sources');

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (!sourceData || sourceData.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Source Analysis" />
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }

  const sortedByVolume = [...sourceData].sort((a: any, b: any) => b.leads - a.leads);
  const sortedBySaleRate = [...sourceData].sort((a: any, b: any) => b.saleRate - a.saleRate);
  const sortedByRevPerLead = [...sourceData].sort((a: any, b: any) => b.revPerLead - a.revPerLead);

  const topVolume = sortedByVolume[0];
  const topConversion = sortedBySaleRate[0];
  const topYield = sortedByRevPerLead[0];

  const totalLeads = sourceData.reduce((sum: number, s: any) => sum + (s.leads || 0), 0);

  // Group top 6 + other for composition donut
  const donutData = React.useMemo(() => {
    if (sortedByVolume.length <= 6) {
      return sortedByVolume.map((s: any) => ({ name: s.source, value: s.leads }));
    }
    const top5 = sortedByVolume.slice(0, 5).map((s: any) => ({ name: s.source, value: s.leads }));
    const others = sortedByVolume.slice(5).reduce((sum: number, s: any) => sum + s.leads, 0);
    return [...top5, { name: 'Other Sources', value: others }];
  }, [sortedByVolume]);

  const [viewMode, setViewMode] = React.useState<'full' | 'rates' | 'volume'>('full');

  return (
    <PageShell>
      <PageHeader 
        title="Source Analysis & Channel Portfolio" 
        category="Channel Economics & Yield"
        description="Benchmark acquisition channels across lead volume, delivery compliance, contact yield, and commercial revenue."
      />

      {/* Top Channel Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <KpiCard 
          title="Top Volume Channel" 
          value={topVolume?.source || 'N/A'} 
          subtitle={`${formatTableNumber(topVolume?.leads || 0)} leads (${topVolume?.share || 0}% share)`}
        />
        <KpiCard 
          title="Highest Conversion" 
          value={topConversion?.saleRate ? `${topConversion.saleRate}%` : 'N/A'} 
          subtitle={`${topConversion?.source || 'N/A'} channel`}
        />
        <KpiCard 
          title="Best Revenue / Lead" 
          value={Number(topYield?.revPerLead || 0).toFixed(2)} 
          prefix={currencyPrefix}
          subtitle={`${topYield?.source || 'N/A'} channel`}
        />
        <KpiCard 
          title="Active Channels" 
          value={sourceData.length} 
          subtitle={`${formatTableNumber(totalLeads)} total acquisition volume`}
        />
      </div>

      {/* 3-Way Comparative Visual Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="min-h-[420px] flex flex-col">
          <MetricCompositionDonut
            title="Channel Volume Share"
            subtitle="Acquisition concentration across traffic sources."
            data={donutData}
            centerLabel="Total Leads"
            centerValue={formatChartAxis(totalLeads)}
            height={290}
          />
        </div>

        <div className="min-h-[420px] flex flex-col">
          <HorizontalBarChart 
            title="Lead Volume by Source" 
            subtitle="Top 8 acquisition sources by volume."
            data={sortedByVolume.slice(0, 8)}
            categoryKey="source"
            valueKey="leads"
            height={320}
          />
        </div>

        <div className="min-h-[420px] flex flex-col">
          <HorizontalBarChart 
            title="Revenue Yield by Source" 
            subtitle="Top 8 sources by revenue per lead."
            data={sortedByRevPerLead.slice(0, 8)}
            categoryKey="source"
            valueKey="revPerLead"
            valuePrefix={currencyPrefix}
            height={320}
          />
        </div>
      </div>

      {/* Portfolio Map & Strategic Quadrants */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          <div className="enterprise-card p-4 border-l-4 border-l-emerald-500 text-xs">
            <span className="font-semibold text-text-main text-sm block">Scale & Quality (Stars)</span>
            <span className="text-text-sec text-xs block mt-1 leading-relaxed">High volume + above-average sale conversion. Scale acquisition budget here.</span>
          </div>
          <div className="enterprise-card p-4 border-l-4 border-l-teal text-xs">
            <span className="font-semibold text-text-main text-sm block">High-Yield Niches</span>
            <span className="text-text-sec text-xs block mt-1 leading-relaxed">Lower volume with high conversion rates. Test capacity expansion.</span>
          </div>
          <div className="enterprise-card p-4 border-l-4 border-l-amber-500 text-xs">
            <span className="font-semibold text-text-main text-sm block">Volume Drivers</span>
            <span className="text-text-sec text-xs block mt-1 leading-relaxed">Significant lead intake with moderate conversion. Focus on vetting & script optimization.</span>
          </div>
          <div className="enterprise-card p-4 border-l-4 border-l-rose-500 text-xs">
            <span className="font-semibold text-text-main text-sm block">Triage / Drag</span>
            <span className="text-text-sec text-xs block mt-1 leading-relaxed">Low yield and low conversion. Audit duplicate rates and lead validity.</span>
          </div>
        </div>

        <div className="min-h-[480px] flex flex-col">
          <ScatterPlot 
            title="Source Portfolio Map"
            subtitle="Evaluating channel efficiency: Lead Volume (X-axis) vs. Sale Conversion Rate (Y-axis) sized by Revenue per Lead."
            data={sourceData}
            xKey="leads"
            yKey="saleRate"
            zKey="revPerLead"
            nameKey="source"
            xLabel="Total Leads"
            yLabel="Sale Rate (%)"
            height={380}
          />
        </div>
      </div>

      {/* Granular Source Performance Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-5 border-b border-border-subtle bg-surface-sec flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-card-title font-semibold text-text-main">Granular Channel Full Funnel Matrix</h3>
            <p className="text-xs text-text-sec mt-0.5">Comprehensive lead-to-activation conversion funnel and commercial yield per acquisition source.</p>
          </div>
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-border-strong text-xs">
            <button
              onClick={() => setViewMode('full')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'full' ? 'bg-brand text-white shadow-xs' : 'text-text-sec hover:text-text-main'
              }`}
            >
              Full Funnel
            </button>
            <button
              onClick={() => setViewMode('rates')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'rates' ? 'bg-brand text-white shadow-xs' : 'text-text-sec hover:text-text-main'
              }`}
            >
              Conversion Rates
            </button>
            <button
              onClick={() => setViewMode('volume')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                viewMode === 'volume' ? 'bg-brand text-white shadow-xs' : 'text-text-sec hover:text-text-main'
              }`}
            >
              Volume Counts
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full">
            <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
              {viewMode === 'full' && (
                <tr>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Delivered</th>
                  <th className="px-4 py-3 text-right">Dialled</th>
                  <th className="px-4 py-3 text-right">RPC</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Leads with Sales and Recorded Revenue</th>
                  <th className="px-4 py-3 text-right">Activated</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Recorded Revenue / Lead</th>
                </tr>
              )}
              {viewMode === 'rates' && (
                <tr>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Delivery %</th>
                  <th className="px-4 py-3 text-right">Call Cov %</th>
                  <th className="px-4 py-3 text-right">RPC / Dialled Leads (%)</th>
                  <th className="px-4 py-3 text-right">Lead &rarr; Sale %</th>
                  <th className="px-4 py-3 text-right">Revenue-Matched Sales / Sales (%)</th>
                  <th className="px-4 py-3 text-right">Activations / Revenue-Matched Sales (%)</th>
                  <th className="px-4 py-3 text-right">Recorded Revenue / Lead</th>
                </tr>
              )}
              {viewMode === 'volume' && (
                <tr>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Delivered</th>
                  <th className="px-4 py-3 text-right">Dialled</th>
                  <th className="px-4 py-3 text-right">RPCs</th>
                  <th className="px-4 py-3 text-right">Sales</th>
                  <th className="px-4 py-3 text-right">Leads with Sales and Recorded Revenue</th>
                  <th className="px-4 py-3 text-right">Activations</th>
                  <th className="px-4 py-3 text-right">Recorded Revenue</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-xs">
              {sourceData.map((row: any, i: number) => {
                if (viewMode === 'full') {
                  return (
                    <tr key={i} className="hover:bg-surface-sec/70 transition-colors">
                      <td className="font-sans font-medium text-text-main px-5 py-3">{row.source}</td>
                      <td className="px-4 py-3 text-right font-medium text-text-main">{formatTableNumber(row.leads)}</td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.delivered || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.delivery || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.called || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.callCoverage ?? 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.rpcs || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.rpcRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-teal font-medium">
                        {formatTableNumber(row.sales || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.saleRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.billableSales || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.billableSaleRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatTableNumber(row.activations || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.activationRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-main">{currencyPrefix}{formatTableNumber(row.revenue || 0)}</td>
                      <td className="px-4 py-3 text-right font-bold text-teal">{currencyPrefix}{Number(row.revPerLead || 0).toFixed(2)}</td>
                    </tr>
                  );
                }
                if (viewMode === 'rates') {
                  return (
                    <tr key={i} className="hover:bg-surface-sec/70 transition-colors">
                      <td className="font-sans font-medium text-text-main px-5 py-3">{row.source}</td>
                      <td className="px-4 py-3 text-right font-medium text-text-main">{formatTableNumber(row.leads)}</td>
                      <td className="px-4 py-3 text-right text-text-sec">{row.delivery || 0}%</td>
                      <td className="px-4 py-3 text-right text-text-sec">{row.callCoverage ?? 0}%</td>
                      <td className="px-4 py-3 text-right text-text-sec">{row.rpcRate || 0}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-teal">{row.leadToSaleRate ?? 0}%</td>
                      <td className="px-4 py-3 text-right text-text-sec">{row.billableSaleRate || 0}%</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{row.activationRate || 0}%</td>
                      <td className="px-4 py-3 text-right font-bold text-text-main">{currencyPrefix}{Number(row.revPerLead || 0).toFixed(2)}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className="hover:bg-surface-sec/70 transition-colors">
                    <td className="font-sans font-medium text-text-main px-5 py-3">{row.source}</td>
                    <td className="px-4 py-3 text-right font-medium text-text-main">{formatTableNumber(row.leads)}</td>
                    <td className="px-4 py-3 text-right text-text-sec">{formatTableNumber(row.delivered || 0)}</td>
                    <td className="px-4 py-3 text-right text-text-sec">{formatTableNumber(row.called || 0)}</td>
                    <td className="px-4 py-3 text-right text-text-sec">{formatTableNumber(row.rpcs || 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-teal">{formatTableNumber(row.sales || 0)}</td>
                    <td className="px-4 py-3 text-right text-text-sec">{formatTableNumber(row.billableSales || 0)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{formatTableNumber(row.activations || 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-text-main">{currencyPrefix}{formatTableNumber(row.revenue || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
