const fs = require('fs');

let content = `
import React, { useState } from 'react';
import { Info, ArrowUpRight, ArrowDownRight, Loader2, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { useAnalyticsData } from '../lib/useAnalyticsData';

const METRICS = {
  total_leads: { definition: "Total captured records", numerator: "COUNT(lead_id)", denominator: "N/A" },
  delivered_leads: { definition: "Leads successfully delivered to client", numerator: "COUNTIF(delivery_timestamp IS NOT NULL)", denominator: "N/A" },
  delivery_rate: { definition: "Delivered Leads / Total Leads", numerator: "COUNTIF(delivery_timestamp IS NOT NULL)", denominator: "COUNT(lead_id)" },
  called_leads: { definition: "Leads dialled at least once", numerator: "COUNTIF(first_call_timestamp IS NOT NULL)", denominator: "N/A" },
  call_coverage: { definition: "Called Leads / Delivered Leads", numerator: "COUNTIF(first_call_timestamp IS NOT NULL)", denominator: "COUNTIF(delivery_timestamp IS NOT NULL)" },
  rpcs: { definition: "Right Party Contacts (RPC)", numerator: "COUNTIF(rpc = true)", denominator: "N/A" },
  sales: { definition: "Total Sales", numerator: "COUNTIF(sale = true)", denominator: "N/A" },
  activation_rate: { definition: "Activations / Sales", numerator: "COUNTIF(activation = true)", denominator: "COUNTIF(sale = true)" },
  revenue: { definition: "Total Revenue Generated", numerator: "SUM(IFNULL(revenue, 0))", denominator: "N/A" },
  duplicate_rate: { definition: "Duplicate Leads / Total Leads", numerator: "COUNTIF(duplicate_flag = true)", denominator: "COUNT(lead_id)" },
  calls_per_lead: { definition: "Total Calls / Total Leads", numerator: "SUM(IFNULL(total_calls, 0))", denominator: "COUNT(lead_id)" }
};

function KPICard({ title, value, change, prefix = '', suffix = '', subtitle, isPositiveGood = true, lineage, metadata }: any) {
  const isPositive = change >= 0;
  const isGood = isPositiveGood ? isPositive : !isPositive;
  
  return (
    <div className="bg-card-bg p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group relative overflow-visible">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-secondary-text">{title}</h3>
        {lineage && (
          <div className="relative group/tooltip">
            <Info className="w-4 h-4 text-slate-300 hover:text-teal cursor-pointer transition-colors" />
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 text-white text-xs rounded-lg p-4 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[100] shadow-xl">
              <div className="font-semibold mb-1 text-slate-200 border-b border-slate-700 pb-1">{title}</div>
              <div className="text-teal font-bold my-2 text-sm">{prefix}{value}{suffix}</div>
              
              <div className="grid grid-cols-3 gap-2 mt-3 text-slate-400">
                <div className="col-span-1 font-semibold">Definition:</div>
                <div className="col-span-2">{lineage.definition}</div>
                
                <div className="col-span-1 font-semibold">Source:</div>
                <div className="col-span-2">{metadata?.source?.analyticsView || 'vw_daily_kpis'}</div>
                
                <div className="col-span-1 font-semibold">Numerator:</div>
                <div className="col-span-2 font-mono text-[10px] break-all">{lineage.numerator}</div>
                
                <div className="col-span-1 font-semibold">Denominator:</div>
                <div className="col-span-2 font-mono text-[10px] break-all">{lineage.denominator}</div>
                
                <div className="col-span-1 font-semibold">Client:</div>
                <div className="col-span-2">{metadata?.clientName || 'Primary Tenant'}</div>
                
                <div className="col-span-1 font-semibold">Updated:</div>
                <div className="col-span-2">{metadata?.dataAsOf ? new Date(metadata.dataAsOf).toLocaleString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-xl font-semibold text-slate-400">{prefix}</span>}
        <span className="text-3xl font-semibold tracking-tight text-primary-text">{typeof value === 'number' && value > 1000 ? value.toLocaleString() : value}</span>
        {suffix && <span className="text-xl font-semibold text-slate-400">{suffix}</span>}
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <span className={\`flex items-center \${isGood ? 'text-emerald-600' : 'text-red-500'}\`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {Math.abs(change)}%
          </span>
          <span className="text-slate-400">vs prev</span>
        </div>
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: metrics, metadata, loading: overviewLoading } = useAnalyticsData('overview');
  const { data: trendData, loading: trendLoading } = useAnalyticsData('timeseries');

  if (overviewLoading || trendLoading) {
    return (
      <div className="p-8 pb-20 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal" />
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="p-8 pb-20 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-primary-text mb-2">No data available</h2>
          <p className="text-secondary-text">Configure BigQuery in settings or check your data source.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 font-['Space_Grotesk'] tracking-tight">Executive Overview</h1>
        <p className="text-slate-500 mt-1">Real-time aggregate performance across all active channels.</p>
      </div>

      <div className="space-y-8">
        {/* Primary KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Volume Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <KPICard 
              title="Leads" 
              value={metrics.leads || 0} 
              change={metrics.leadsChange || 0} 
              lineage={METRICS.total_leads}
              metadata={metadata}
            />
            <KPICard 
              title="Delivered" 
              value={metrics.delivered || 0} 
              change={metrics.deliveredChange || 0} 
              lineage={METRICS.delivered_leads}
              metadata={metadata}
            />
            <KPICard 
              title="Called" 
              value={metrics.called || 0} 
              change={metrics.calledChange || 0} 
              lineage={METRICS.called_leads}
              metadata={metadata}
            />
            <KPICard 
              title="RPCs" 
              value={metrics.rpcs || 0} 
              change={metrics.rpcsChange || 0} 
              lineage={METRICS.rpcs}
              metadata={metadata}
            />
            <KPICard 
              title="Sales" 
              value={metrics.sales || 0} 
              change={metrics.salesChange || 0} 
              lineage={METRICS.sales}
              metadata={metadata}
            />
            <KPICard 
              title="Activations" 
              value={metrics.activations || 0} 
              change={metrics.activationsChange || 0} 
              lineage={{...METRICS.sales, definition: "Total activated sales.", numerator: "COUNTIF(activation = true)"}}
              metadata={metadata}
            />
            <KPICard 
              title="Revenue" 
              value={metrics.revenue || 0} 
              change={metrics.revenueChange || 0} 
              prefix="R " 
              lineage={METRICS.revenue}
              metadata={metadata}
            />
          </div>
        </div>

        {/* Secondary KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Efficiency & Quality</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <KPICard 
              title="Delivery Rate" 
              value={metrics.deliveryRate || 0} 
              change={2.1} 
              suffix="%" 
              subtitle="Delivered / Total Leads" 
              lineage={METRICS.delivery_rate}
              metadata={metadata}
            />
            <KPICard 
              title="Call Coverage" 
              value={metrics.callCoverage || 0} 
              change={1.4} 
              suffix="%" 
              subtitle="Called / Delivered" 
              lineage={METRICS.call_coverage}
              metadata={metadata}
            />
            <KPICard 
              title="Duplicate Rate" 
              value={metrics.duplicateRate || 0} 
              change={0.8} 
              isPositiveGood={false} 
              suffix="%" 
              subtitle="Duplicates / Total Leads" 
              lineage={METRICS.duplicate_rate}
              metadata={metadata}
            />
            <KPICard 
              title="Sale Rate" 
              value={metrics.saleRate || 0} 
              change={0.5} 
              suffix="%" 
              subtitle="Sales / Called Leads" 
              lineage={{...METRICS.sales, definition: "Sales / Called Leads", denominator: "COUNTIF(first_call_timestamp IS NOT NULL)"}}
              metadata={metadata}
            />
            <KPICard 
              title="Activation Rate" 
              value={metrics.activationRate || 0} 
              change={-1.2} 
              suffix="%" 
              subtitle="Activations / Sales" 
              lineage={METRICS.activation_rate}
              metadata={metadata}
            />
            <KPICard 
              title="Rev per Lead" 
              value={metrics.revenuePerLead || 0} 
              change={3.4} 
              prefix="R " 
              subtitle="Revenue / Total Leads" 
              lineage={{...METRICS.revenue, definition: "Revenue / Total Leads", denominator: "COUNT(lead_id)"}}
              metadata={metadata}
            />
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-card-bg p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-primary-text">Volume Trends</h3>
            <select className="border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 text-sm text-slate-700 outline-none focus:border-teal transition-colors">
              <option>Total Leads</option>
              <option>Delivered</option>
              <option>Called</option>
              <option>Sales</option>
              <option>Revenue</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#247F7D" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#247F7D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  tickFormatter={(val) => val ? val.split('-')[2] : ''}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="comparison" 
                  stroke="#cbd5e1" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none" 
                  name="Previous Period"
                />
                <Area 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#247F7D" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCurrent)" 
                  name="Current Period"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/Overview.tsx', content);
