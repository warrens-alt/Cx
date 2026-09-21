import DataVisual from '../components/visuals/DataVisual';
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
    isTerminal: d.stage === 'Leads with Activations' || d.stage === 'Activated'
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

      <DataVisual id="api.response" data={{stages:funnelData,calls:callData}} context={{endpoint:"funnel"}}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-h-[450px] flex flex-col">
          <FunnelWaterfall 
            title="Recorded Lead-Stage Counts" 
            subtitle="Recorded stage counts; a decline between non-nested populations is not proof of leakage."
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
            title="RPC Share by Call-Attempt Band" 
            subtitle="Lead RPC flags / lead records in each call-attempt band. CP.RPC is a cost metric and is not plotted here."
            data={cumulativeData}
            xKey="bucket"
            barKey="leads"
            lineKey="rpcRate"
            barName="Dialled Leads"
            lineName="RPC / Leads in Band (%)"
            height={310}
          />
        </div>
        <div className="min-h-[400px] flex flex-col">
          <ComboChart 
            title="Sale Share by Call-Attempt Band" 
            subtitle="Leads with sales / leads in each call-attempt band."
            data={cumulativeData}
            xKey="bucket"
            barKey="leads"
            lineKey="saleRate"
            barName="Dialled Leads"
            lineName="Sales / Leads in Band (%)"
            height={310}
          />
        </div>
      </div>
      
    </PageShell>
  );
}
