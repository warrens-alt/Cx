import React, { useState } from 'react';
import { formatKpiValue, formatTableNumber } from '../../lib/formatters';
import { ChartToolbar } from './ChartToolbar';
import { Layers, BarChart2, TrendingDown, ArrowRight } from 'lucide-react';
import { getTaxonomyItem } from '../../lib/taxonomy';

export interface FunnelStep {
  label: string;
  value: number;
  rate?: number; // relative to previous or overall
  dropoff?: number;
  isTerminal?: boolean;
  costMetric?: string;
  metric?: string;
  itemNo?: number;
}

interface FunnelWaterfallProps {
  title: string;
  subtitle?: string;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  steps: FunnelStep[];
}

export function FunnelWaterfall({ 
  title, 
  subtitle, 
  steps, 
  auditTitle, 
  auditContext, 
  auditGrain 
}: FunnelWaterfallProps) {
  const [viewMode, setViewMode] = useState<'bars' | 'flow'>('bars');

  if (!steps || steps.length === 0) return null;
  
  const maxVal = Math.max(...steps.map(s => s.value)) || 1;
  const topOfFunnel = steps[0]?.value || 1;
  const bottomOfFunnel = steps[steps.length - 1]?.value || 0;
  const overallConversionPct = ((bottomOfFunnel / topOfFunnel) * 100).toFixed(1);

  // Find the stage with the highest absolute drop-off
  let maxDropoffStage = '';
  let maxDropoffVal = 0;
  for (let i = 1; i < steps.length; i++) {
    const drop = steps[i - 1].value - steps[i].value;
    if (drop > maxDropoffVal) {
      maxDropoffVal = drop;
      maxDropoffStage = `${steps[i - 1].label} → ${steps[i].label}`;
    }
  }

  return (
    <div className="enterprise-card p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <ChartToolbar 
            title={title} 
            subtitle={subtitle} 
            auditTitle={auditTitle} 
            auditContext={auditContext} 
            auditGrain={auditGrain} 
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-sec p-1 rounded-lg border border-border-subtle shrink-0">
          <button
            onClick={() => setViewMode('bars')}
            className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
              viewMode === 'bars' 
                ? 'bg-surface text-text-main shadow-xs font-semibold' 
                : 'text-text-sec hover:text-text-main'
            }`}
            title="Waterfall Bars"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Bars</span>
          </button>
          <button
            onClick={() => setViewMode('flow')}
            className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-colors ${
              viewMode === 'flow' 
                ? 'bg-surface text-text-main shadow-xs font-semibold' 
                : 'text-text-sec hover:text-text-main'
            }`}
            title="Flow Progression"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flow</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 bg-surface-sec/70 p-3 rounded-lg border border-border-subtle text-xs">
        <div>
          <span className="text-xs text-text-mute block">End-to-End Conv.</span>
          <span className="font-bold text-teal font-mono text-sm tabular-nums">{overallConversionPct}%</span>
        </div>
        <div>
          <span className="text-xs text-text-mute block">Total Volume Loss</span>
          <span className="font-bold text-semantic-neg font-mono text-sm tabular-nums">
            -{formatKpiValue(topOfFunnel - bottomOfFunnel)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-xs text-text-mute block">Peak Leakage Point</span>
          <span className="font-medium text-text-main block truncate" title={maxDropoffStage}>
            {maxDropoffStage || 'None'}
          </span>
        </div>
      </div>
      
      {viewMode === 'bars' ? (
        <div className="flex-1 flex flex-col justify-between py-1 space-y-3.5 overflow-y-auto">
          {steps.map((step, idx) => {
            const isFirst = idx === 0;
            const pctOfMax = (step.value / maxVal) * 100;
            const pctOfTop = ((step.value / topOfFunnel) * 100).toFixed(1);
            const dropoffFromPrev = idx > 0 ? steps[idx - 1].value - step.value : 0;
            const retentionRate = idx > 0 && steps[idx - 1].value > 0
              ? ((step.value / steps[idx - 1].value) * 100).toFixed(1)
              : null;
            
            // Color progression: Deep Navy -> Ocean Teal -> Vibrant Emerald for terminal
            const barBg = step.isTerminal 
              ? 'bg-emerald-600' 
              : idx === 0 
                ? 'bg-[#0F1E2E]' 
                : idx < 4 
                  ? 'bg-[#1E3A52]' 
                  : 'bg-[#0D9488]';

            const isBarWide = pctOfMax > 18;
            const tax = getTaxonomyItem(step.label);
            const costCode = step.costMetric || tax?.costMetric;

            return (
              <div key={step.label} className="relative flex items-center group">
                <div className="w-44 shrink-0 pr-3">
                  <div className="text-xs font-semibold text-text-main leading-snug flex items-center gap-1.5 truncate" title={step.label}>
                    <span className="truncate">{step.label}</span>
                    {costCode && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-sec text-text-sec border border-border-subtle shrink-0">
                        {costCode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-mute font-mono">
                    {pctOfTop}% of top
                  </div>
                </div>
                
                <div className="flex-1 h-9 relative flex items-center bg-surface-sec/70 rounded-lg overflow-hidden">
                  <div 
                    className={`h-full rounded-lg transition-all duration-500 ease-out ${barBg}`} 
                    style={{ width: `${Math.max(pctOfMax, 2)}%` }}
                  />
                  <div className={`absolute ${isBarWide ? 'left-3 text-white' : 'left-[calc(2%+8px)] text-text-main'} font-semibold text-xs drop-shadow-xs z-10 flex items-center gap-1.5 tabular-nums`}>
                    <span>{formatTableNumber(step.value)}</span>
                  </div>
                </div>

                {!isFirst && dropoffFromPrev > 0 && (
                  <div className="ml-3 w-32 shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/70 whitespace-nowrap">
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                      -{formatKpiValue(dropoffFromPrev)}
                    </span>
                    {retentionRate && (
                      <span className="block text-xs text-text-mute mt-0.5 tabular-nums">
                        {retentionRate}% step yield
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flow Progression Cards View */
        <div className="flex-1 flex flex-col justify-between py-2 space-y-2.5 overflow-y-auto">
          {steps.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === steps.length - 1;
            const dropoffFromPrev = idx > 0 ? steps[idx - 1].value - step.value : 0;
            const stepConv = idx > 0 && steps[idx - 1].value > 0
              ? ((step.value / steps[idx - 1].value) * 100).toFixed(1)
              : null;

            const tax = getTaxonomyItem(step.label);
            const costCode = step.costMetric || tax?.costMetric;

            return (
              <div key={step.label} className="relative flex flex-col">
                <div className={`p-3.5 rounded-lg border transition-all ${
                  step.isTerminal 
                    ? 'bg-emerald-50/70 border-emerald-200' 
                    : 'bg-surface border-border-subtle hover:border-teal/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-surface-sec text-text-sec text-xs font-mono font-bold flex items-center justify-center border border-border-subtle">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-text-main">{step.label}</span>
                      {costCode && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-sec text-text-sec border border-border-subtle">
                          {costCode}
                        </span>
                      )}
                      {step.isTerminal && (
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Terminal
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-text-main">
                        {formatTableNumber(step.value)}
                      </span>
                      <span className="text-xs text-text-mute ml-1.5 font-mono">
                        ({((step.value / topOfFunnel) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {!isFirst && (
                    <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex items-center justify-between text-xs">
                      <span className="text-text-sec">
                        Conversion from previous: <strong className="text-teal font-mono">{stepConv}%</strong>
                      </span>
                      {dropoffFromPrev > 0 && (
                        <span className="text-rose-600 font-mono font-medium">
                          Dropped: -{formatTableNumber(dropoffFromPrev)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div className="flex justify-center my-0.5 text-text-mute">
                    <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
