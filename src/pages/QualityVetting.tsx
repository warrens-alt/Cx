import React from 'react';
import { PageShell } from '../components/PageShell';
import { formatTableNumber } from '../lib/formatters';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import { DistributionBar } from '../components/charts/DistributionBar';
import KpiCard from '../components/KpiCard';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';

export default function QualityVetting() {
  const { data: qualityData, loading } = useAnalyticsData('quality');
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R' : '$';

  if (loading) {
    return (
      <PageShell><TableSkeleton /></PageShell>
    );
  }

  if (!qualityData) {
    return (
      <PageShell><EmptyState message="Configure BigQuery in settings or adjust your date filters." /></PageShell>
    );
  }

  const summary = qualityData.fullFunnelSummary || {};
  const gradeBreakdown = qualityData.fullFunnelByGrade || [];

  return (
    <PageShell>
      <PageHeader 
        title="Quality & Vetting" 
        category="Lead Verification & Scoring"
        description="Analyse lead quality grades, fraud and duplicate vetting outcomes, and downstream commercial conversion."
      />

      <div className="space-y-6 sm:space-y-8">
        {/* Quality KPIs */}
        <div>
          <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-2.5">
            Validation & Verification Efficiency
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <KpiCard 
              title="Recorded Validation Pass Rate" 
              value={qualityData.passRate || 0} 
              suffix="%" 
              subtitle={`${(summary.passed || 0).toLocaleString()} valid leads`}
            />
            <KpiCard 
              title="Recorded Validation Failure Rate" 
              value={summary.leads ? Number(((summary.failed / summary.leads) * 100).toFixed(1)) : 0} 
              suffix="%" 
              subtitle={`${(summary.failed || 0).toLocaleString()} failed-validation records`}
              isPositiveGood={false}
            />
            <KpiCard 
              title="Fetched-to-Delivered Lead Rate" 
              value={summary.deliveryRate || 0} 
              suffix="%" 
              subtitle={`${(summary.delivered || 0).toLocaleString()} passed to vendor`}
            />
            <KpiCard 
              title="Recorded Revenue per Fetched Lead" 
              value={summary.revPerLead || 0} 
              prefix={currencyPrefix} 
              subtitle={`${currencyPrefix}${(summary.revenue || 0).toLocaleString()} total revenue`}
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-h-[380px] flex flex-col">
            <DistributionBar 
              title="Validation Flag Distribution" 
              subtitle="Pass and fail counts from the recorded validity flag; not a grade distribution."
              data={qualityData.grades}
              bucketKey="name"
              valueKey="value"
              height={300}
            />
          </div>
          <div className="min-h-[380px] flex flex-col">
            <DistributionBar 
              title="Recorded Validation Outcomes" 
              subtitle="Recorded validity flags; duplicate causes are not classified."
              data={qualityData.vetting}
              bucketKey="name"
              valueKey="value"
              height={300}
            />
          </div>
        </div>

        {/* Full Funnel Performance by Quality Grade */}
        {gradeBreakdown.length > 0 && (
          <div className="enterprise-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle bg-surface-sec flex items-center justify-between">
              <div>
                <h3 className="text-card-title text-text-main font-semibold">Full Funnel Commercial Performance by Quality Grade</h3>
                <p className="text-xs text-text-sec mt-0.5">Observe how lead quality grading directly drives dial coverage, contactability, and commercial sales.</p>
              </div>
              <span className="text-xs font-mono text-text-mute px-2.5 py-1 bg-surface rounded border border-border-subtle">
                Tiered validation
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="enterprise-table w-full">
                <thead className="bg-surface-sec text-text-sec font-semibold border-b border-border-subtle uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-5 py-3">Quality Grade</th>
                    <th className="px-4 py-3 text-right">Leads</th>
                    <th className="px-4 py-3 text-right">Delivered</th>
                    <th className="px-4 py-3 text-right">Dialled</th>
                    <th className="px-4 py-3 text-right">RPC</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Sales with Recorded Revenue</th>
                    <th className="px-4 py-3 text-right">Activated</th>
                    <th className="px-4 py-3 text-right">Recorded Revenue</th>
                    <th className="px-4 py-3 text-right">Recorded Revenue / Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono text-xs">
                  {gradeBreakdown.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-surface-sec/70 transition-colors">
                      <td className="px-5 py-3 font-sans font-medium text-text-main flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-teal' : 'bg-slate-400'}`} />
                        {row.grade}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-main">{formatTableNumber(row.leads)}</td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.delivered || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.deliveryRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.called || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.callRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.rpcs || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.rpcRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-teal">
                        {formatTableNumber(row.sales || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.saleRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right text-text-sec">
                        {formatTableNumber(row.billableSales || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.billableSaleRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatTableNumber(row.activations || 0)}
                        <span className="text-[11px] text-text-mute block font-sans">{row.activationRate || 0}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-text-main">
                        {currencyPrefix}{formatTableNumber(row.revenue || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-teal">
                        {currencyPrefix}{Number(row.revPerLead || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Rejection Reasons */}
        <div className="enterprise-card p-6">
          <h3 className="text-base sm:text-lg font-semibold text-text-main mb-4">Vetting & Suppressions Breakdown</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="enterprise-table w-full">
              <thead className="bg-surface-sec text-text-sec font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Classification</th>
                  <th className="px-6 py-4 text-right">Volume</th>
                  <th className="px-6 py-4 text-right">Percentage of Capture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {(qualityData.reasons || []).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-surface-sec">
                    <td className="font-sans font-medium text-text-main px-6 py-4">{row.reason}</td>
                    <td className="px-6 py-4 text-right">{formatTableNumber(row.count)}</td>
                    <td className="px-6 py-4 text-right font-medium text-text-sec">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
