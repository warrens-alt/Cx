import React from 'react';
import { PageShell } from '../components/PageShell';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import { DistributionBar } from '../components/charts/DistributionBar';
import { DiminishingReturnsChart } from '../components/charts/DiminishingReturnsChart';
import KpiCard from '../components/KpiCard';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { Zap, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatTableNumber } from '../lib/formatters';
import { useClient } from '../lib/ClientContext';

export default function SpeedToLead() {
  const { data: speedData, loading } = useAnalyticsData('speed-to-lead');
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R' : '$';

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (!speedData || !speedData.buckets) {
    return (
      <PageShell>
        <PageHeader title="Speed to Lead" />
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }
  
  const captureDelivery = speedData.metrics.find((m: any) => m.name === 'Capture to Delivery') || {};
  const deliveryCall = speedData.metrics.find((m: any) => m.name === 'Delivery to First Call') || {};

  const bucketUnder5m = speedData.buckets[0] || { leads: 0, rpc: 0, sale: 0 };
  const bucketOver4h = speedData.buckets.slice(-2).reduce((acc: any, r: any) => ({
    leads: acc.leads + (r.leads || 0),
    rpcSum: acc.rpcSum + (r.rpc || 0) * (r.leads || 0),
    saleSum: acc.saleSum + (r.sale || 0) * (r.leads || 0)
  }), { leads: 0, rpcSum: 0, saleSum: 0 });
  const rpcOver4h = bucketOver4h.leads > 0 ? (bucketOver4h.rpcSum / bucketOver4h.leads).toFixed(1) : '0.0';

  const totalLeads = speedData.buckets.reduce((acc: number, b: any) => acc + (b.leads || 0), 0);
  const leadsWithin1h = (speedData.buckets[0]?.leads || 0) + (speedData.buckets[1]?.leads || 0) + (speedData.buckets[2]?.leads || 0);
  const pctWithin1h = totalLeads > 0 ? ((leadsWithin1h / totalLeads) * 100).toFixed(1) : '0';

  return (
    <PageShell>
      <PageHeader 
        title="Speed to Lead & Contact Latency" 
        description="Quantify the commercial decay rate caused by delivery and dial delays across the funnel." 
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <KpiCard 
          title="Avg Capture to Delivery" 
          value={captureDelivery.avg || 'N/A'} 
          subtitle="Offershop ingestion latency"
        />
        <KpiCard 
          title="Avg Delivery to Call" 
          value={deliveryCall.avg || 'N/A'} 
          subtitle="Partner dial latency"
        />
        <KpiCard 
          title="Under 5 Mins" 
          value={bucketUnder5m.leads} 
          subtitle={`${totalLeads > 0 ? ((bucketUnder5m.leads / totalLeads) * 100).toFixed(1) : 0}% of called leads`}
        />
        <KpiCard 
          title="Within 1 Hour" 
          value={leadsWithin1h} 
          subtitle={`${pctWithin1h}% serviced within 60m`}
        />
      </div>

      {/* Velocity Impact Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <div className="enterprise-card p-4 border-l-4 border-l-emerald-500 bg-emerald-50/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-main text-sm">The 5-Minute Golden Window</span>
              <span className="text-xs font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                High Velocity
              </span>
            </div>
            <p className="text-xs text-text-sec mt-1">
              Leads dialed within 5 minutes achieved <strong className="text-emerald-700 font-mono">{Number(bucketUnder5m.rpc || 0).toFixed(1)}% RPC Rate</strong> and <strong className="text-emerald-700 font-mono">{Number(bucketUnder5m.sale || 0).toFixed(1)}% Sale Rate</strong>.
            </p>
          </div>
        </div>

        <div className="enterprise-card p-4 border-l-4 border-l-rose-500 bg-rose-50/20 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-main text-sm">Latency Penalty (&gt; 4 Hours)</span>
              <span className="text-xs font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                Decay Zone
              </span>
            </div>
            <p className="text-xs text-text-sec mt-1">
              Contact rate falls to <strong className="text-rose-700 font-mono">{rpcOver4h}% RPC</strong> when delayed over 4 hours, representing an estimated <strong className="text-rose-700">~60%+ contactability erosion</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[430px] flex flex-col">
          <DistributionBar 
            title="Lead Volume by Contact Latency" 
            subtitle="Distribution of unique leads across time-to-first-dial buckets."
            data={speedData.buckets}
            bucketKey="bucket"
            valueKey="leads"
            height={340}
          />
        </div>

        <div className="min-h-[430px] flex flex-col">
          <DiminishingReturnsChart
            title="Latency Decay Curves"
            subtitle="Visualizing volume drop-off against RPC and Sale conversion rates as dial delay grows."
            data={speedData.buckets}
            volumeKey="leads"
            volumeName="Leads Serviced"
            primaryLineKey="rpc"
            primaryLineName="RPC Rate (%)"
            secondaryLineKey="sale"
            secondaryLineName="Sale Rate (%)"
            benchmarkThreshold={15}
            benchmarkLabel="15% RPC Target"
            height={340}
          />
        </div>
      </div>
      
      {/* Detailed Conversion Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle bg-surface-sec flex items-center justify-between">
          <div>
            <h3 className="text-card-title text-text-main font-semibold">Speed to Lead Full Funnel Performance Matrix</h3>
            <p className="text-xs text-text-sec mt-0.5">End-to-end conversion from first call attempt through commercial revenue by latency window.</p>
          </div>
          <span className="text-xs text-text-mute font-mono">Time-to-first-attempt grain</span>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table w-full">
            <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
              <tr>
                <th className="px-5 py-3">Timing Bucket</th>
                <th className="px-4 py-3 text-right">Leads Serviced</th>
                <th className="px-4 py-3 text-right">Share %</th>
                <th className="px-4 py-3 text-right">RPCs</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Billable Sales</th>
                <th className="px-4 py-3 text-right">Activations</th>
                <th className="px-4 py-3 text-right">Total Revenue</th>
                <th className="px-4 py-3 text-right">Rev / Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-xs">
              {speedData.buckets.map((row: any, i: number) => {
                const share = totalLeads > 0 ? ((row.leads / totalLeads) * 100).toFixed(1) : '0';
                return (
                  <tr key={i} className="hover:bg-surface-sec/70 transition-colors">
                    <td className="font-sans font-medium text-text-main px-5 py-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : i < 3 ? 'bg-teal' : 'bg-amber-500'}`} />
                      {row.bucket}
                    </td>
                    <td className="px-4 py-3 text-right text-text-main font-medium">{formatTableNumber(row.leads)}</td>
                    <td className="px-4 py-3 text-right text-text-sec">{share}%</td>
                    <td className="px-4 py-3 text-right text-text-sec">
                      {formatTableNumber(row.rpcCount || 0)}
                      <span className="text-[11px] text-teal font-sans block">{row.rpc}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-teal">
                      {formatTableNumber(row.saleCount || 0)}
                      <span className="text-[11px] text-teal font-sans block">{row.sale}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-sec">
                      {formatTableNumber(row.billableCount || 0)}
                      <span className="text-[11px] text-text-mute font-sans block">{row.billableRate || 0}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatTableNumber(row.actCount || 0)}
                      <span className="text-[11px] text-emerald-700 font-sans block">{row.activation || 0}%</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-main">
                      {currencyPrefix}{formatTableNumber(row.revenue || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-teal">
                      {currencyPrefix}{Number(row.revPerLead || 0).toFixed(2)}
                    </td>
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
