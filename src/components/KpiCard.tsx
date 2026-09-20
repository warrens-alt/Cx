import DataAuditDrawer from './DataAuditDrawer';
import { Table as TableIcon } from 'lucide-react';
import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import MetricLineageDrawer from './MetricLineageDrawer';
import { formatKpiValue } from '../lib/formatters';

interface KpiCardProps {
  title: string;
  value: string | number | null;
  change?: number; // percentage or pp change
  changeLabel?: string; // e.g., "vs matched period"
  isPositiveGood?: boolean; // If true, positive change is green. If false, positive change is red.
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  subtitle?: string;
  lineage?: any;
  metadata?: any;
  onAnalyse?: () => void;
  onWhyChanged?: () => void;
}

export default function KpiCard({
  title,
  value,
  change,
  changeLabel = 'vs baseline',
  isPositiveGood = true,
  prefix = '',
  suffix = '',
  loading = false,
  subtitle,
  lineage,
  metadata,
  onAnalyse,
  onWhyChanged
}: KpiCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  if (loading) {
    return (
      <div className="enterprise-card p-4 animate-pulse h-full flex flex-col justify-between">
        <div>
          <div className="h-3 w-1/2 bg-border-subtle rounded mb-3"></div>
          <div className="h-8 w-3/4 bg-border-subtle rounded mb-2"></div>
        </div>
        <div className="h-3 w-1/3 bg-border-subtle rounded"></div>
      </div>
    );
  }

  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isGood = isUp ? isPositiveGood : !isPositiveGood;
  
  let pillClasses = 'bg-slate-100 text-slate-600';
  let Icon = Minus;
  
  if (isUp) {
    pillClasses = isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60';
    Icon = ArrowUpRight;
  } else if (isDown) {
    pillClasses = isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60';
    Icon = ArrowDownRight;
  }

  return (
    <>
      <div className="enterprise-card p-4 sm:p-5 h-full flex flex-col justify-between group hover:border-slate-300 hover:shadow-sm transition-all duration-150 relative bg-surface">
        <div>
          {/* Card Top: Title and Lineage/Audit Icons */}
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-sec leading-snug break-words" title={title}>
              {title}
            </h3>
            
            {lineage && (
              <div className="flex items-center gap-1 shrink-0">
                <button 
                  onClick={() => setDrawerOpen(true)} 
                  className="p-1 text-text-mute hover:text-teal hover:bg-teal-50 rounded transition-colors"
                  title="Metric Lineage & Formula"
                >
                  <Info className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setAuditOpen(true)} 
                  className="p-1 text-text-mute hover:text-teal hover:bg-teal-50 rounded transition-colors" 
                  title="Inspect Underlying Data Rows"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Main KPI Value */}
          <div className="flex items-baseline gap-1.5 my-1.5 flex-wrap">
            {prefix && value !== null && value !== undefined && <span className="text-base sm:text-lg font-semibold text-text-sec">{prefix}</span>}
            <span className="text-kpi-value font-display font-bold text-text-main text-2xl sm:text-3xl tracking-tight tabular-nums">
              {value === null || value === undefined ? "Unavailable" : typeof value === "number" ? formatKpiValue(value) : value}
            </span>
            {suffix && value !== null && value !== undefined && <span className="text-xs sm:text-sm font-medium text-text-sec ml-0.5">{suffix}</span>}
          </div>
        </div>
        
        {/* Footer / Trend Info */}
        <div className="mt-3 pt-2.5 border-t border-border-subtle/80">
          {change !== undefined && change !== 0 ? (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap ${pillClasses}`}>
                <Icon className="w-3.5 h-3.5 mr-1 shrink-0" />
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-text-mute text-xs font-normal leading-tight">{changeLabel}</span>
            </div>
          ) : subtitle ? (
            <div className="text-xs text-text-mute font-medium leading-relaxed">{subtitle}</div>
          ) : (
            <div className="text-xs text-text-mute font-normal">No comparison supplied</div>
          )}

          {/* Drill-down Actions */}
          {(onWhyChanged || onAnalyse) && (
            <div className="mt-2.5 pt-2 border-t border-border-subtle/80 flex items-center justify-between text-xs">
              {onWhyChanged && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhyChanged();
                  }}
                  className="text-teal hover:text-teal-dark hover:underline font-medium transition-colors"
                >
                  Why changed?
                </button>
              )}
              {onAnalyse && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyse();
                  }}
                  className="text-text-sec hover:text-teal font-medium ml-auto transition-colors flex items-center gap-1"
                >
                  Analyse &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {lineage && (
        <DataAuditDrawer
          isOpen={auditOpen}
          onClose={() => setAuditOpen(false)}
          title={`Data Audit: ${title}`}
          contextFilters={lineage.canonicalName === 'Activations' ? { activated: { operator: 'equals', value: true } } : lineage.canonicalName === 'Sales' ? { sale: { operator: 'equals', value: true } } : {}}
        />
      )}
      {lineage && (
        <MetricLineageDrawer 
          isOpen={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          title={title} 
          lineage={lineage} 
          metadata={metadata} 
        />
      )}
    </>
  );
}
