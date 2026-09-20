import React from 'react';
import { PageShell } from '../components/PageShell';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import PageHeader from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ChartSkeleton } from '../components/Skeleton';
import { FunnelWaterfall } from '../components/charts/FunnelWaterfall';
import { DistributionBar } from '../components/charts/DistributionBar';
import { ComboChart } from '../components/charts/ComboChart';

export default function Funnel() {
  const { data: funnelData, loading: funnelLoading } = useAnalyticsData('funnel');
  const { data: callData, loading: callLoading } = useAnalyticsData('calls');

  if (funnelLoading || callLoading) {
    return (
      <PageShell>
        <PageHeader title="Lead Performance & Funnel" description="Loading workspace..." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </PageShell>
    );
  }

  if (!funnelData || !callData) {
    return (
      <PageShell>
        <PageHeader title="Lead Performance & Funnel" />
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }

  const steps = funnelData.map((d: any) => ({
    label: d.stage,
    value: d.count,
    rate: d.rate,
    costMetric: d.costMetric,
    itemNo: d.itemNo,
    isTerminal: d.stage === 'Activated Sales' || d.stage === 'Activated'
  }));

  const callChart = callData.chart || [];
  
  // Calculate cumulative conversions for the ComboChart
  let cumRPC = 0;
  let cumSale = 0;
  let cumAct = 0;
  let totalLeads = callData.calledLeads || 1; // prevent div by zero
  
  const cumulativeData = callChart.map((b: any) => {
    return {
      bucket: b.bucket,
      leads: b.current,
      rpcRate: b.rpc,
      saleRate: b.sale,
      actRate: b.activation
    };
  });

  return (
    <PageShell>
      <PageHeader 
        title="Lead Performance & Funnel" 
        description="Conversion progression, call distribution, and lifecycle analysis."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[450px] flex flex-col">
          <FunnelWaterfall 
            title="Revenue Leakage Waterfall" 
            subtitle="Lifecycle transition analysis highlighting volume loss."
            steps={steps}
          />
        </div>
        <div className="min-h-[450px] flex flex-col">
          <DistributionBar 
            title="Calls per Lead" 
            subtitle="Distribution of unique leads by total call attempts."
            data={cumulativeData}
            bucketKey="bucket"
            valueKey="leads"
            height={360}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[400px] flex flex-col">
          <ComboChart 
            title="Call Frequency vs. Right Party Contact Rate" 
            subtitle="Right party contact rate (CP.RPC) by call attempt bucket."
            data={cumulativeData}
            xKey="bucket"
            barKey="leads"
            lineKey="rpcRate"
            barName="Dialed Leads"
            lineName="RPC Rate (CP.RPC)"
            height={310}
          />
        </div>
        <div className="min-h-[400px] flex flex-col">
          <ComboChart 
            title="Call Frequency vs. Lead-to-Sale Rate" 
            subtitle="Qualified Leads to Sale Rate (CP.Sale) by call attempt bucket."
            data={cumulativeData}
            xKey="bucket"
            barKey="leads"
            lineKey="saleRate"
            barName="Dialed Leads"
            lineName="Sale Rate (CP.Sale)"
            height={310}
          />
        </div>
      </div>
      
    </PageShell>
  );
}
