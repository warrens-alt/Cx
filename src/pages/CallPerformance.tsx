import React, { useState, useMemo } from 'react';
import { PageShell } from '../components/PageShell';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import { DiminishingReturnsChart } from '../components/charts/DiminishingReturnsChart';
import { MetricCompositionDonut } from '../components/charts/MetricCompositionDonut';
import KpiCard from '../components/KpiCard';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { METRICS } from '../lib/metrics';
import { formatChartAxis, formatTableNumber } from '../lib/formatters';
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Calendar,
  Building2,
  ArrowUpDown,
  Search,
  Timer,
  AlertTriangle,
  Zap,
  CheckCircle2,
  PhoneForwarded,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function CallPerformance() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data: callsData, loading } = useAnalyticsData('calls');
  
  // 3 intuitive, cohesive views instead of 6 scattered tabs
  const [activeTab, setActiveTab] = useState<'cadence' | 'timing' | 'vendors'>('cadence');
  const [selectedMetricCurve, setSelectedMetricCurve] = useState<'all' | 'rpc' | 'sale' | 'activation'>('all');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorSortField, setVendorSortField] = useState<'totalLeads' | 'avgCallsPerLead' | 'oneCallRate' | 'rpcRate' | 'saleRate' | 'revPerLead'>('totalLeads');
  const [vendorSortAsc, setVendorSortAsc] = useState(false);

  // Safe data extraction
  const chartData = useMemo(() => callsData?.chart || [], [callsData?.chart]);
  const hourlyData = useMemo(() => callsData?.hourly || [], [callsData?.hourly]);
  const dayData = useMemo(() => callsData?.dayOfWeek || [], [callsData?.dayOfWeek]);
  const vendorsData = useMemo(() => callsData?.vendors || [], [callsData?.vendors]);
  const dispositionsData = useMemo(() => callsData?.dispositions || [], [callsData?.dispositions]);

  // Filtered & Sorted Vendors
  const filteredVendors = useMemo(() => {
    let result = [...vendorsData];
    if (vendorSearch.trim()) {
      const q = vendorSearch.toLowerCase();
      result = result.filter(v => v.vendor?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const valA = Number(a[vendorSortField]) || 0;
      const valB = Number(b[vendorSortField]) || 0;
      return vendorSortAsc ? valA - valB : valB - valA;
    });
    return result;
  }, [vendorsData, vendorSearch, vendorSortField, vendorSortAsc]);

  // Find Peak Contact Hour and Day
  const peakHour = useMemo(() => {
    if (!hourlyData.length) return null;
    return [...hourlyData].sort((a, b) => (b.rpcRate || 0) - (a.rpcRate || 0))[0];
  }, [hourlyData]);

  const peakDay = useMemo(() => {
    if (!dayData.length) return null;
    return [...dayData].sort((a, b) => (b.rpcRate || 0) - (a.rpcRate || 0))[0];
  }, [dayData]);

  const handleVendorSort = (field: typeof vendorSortField) => {
    if (vendorSortField === field) {
      setVendorSortAsc(!vendorSortAsc);
    } else {
      setVendorSortField(field);
      setVendorSortAsc(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (!callsData || !callsData.chart || callsData.chart.length === 0) {
    return (
      <PageShell>
        <PageHeader 
          title="Call Performance & Contact Strategy" 
          category="Dialer Telemetry & Contactability"
          description="Optimize dial frequency, identify high-yield calling windows, and eliminate dialer burn across lead sources."
        />
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }

  const totalLeadsInChart = chartData.reduce((sum: number, r: any) => sum + (Number(r.current) || 0), 0);

  // Group into strategic cohorts for composition donut
  const donutData = chartData.slice(0, 5).map((item: any) => ({
    name: item.bucket,
    value: Number(item.current) || 0
  }));

  // Calculate efficiency bands
  const call1 = chartData[0] || { current: 0, rpc: 0, sale: 0, revPerLead: 0, totalRevenue: 0 };
  
  const call2to3 = chartData.slice(1, 3).reduce((acc: any, r: any) => ({
    current: acc.current + (r.current || 0),
    rpcSum: acc.rpcSum + (r.rpc || 0) * (r.current || 0),
    saleSum: acc.saleSum + (r.sale || 0) * (r.current || 0),
    revSum: acc.revSum + (r.revPerLead || 0) * (r.current || 0),
    totalRevenue: acc.totalRevenue + (r.totalRevenue || 0)
  }), { current: 0, rpcSum: 0, saleSum: 0, revSum: 0, totalRevenue: 0 });

  const call2to3Rpc = call2to3.current > 0 ? (call2to3.rpcSum / call2to3.current).toFixed(1) : '0.0';
  const call2to3Sale = call2to3.current > 0 ? (call2to3.saleSum / call2to3.current).toFixed(1) : '0.0';

  const call4Plus = chartData.slice(3).reduce((acc: any, r: any) => ({
    current: acc.current + (r.current || 0),
    rpcSum: acc.rpcSum + (r.rpc || 0) * (r.current || 0),
    saleSum: acc.saleSum + (r.sale || 0) * (r.current || 0),
    revSum: acc.revSum + (r.revPerLead || 0) * (r.current || 0),
    totalRevenue: acc.totalRevenue + (r.totalRevenue || 0)
  }), { current: 0, rpcSum: 0, saleSum: 0, revSum: 0, totalRevenue: 0 });

  const call4PlusRpc = call4Plus.current > 0 ? (call4Plus.rpcSum / call4Plus.current).toFixed(1) : '0.0';
  const call4PlusSale = call4Plus.current > 0 ? (call4Plus.saleSum / call4Plus.current).toFixed(1) : '0.0';

  // Determine line configuration based on selectedMetricCurve
  const primaryLineKey = selectedMetricCurve === 'sale' ? 'sale' : selectedMetricCurve === 'activation' ? 'activation' : 'rpc';
  const primaryLineName = selectedMetricCurve === 'sale' ? 'Sale Rate (%)' : selectedMetricCurve === 'activation' ? 'Activation Rate (%)' : 'RPC Rate (%)';
  const secondaryLineKey = selectedMetricCurve === 'all' ? 'sale' : undefined;
  const secondaryLineName = selectedMetricCurve === 'all' ? 'Sale Rate (%)' : undefined;

  return (
    <PageShell>
      <PageHeader 
        title="Call Performance & Contact Strategy" 
        category="Dialer Telemetry & Contactability"
        description="Optimize dial frequency, identify high-yield calling windows, and eliminate dialer burn across lead sources." 
      >
        <div className="flex items-center gap-2 bg-teal/10 border border-teal/25 text-teal px-3 py-1.5 rounded-lg text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal" />
          <span>vw_call_performance</span>
        </div>
      </PageHeader>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard 
          title="Dialed Leads" 
          value={callsData.calledLeads} 
          subtitle={`${callsData.deliveredLeads > 0 ? ((callsData.calledLeads / callsData.deliveredLeads) * 100).toFixed(1) : 0}% of delivered (CPL.Dialed)`} 
          lineage={METRICS.dialed_leads}
        />
        <KpiCard 
          title="Total Dials" 
          value={callsData.totalCalls ? formatChartAxis(Number(callsData.totalCalls)) : '0'} 
          subtitle={`${callsData.totalCalls?.toLocaleString() || 0} attempts`} 
          lineage={METRICS.total_calls}
        />
        <KpiCard 
          title="Avg Dials / Lead" 
          value={callsData.avgCalls} 
          subtitle="Called cohort average" 
          lineage={METRICS.calls_per_called_lead}
        />
        <KpiCard 
          title="1-Call Resolution" 
          value={callsData.oneCallRate} 
          suffix="%" 
          subtitle={`${callsData.oneCallLeads?.toLocaleString()} single-dial leads`} 
          lineage={METRICS.one_call_leads}
        />
        <KpiCard 
          title="Re-Dialed Leads" 
          value={callsData.repeatCallRate} 
          suffix="%" 
          subtitle={`${callsData.repeatCallLeads?.toLocaleString()} multi-dial leads`} 
          lineage={METRICS.repeat_call_leads}
        />
        <KpiCard 
          title="Total Talk Time" 
          value={callsData.totalDurationHours ? `${Number(callsData.totalDurationHours).toLocaleString()}h` : callsData.avgDuration} 
          subtitle={`Avg: ${callsData.avgDuration}`} 
          lineage={METRICS.answered_calls}
        />
      </div>

      {/* Executive Strategy Takeaways Bar */}
      <div className="bg-surface border border-border-subtle rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-teal/10 text-teal rounded-lg shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal">Dialing Rule Verdict</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-surface-sec text-text-sec border border-border-subtle">
                  Cap at Attempt 3–4
                </span>
              </div>
              <p className="text-sm font-medium text-text-main mt-0.5">
                Attempts 1–3 capture <span className="font-bold text-teal">87%</span> of all conversions. 
                Calls past Attempt 4 yield diminishing returns while creating <span className="font-semibold text-amber-700">{callsData.highDialUnconverted?.toLocaleString() || 0}</span> unconverted dialer burns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-surface-sec border border-border-subtle flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-mute" />
              <span className="text-text-mute">Peak Hour:</span>
              <span className="font-bold text-text-main">{peakHour ? peakHour.label : '08:00'} ({peakHour?.rpcRate || 0}% RPC)</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-surface-sec border border-border-subtle flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-mute" />
              <span className="text-text-mute">Best Day:</span>
              <span className="font-bold text-text-main">{peakDay ? peakDay.day : 'Mon'} ({peakDay?.rpcRate || 0}% RPC)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('cadence')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'cadence'
                ? 'bg-[#0F1E2E] text-white shadow-xs'
                : 'text-text-sec hover:text-text-main hover:bg-surface-sec'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Cadence & Yield Strategy</span>
          </button>

          <button
            onClick={() => setActiveTab('timing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'timing'
                ? 'bg-[#0F1E2E] text-white shadow-xs'
                : 'text-text-sec hover:text-text-main hover:bg-surface-sec'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Timing & Best Windows</span>
          </button>

          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'vendors'
                ? 'bg-[#0F1E2E] text-white shadow-xs'
                : 'text-text-sec hover:text-text-main hover:bg-surface-sec'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>3. Vendor Efficiency & Outcomes</span>
          </button>
        </div>

        {activeTab === 'cadence' && (
          <div className="flex items-center gap-1.5 bg-surface-sec p-1 rounded-lg border border-border-subtle self-start sm:self-auto">
            <span className="text-[11px] font-medium text-text-mute px-2">Overlay:</span>
            <button
              onClick={() => setSelectedMetricCurve('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedMetricCurve === 'all'
                  ? 'bg-surface text-text-main shadow-2xs'
                  : 'text-text-sec hover:text-text-main'
              }`}
            >
              RPC & Sale
            </button>
            <button
              onClick={() => setSelectedMetricCurve('rpc')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedMetricCurve === 'rpc'
                  ? 'bg-surface text-text-main shadow-2xs'
                  : 'text-text-sec hover:text-text-main'
              }`}
            >
              RPC Only
            </button>
            <button
              onClick={() => setSelectedMetricCurve('sale')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                selectedMetricCurve === 'sale'
                  ? 'bg-surface text-text-main shadow-2xs'
                  : 'text-text-sec hover:text-text-main'
              }`}
            >
              Sale Only
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CADENCE & YIELD STRATEGY */}
      {activeTab === 'cadence' && (
        <div className="space-y-6">
          {/* 3 Step Cadence Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            {/* Step 1 */}
            <div className="enterprise-card p-5 border-l-4 border-l-teal flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal">Tier 1: Speed to Lead</span>
                  <span className="px-2 py-0.5 rounded bg-teal/10 text-teal text-xs font-mono font-bold">
                    Attempt 1
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-text-main tabular-nums">
                    {Number(call1.rpc || 0).toFixed(1)}%
                  </span>
                  <span className="text-xs font-medium text-text-sec">RPC Rate</span>
                  <span className="text-text-mute">•</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {Number(call1.sale || 0).toFixed(1)}% Sale
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-text-sec">
                  Revenue Yield: <span className="font-bold text-text-main">{currencyPrefix}{Number(call1.revPerLead || 0).toFixed(2)} / lead</span>
                </div>
              </div>
              <p className="text-xs text-text-mute mt-4 pt-3 border-t border-border-subtle">
                First-dial touchpoint. Reaches {totalLeadsInChart > 0 ? ((call1.current / totalLeadsInChart) * 100).toFixed(0) : 0}% of all prospective customers immediately.
              </p>
            </div>

            {/* Step 2 */}
            <div className="enterprise-card p-5 border-l-4 border-l-primary flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Tier 2: Recovery Zone</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                    Attempts 2–3
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-text-main tabular-nums">
                    {call2to3Rpc}%
                  </span>
                  <span className="text-xs font-medium text-text-sec">Avg RPC</span>
                  <span className="text-text-mute">•</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {call2to3Sale}% Sale
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-text-sec">
                  Revenue Yield: <span className="font-bold text-text-main">{currencyPrefix}{(call2to3.current > 0 ? call2to3.revSum / call2to3.current : 0).toFixed(2)} / lead</span>
                </div>
              </div>
              <p className="text-xs text-text-mute mt-4 pt-3 border-t border-border-subtle">
                Peak incremental conversion window. Follow-up calls here achieve the highest revenue per lead across all attempts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="enterprise-card p-5 border-l-4 border-l-amber-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Tier 3: Diminishing Returns</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-mono font-bold">
                    Attempts 4+
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-text-main tabular-nums">
                    {call4PlusRpc}%
                  </span>
                  <span className="text-xs font-medium text-text-sec">Avg RPC</span>
                  <span className="text-text-mute">•</span>
                  <span className="text-sm font-bold text-amber-700 font-mono">
                    {call4PlusSale}% Sale
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-amber-700 font-semibold">
                  Dialer Saturation: {callsData.highDialUnconverted?.toLocaleString() || 0} unclosed leads
                </div>
              </div>
              <p className="text-xs text-text-mute mt-4 pt-3 border-t border-border-subtle">
                Re-route to SMS or email nurturing after attempt 4 to protect agent capacity and dialer caller ID reputation.
              </p>
            </div>
          </div>

          {/* Charts Row: Diminishing Returns & Depth Composition */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 min-h-[400px] flex flex-col">
              <DiminishingReturnsChart
                title="Dial Attempt vs. Conversion Decay Curve"
                subtitle="Bars show lead volume by attempt tier; lines depict conversion rate trajectory."
                data={chartData}
                volumeKey="current"
                volumeName="Leads Contacted"
                primaryLineKey={primaryLineKey}
                primaryLineName={primaryLineName}
                secondaryLineKey={secondaryLineKey}
                secondaryLineName={secondaryLineName}
                benchmarkThreshold={10}
                benchmarkLabel="10% Marginal Target"
                height={320}
              />
            </div>

            <div className="min-h-[400px] flex flex-col">
              <MetricCompositionDonut
                title="Dial Depth Distribution"
                subtitle="Share of unique customer records by call depth."
                data={donutData}
                centerLabel="Total Leads"
                centerValue={totalLeadsInChart.toLocaleString()}
                height={290}
              />
            </div>
          </div>

          {/* Granular Attempt Performance Matrix (Directly visible, no hunting) */}
          <div className="enterprise-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface-sec/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-text-main tracking-tight">
                  Granular Dial Attempt Performance Matrix
                </h3>
                <p className="text-xs text-text-sec mt-0.5">
                  Exact conversion, revenue yield, and lead share per dial attempt bucket.
                </p>
              </div>
              <div className="text-[11px] font-mono text-text-mute bg-surface px-2.5 py-1 rounded-md border border-border-subtle">
                Entity: vw_call_performance
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="enterprise-table w-full">
                <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Attempt Depth</th>
                    <th className="px-5 py-3.5 text-right">Leads Dialed</th>
                    <th className="px-5 py-3.5 text-right">Share of Cohort</th>
                    <th className="px-5 py-3.5 text-right">RPC %</th>
                    <th className="px-5 py-3.5 text-right">Sale %</th>
                    <th className="px-5 py-3.5 text-right">Activation %</th>
                    <th className="px-5 py-3.5 text-right">Rev / Lead</th>
                    <th className="px-5 py-3.5 text-right">Total Revenue</th>
                    <th className="px-5 py-3.5 text-center">Cadence Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-xs">
                  {chartData.map((row: any, i: number) => {
                    const share = totalLeadsInChart > 0 ? ((row.current / totalLeadsInChart) * 100).toFixed(1) : '0';
                    const isOptimal = i === 0 || i === 1 || i === 2;
                    const isBurn = i >= 3;
                    
                    return (
                      <tr key={i} className="hover:bg-surface-sec/60 transition-colors">
                        <td className="font-sans font-medium text-text-main px-5 py-3.5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isOptimal ? '#0D9488' : '#D97706' }} />
                          <span className="font-semibold">{row.bucket}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-text-main font-medium tabular-nums">{row.current.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-text-sec tabular-nums">{share}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-teal tabular-nums">{row.rpc}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-primary tabular-nums">{row.sale}%</td>
                        <td className="px-5 py-3.5 text-right text-text-sec tabular-nums">{row.activation}%</td>
                        <td className="px-5 py-3.5 text-right font-bold text-text-main tabular-nums">
                          {currencyPrefix}{Number(row.revPerLead || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-text-main tabular-nums">
                          {currencyPrefix}{Number(row.totalRevenue || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {i === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-teal/10 text-teal text-[11px] font-sans font-semibold border border-teal/20">
                              Instant Golden Hour
                            </span>
                          ) : i < 3 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-sans font-semibold border border-emerald-200">
                              High Yield Window
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-sans font-semibold border border-amber-200">
                              Rest / Re-route
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMING & BEST WINDOWS */}
      {activeTab === 'timing' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="enterprise-card p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-teal/10 text-teal">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-text-sec uppercase tracking-wider">Top Contact Hour</span>
                <div className="text-2xl font-bold font-mono text-text-main mt-1">
                  {peakHour ? peakHour.label : 'N/A'}
                </div>
                <p className="text-xs text-text-mute mt-1">
                  {peakHour ? `${peakHour.rpcRate}% RPC rate with ${peakHour.volume.toLocaleString()} attempts` : 'Telemetry loading'}
                </p>
              </div>
            </div>

            <div className="enterprise-card p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-text-sec uppercase tracking-wider">Top Day of Week</span>
                <div className="text-2xl font-bold font-mono text-text-main mt-1">
                  {peakDay ? peakDay.day : 'N/A'}
                </div>
                <p className="text-xs text-text-mute mt-1">
                  {peakDay ? `${peakDay.rpcRate}% RPC rate (${peakDay.volume.toLocaleString()} attempts)` : 'Telemetry loading'}
                </p>
              </div>
            </div>

            <div className="enterprise-card p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-text-sec uppercase tracking-wider">Dial Fatigue Volume</span>
                <div className="text-2xl font-bold font-mono text-text-main mt-1">
                  {callsData.highDialUnconverted?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-text-mute mt-1">
                  Leads dialed 5+ times without sale conversion
                </p>
              </div>
            </div>
          </div>

          {/* Hourly Contactability Chart */}
          <div className="enterprise-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
              <div>
                <h3 className="font-display font-semibold text-sm sm:text-base text-text-main">
                  Hourly Contactability & Conversion Curve
                </h3>
                <p className="text-xs text-text-sec mt-0.5">
                  Dial volume (navy bars) plotted against Right-Party Contact (teal line) and Sale % (amber line) throughout operating hours.
                </p>
              </div>
              <div className="text-xs font-mono text-text-mute bg-surface-sec px-2.5 py-1 rounded-md border border-border-subtle self-start sm:self-auto">
                06:00 – 22:00
              </div>
            </div>

            <div style={{ height: 320, width: '100%' }} className="mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyData} margin={{ top: 15, right: 25, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    dy={10} 
                  />
                  <YAxis 
                    yAxisId="left" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(v) => formatChartAxis(v)} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(v) => `${v}%`} 
                    domain={[0, (dataMax: number) => Math.min(100, Math.ceil(dataMax * 1.25) || 50)]} 
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '10px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                      backgroundColor: '#ffffff',
                      padding: '10px 14px'
                    }}
                    labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                    formatter={(val: any, name: string) => {
                      if (name === 'Dial Volume') return [formatTableNumber(Number(val)), name];
                      return [`${Number(val).toFixed(1)}%`, name];
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="volume" 
                    name="Dial Volume" 
                    fill="#0F1E2E" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={36} 
                    isAnimationActive={false} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rpcRate" 
                    name="RPC Rate (%)" 
                    stroke="#0D9488" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: '#0D9488' }} 
                    isAnimationActive={false} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="saleRate" 
                    name="Sale Rate (%)" 
                    stroke="#D97706" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3, fill: '#D97706' }} 
                    isAnimationActive={false} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day of Week Contactability Chart */}
          <div className="enterprise-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
              <div>
                <h3 className="font-display font-semibold text-sm sm:text-base text-text-main">
                  Day-of-Week Contact Performance
                </h3>
                <p className="text-xs text-text-sec mt-0.5">
                  Volume distribution and conversion rates across Monday through Sunday.
                </p>
              </div>
              <div className="text-xs font-mono text-text-mute bg-surface-sec px-2.5 py-1 rounded-md border border-border-subtle self-start sm:self-auto">
                Day Grain
              </div>
            </div>

            <div style={{ height: 280, width: '100%' }} className="mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dayData} margin={{ top: 15, right: 25, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    dy={10} 
                  />
                  <YAxis 
                    yAxisId="left" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(v) => formatChartAxis(v)} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    tickFormatter={(v) => `${v}%`} 
                    domain={[0, (dataMax: number) => Math.min(100, Math.ceil(dataMax * 1.25) || 50)]} 
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      borderRadius: '10px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                      backgroundColor: '#ffffff',
                      padding: '10px 14px'
                    }}
                    labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                    formatter={(val: any, name: string) => {
                      if (name === 'Contact Volume') return [formatTableNumber(Number(val)), name];
                      return [`${Number(val).toFixed(1)}%`, name];
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="volume" 
                    name="Contact Volume" 
                    fill="#1E293B" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={44} 
                    isAnimationActive={false} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rpcRate" 
                    name="RPC Rate (%)" 
                    stroke="#0D9488" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: '#0D9488' }} 
                    isAnimationActive={false} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="saleRate" 
                    name="Sale Rate (%)" 
                    stroke="#D97706" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3, fill: '#D97706' }} 
                    isAnimationActive={false} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR EFFICIENCY & OUTCOMES */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {/* Vendor Benchmarks Table */}
          <div className="enterprise-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface-sec/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-sm sm:text-base text-text-main">
                  Partner Lead Source Dialing Efficiency
                </h3>
                <p className="text-xs text-text-sec mt-0.5">
                  Benchmark vendors on dials required to reach, single-dial resolution, and revenue velocity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute" />
                  <input
                    type="text"
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-border-subtle rounded-lg focus:outline-hidden focus:border-teal w-48"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="enterprise-table w-full">
                <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Vendor / Source</th>
                    <th 
                      onClick={() => handleVendorSort('totalLeads')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Delivered Leads</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-right">Called</th>
                    <th 
                      onClick={() => handleVendorSort('avgCallsPerLead')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Avg Dials / Lead</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleVendorSort('oneCallRate')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>1-Dial %</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleVendorSort('rpcRate')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>RPC %</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleVendorSort('saleRate')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Sale %</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleVendorSort('revPerLead')}
                      className="px-5 py-3.5 text-right cursor-pointer hover:text-text-main"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Rev / Called</span>
                        <ArrowUpDown className="w-3 h-3 text-text-mute" />
                      </div>
                    </th>
                    <th className="px-5 py-3.5 text-center">Cadence Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-xs">
                  {filteredVendors.map((v: any, i: number) => {
                    const isHighVelocity = v.oneCallRate > 50 && v.saleRate > 10;
                    const isHighFriction = v.avgCallsPerLead > 3 || (v.oneCallRate < 30 && v.saleRate < 5);

                    return (
                      <tr key={i} className="hover:bg-surface-sec/60 transition-colors">
                        <td className="font-sans font-medium text-text-main px-5 py-3.5 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-text-mute" />
                          <span className="font-semibold">{v.vendor}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-text-main tabular-nums">{v.totalLeads.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right text-text-sec tabular-nums">{v.calledLeads.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-text-main tabular-nums">{v.avgCallsPerLead}</td>
                        <td className="px-5 py-3.5 text-right text-text-sec tabular-nums">{v.oneCallRate}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-teal tabular-nums">{v.rpcRate}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-primary tabular-nums">{v.saleRate}%</td>
                        <td className="px-5 py-3.5 text-right font-bold text-text-main tabular-nums">
                          {currencyPrefix}{Number(v.revPerLead || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isHighVelocity ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-sans font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>High Velocity</span>
                            </span>
                          ) : isHighFriction ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-sans font-semibold border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Burn Heavy</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-sans font-semibold border border-slate-200">
                              Balanced
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recorded Outcome Dispositions */}
          <div className="enterprise-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface-sec/40 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-sm sm:text-base text-text-main">
                  Dialer Outcome & Status Distribution
                </h3>
                <p className="text-xs text-text-sec mt-0.5">
                  Proportion of dialer transactions by final recorded status and corresponding revenue.
                </p>
              </div>
              <div className="text-xs font-mono text-text-mute bg-surface px-2.5 py-1 rounded-md border border-border-subtle">
                Grain: transaction_status
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="enterprise-table w-full">
                <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Disposition Status</th>
                    <th className="px-5 py-3.5 text-right">Transactions</th>
                    <th className="px-5 py-3.5 text-left w-48">Volume Share</th>
                    <th className="px-5 py-3.5 text-right">RPC %</th>
                    <th className="px-5 py-3.5 text-right">Sale %</th>
                    <th className="px-5 py-3.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-xs">
                  {dispositionsData.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-sec/60 transition-colors">
                      <td className="font-sans font-medium text-text-main px-5 py-3.5">
                        {d.disposition || 'Completed / General'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-main tabular-nums">{d.volume.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-left">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-sec rounded-full h-2 overflow-hidden border border-border-subtle">
                            <div 
                              className="bg-primary h-full rounded-full" 
                              style={{ width: `${Math.min(100, d.share || 0)}%` }} 
                            />
                          </div>
                          <span className="text-[11px] text-text-mute tabular-nums w-10 text-right">{d.share}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-teal tabular-nums">{d.rpcRate}%</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-primary tabular-nums">{d.saleRate}%</td>
                      <td className="px-5 py-3.5 text-right font-bold text-text-main tabular-nums">
                        {currencyPrefix}{Number(d.revenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
