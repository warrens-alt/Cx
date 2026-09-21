import { VisualTable } from '../components/visuals/DataVisual';
import React, { useCallback } from 'react';
import { PageShell } from '../components/PageShell';
import { formatTableNumber, formatTableCurrency } from '../lib/formatters';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import PageHeader from '../components/PageHeader';
import { DataState } from '../components/DataState';

export default function DataQuality() {
  const { data, loading, error, refetch } = useAnalyticsData('data-quality');

  if (error) return <PageShell><PageHeader title="Data Quality & Timestamps"/><DataState error={error} retry={refetch}/></PageShell>;

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }

  const { issues: issuesData, freshness } = data;

  const hasCritical = issuesData?.some((i: any) => i.severity === 'Critical');

  return (
    <PageShell>
      <PageHeader 
        title="Data Quality & Pipeline Telemetry" 
        category="Telemetry Verification"
        description="Monitor BigQuery streaming ingestion health, timestamp freshness, and semantic integrity."
      >
        {hasCritical ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            Critical Issues Detected
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            No critical issues returned
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <div className="enterprise-card p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-0.5">Latest Lead Ingest</div>
            <div className="text-base font-bold text-text-main font-mono">{freshness?.latestCapture || 'Synchronized'}</div>
          </div>
        </div>
        <div className="enterprise-card p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-0.5">Latest Delivery</div>
            <div className="text-base font-bold text-text-main font-mono">{freshness?.latestDelivery || 'Synchronized'}</div>
          </div>
        </div>
        <div className="enterprise-card p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-0.5">Latest Call Event</div>
            <div className="text-base font-bold text-text-main font-mono">{freshness?.latestCall || 'Synchronized'}</div>
          </div>
        </div>
        <div className="enterprise-card p-4 flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-text-sec uppercase tracking-wider mb-0.5">Latest Capture among Leads with Sales Realization</div>
            <div className="text-base font-bold text-text-main font-mono">{freshness?.latestSale || 'Synchronized'}</div>
          </div>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-base sm:text-lg font-semibold text-text-main">Detected Anomalies</h3>
        </div>
        
        <div className="overflow-x-auto">
          <VisualTable visual={{id:'quality.issues',data:(issuesData)}} className="enterprise-table">
            <thead className="bg-surface-sec text-text-sec font-semibold border-b border-slate-200 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Issue Description</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4 text-right">Affected Records</th>
                <th className="px-6 py-4 text-right">% of Total</th>
                <th className="px-6 py-4">Last Seen</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuesData.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec/50 transition-colors">
                  <td className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-text-mute shrink-0" />
                    <span className="font-medium text-text-main">{row.issue}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      row.severity === 'Critical' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {row.severity}
                    </span>
                  </td>
                  <td>{formatTableNumber(row.affected)}</td>
                  <td>{row.percentage}%</td>
                  <td>{row.lastSeen}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      Audit Logged
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </VisualTable>
        </div>
      </div>
    </PageShell>
  );
}
