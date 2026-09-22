import { VisualTable } from '../components/visuals/DataVisual';
import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { useFilters } from '../lib/FilterContext';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataState } from '../components/DataState';
import { compareExactDecimal } from '../lib/breakdown';
import { sumExact } from '../lib/explore/model';
import { decimal, exactLabel } from '../lib/visuals/model';

export default function Insights() {
  const { startDate, endDate } = useFilters();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedMetric, setSelectedMetric] = useState('activations');
  const [selectedDimension, setSelectedDimension] = useState('source');
  
  const { data: insightsResponse, loading, error, refetch } = useAnalyticsData('insights', {
    metric: selectedMetric,
    dimension: selectedDimension
  });

  const rawList = insightsResponse?.data || insightsResponse || [];
  const rows: any[] = Array.isArray(rawList) ? rawList : [];
  const changeOf = (row: any) => decimal(row.change);
  const topLosers = [...rows].filter(d => changeOf(d) !== null && compareExactDecimal(changeOf(d)!, '0') < 0)
    .sort((a, b) => compareExactDecimal(changeOf(a)!, changeOf(b)!)).slice(0, 3);
  const totalChange = sumExact(rows.map(changeOf));
  const totalDirection = totalChange === null ? null : compareExactDecimal(totalChange, '0');
  const absolute = (value: string) => value.startsWith('-') ? value.slice(1) : value;
  const label = (value: unknown) => exactLabel(decimal(value));

  return (
    <PageShell>
      <PageHeader 
        title="Analytical Insights" 
        category="Automated Variance Decomposition"
        description="Observed differences across matched periods. Source contributions describe changes, not their causes."
      />

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <DataState error={error} retry={refetch}/>
      ) : rows.length === 0 ? (
        <EmptyState message="Not enough historical data to generate driver insights for the selected filter range." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Summary Card */}
            <div className="enterprise-card p-6 lg:col-span-1 bg-surface-sec/30 border-l-4 border-l-teal flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-text-main font-semibold mb-3">
                  <TrendingUp className="w-5 h-5 text-teal" />
                  Activation Drivers
                </div>
                <div className="text-[14px] text-text-sec leading-relaxed">
                  During the selected period, overall activations shifted by <strong className={`font-semibold ${totalDirection !== null && totalDirection > 0 ? 'text-semantic-pos' : totalDirection !== null && totalDirection < 0 ? 'text-semantic-neg' : ''}`}>{totalDirection !== null && totalDirection > 0 ? '+' : ''}{label(totalChange)}</strong>.
                  Below are the recorded source contributions to this movement compared to the preceding matched period. This does not establish causation.
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-mute">
                Diagnostic grain: Partner / Source
              </div>
            </div>

            {/* Attention Panel */}
            <div className="enterprise-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-text-main font-semibold mb-4">
            <AlertTriangle className="w-5 h-5 text-semantic-warn" />
            What Needs Attention?
          </div>
          <div className="space-y-3">
            {topLosers.length > 0 ? topLosers.map((loser, i) => (
              <div 
                key={i} 
                onClick={() => navigate({pathname:'/explore',search:location.search})}
                className="p-3 border border-border-subtle rounded-lg bg-surface hover:bg-surface-sec cursor-pointer transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-[13px] font-medium text-text-main">
                    Source <span className="text-semantic-neg bg-semantic-neg/10 px-1.5 py-0.5 rounded ml-1">{loser.segment}</span> dropped by {label(absolute(changeOf(loser)!))} activations
                  </div>
                  <div className="text-[12px] text-text-mute mt-1">
                    Fell from {label(loser.previous)} to {label(loser.current)}. Click to investigate in Explore.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-mute group-hover:text-teal transition-colors" />
              </div>
            )) : (
              <div className="text-[13px] text-text-sec">No negative changes returned.</div>
            )}
          </div>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border-strong bg-surface-sec flex justify-between items-center">
          <h2 className="font-semibold text-text-main">Source Contribution Waterfall</h2>
        </div>
        <div className="overflow-x-auto">
          <VisualTable visual={{id:'comparison',data:(rows), context:{metric:selectedMetric}}} className="enterprise-table w-full">
            <thead>
              <tr>
                <th>Source Segment</th>
                <th className="text-right">Previous Period</th>
                <th className="text-right">Current Period</th>
                <th className="text-right">Absolute Change</th>
                <th>Impact Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row: any, i: number) => {
                const change = changeOf(row);
                const direction = change === null ? null : compareExactDecimal(change, '0');
                const isPositive = direction !== null && direction > 0;
                const isNegative = direction !== null && direction < 0;
                return (
                  <tr key={i} className="hover:bg-surface-sec">
                    <td className="font-medium">{row.segment}</td>
                    <td className="text-right text-text-sec">{label(row.previous)}</td>
                    <td className="text-right font-medium">{label(row.current)}</td>
                    <td className="text-right">
                      {direction !== null && direction !== 0 && change !== null && (
                        <span className={`inline-flex items-center ${isPositive ? 'text-semantic-pos' : 'text-semantic-neg'}`}>
                          {isPositive ? '+' : ''}{label(change)}
                        </span>
                      )}
                      {direction === 0 && <span className="text-text-mute">-</span>}
                      {direction === null && <span className="text-text-mute">Unavailable</span>}
                    </td>
                    <td>
                      {isPositive && <div className="flex items-center text-semantic-pos text-[12px]"><ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Positive Driver</div>}
                      {isNegative && <div className="flex items-center text-semantic-neg text-[12px]"><ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Negative Driver</div>}
                      {direction === 0 && <div className="text-text-mute text-[12px]">Neutral</div>}
                      {direction === null && <div className="text-text-mute text-[12px]">Unavailable</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </VisualTable>
        </div>
      </div>
    </div>
      )}
    </PageShell>
  );
}
