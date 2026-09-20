import { useClient } from '../lib/ClientContext';
import React from 'react';
import { PageShell } from '../components/PageShell';
import { formatTableNumber, formatTableCurrency } from '../lib/formatters';
import { TableSkeleton } from '../components/Skeleton';
import KpiCard from '../components/KpiCard';
import { Loader2, DollarSign, MousePointerClick, Megaphone, Users } from 'lucide-react';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import PageHeader from '../components/PageHeader';
import { TrendChart } from '../components/charts/TrendChart';
import { METRICS } from '../lib/metrics';

export default function Acquisition() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data, loading } = useAnalyticsData('acquisition');

  if (loading) {
    return (
      <PageShell><TableSkeleton /></PageShell>
    );
  }

  if (!data || !data.summary || data.timeseries?.length === 0) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-section-title mb-4">No data available</h2>
            <p className="text-secondary-text">Configure BigQuery platform insights table.</p>
          </div>
        </div>
      </PageShell>
    );
  }

  const { summary, timeseries } = data;

  // Prepare chart data
  const chartDataMap = new Map();
  timeseries.forEach((r: any) => {
    if (!chartDataMap.has(r.date)) chartDataMap.set(r.date, { date: r.date, spend: 0, leads: 0 });
    const c = chartDataMap.get(r.date);
    c.spend += Number(r.spend);
    c.leads += Number(r.leads);
  });
  const chartData = Array.from(chartDataMap.values()).reverse();

  return (
    <PageShell>
      <PageHeader 
        title="Acquisition & Media Performance" 
        category="Marketing Attribution"
        description="Marketing spend, impressions, clicks, cost per lead, and channel conversion efficiency." 
      />

      <div className="space-y-6 sm:space-y-8">
        <div>
          <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2.5">
            Top-of-Funnel Media Efficiency
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <KpiCard title="Total Spend" value={summary.spend} prefix={currencyPrefix} />
            <KpiCard 
              title="Fetched Leads" 
              value={summary.fetchedLeads || summary.leads} 
              subtitle="Item 22 (Lead Ledger)"
              lineage={METRICS.total_leads}
            />
            <KpiCard 
              title="Cost per Lead (CPL)" 
              value={(summary.cplFetched || summary.cpa || 0).toFixed(2)} 
              prefix={currencyPrefix} 
              subtitle="Spend / Fetched Leads"
              isPositiveGood={false} 
            />
            <KpiCard 
              title="Impressions (CPM)" 
              value={summary.impressions} 
              subtitle="Media reach"
            />
          </div>
        </div>

        {/* Downstream Full Funnel Economics */}
        <div>
          <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2.5">
            Downstream Full Funnel Commercial Yield & Cost per Stage
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5">
            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Delivered Leads</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">
                {(summary.delivered || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                CPL: {currencyPrefix}{Number(summary.cplDelivered || 0).toFixed(2)}
              </span>
            </div>

            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Dialed Leads</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">
                {(summary.called || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                CPL.Dial: {currencyPrefix}{Number(summary.cplDialed || 0).toFixed(2)}
              </span>
            </div>

            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Right Party Contact</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">
                {(summary.rpcs || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                CP.RPC: {currencyPrefix}{Number(summary.cpRpc || 0).toFixed(2)}
              </span>
            </div>

            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Gross Sales</span>
              <span className="text-xl font-bold font-mono text-teal mt-1 tabular-nums">
                {(summary.sales || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                CP.Sale: {currencyPrefix}{Number(summary.cpSale || 0).toFixed(2)}
              </span>
            </div>

            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs text-text-sec font-medium">Delivered Sales</span>
              <span className="text-xl font-bold font-mono text-text-main mt-1 tabular-nums">
                {(summary.billableSales || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                CPS.Deliv: {currencyPrefix}{Number(summary.cpsDelivered || 0).toFixed(2)}
              </span>
            </div>

            <div className="enterprise-card p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-sec font-medium">Commercial Revenue</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-sec text-teal border border-border-subtle">
                  {summary.roas || 0}% ROAS
                </span>
              </div>
              <span className="text-xl font-bold font-mono text-teal mt-1 tabular-nums">
                {currencyPrefix}{(summary.revenue || 0).toLocaleString()}
              </span>
              <span className="text-xs text-text-mute mt-1">
                Activated: {(summary.activations || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-[400px] flex flex-col">
          <TrendChart 
            title="Spend vs Fetched Leads (Daily)" 
            subtitle="Trend of media expenditure and lead volume (CPL)."
            data={chartData}
            xAxisKey="date"
            currentKey="spend"
            valuePrefix={currencyPrefix}
          />
        </div>

        <div className="enterprise-card">
          <div className="p-6 border-b border-border-subtle">
            <h3 className="text-card-title font-semibold text-text-main">Campaign Acquisition Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="enterprise-table w-full">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th className="text-right">Spend</th>
                  <th className="text-right">Impressions</th>
                  <th className="text-right">Link Clicks</th>
                  <th className="text-right">CTR</th>
                  <th className="text-right">CPC</th>
                  <th className="text-right">Fetched Leads</th>
                  <th className="text-right">CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono text-xs">
                {(data.campaigns || []).map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-surface-sec">
                    <td className="font-sans font-medium text-text-main">{c.campaign}</td>
                    <td className="font-sans text-text-sec">{c.channel}</td>
                    <td className="text-right">{formatTableCurrency(c.spend, currencyPrefix)}</td>
                    <td className="text-right">{formatTableNumber(c.impressions)}</td>
                    <td className="text-right">{formatTableNumber(c.clicks)}</td>
                    <td className="text-right">{c.ctr.toFixed(2)}%</td>
                    <td className="text-right">{currencyPrefix}{c.cpc.toFixed(2)}</td>
                    <td className="text-right font-medium text-text-main">{formatTableNumber(c.leads)}</td>
                    <td className="text-right font-semibold text-teal">{currencyPrefix}{c.cpa.toFixed(2)}</td>
                  </tr>
                ))}
                {(!data.campaigns || data.campaigns.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-text-sec">No campaigns found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

