import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import { EmptyState } from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { LeadTimelineModal } from '../components/LeadTimelineModal';
import PageHeader from '../components/PageHeader';
import { useQueryClient } from '@tanstack/react-query';

export default function LeadExplorer() {
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const limit = 20;
  const offset = (page - 1) * limit;

  // We add limit and offset to the endpoint URL query directly.
  const { data: leads, loading } = useAnalyticsData("leads", { limit, offset });
  const queryClient = useQueryClient();

  const handleNext = () => setPage(p => p + 1);
  const handlePrev = () => setPage(p => Math.max(1, p - 1));

  if (loading && !leads) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (!leads && !loading) {
    return (
      <PageShell>
        <EmptyState message="Configure BigQuery in settings or adjust your date filters." />
      </PageShell>
    );
  }

  const isNextDisabled = !leads || leads.length < limit;

  return (
    <PageShell className="flex flex-col">
      <PageHeader 
        title="Lead Explorer & Record Registry" 
        category="Row-Level Ledger Audit"
        description="Inspect individual lead lifecycles, timestamps, dialer attempts, and conversion outcomes."
      >
        <button 
          onClick={() => {
            const link = document.createElement('a');
            link.href = '/api/analytics/export?grain=lead&format=csv';
            link.setAttribute('download', '');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-border-strong rounded-lg text-sm font-medium text-text-main hover:bg-surface-sec transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-teal" />
          Export Current View
        </button>
      </PageHeader>
      <div className="enterprise-card flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-surface-sec/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-mute" />
            <input 
              type="text" 
              placeholder="Search by Lead ID, Phone, or Email..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto relative">
          {loading && leads && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="text-teal font-medium">Loading...</div>
            </div>
          )}
          <table className="enterprise-table">
            <thead className="bg-surface-sec text-text-sec font-semibold border-b border-slate-200 uppercase tracking-wider text-xs sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3.5">Lead ID</th>
                <th className="px-4 py-3.5">Capture Time</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Traffic Medium</th>
                <th className="px-4 py-3.5">Quality</th>
                <th className="px-4 py-3.5 text-center">Recorded Call Attempts</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Recorded Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads?.map((lead: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec transition-colors cursor-pointer group" onClick={() => setSelectedLead(lead.id)}>
                  <td className="px-4 py-3.5 font-medium text-teal group-hover:underline">{lead.id}</td>
                  <td className="px-4 py-3.5 text-text-sec whitespace-nowrap">{new Date(lead.captured?.value || lead.captured).toLocaleString()}</td>
                  <td className="px-4 py-3.5">{lead.source}</td>
                  <td className="px-4 py-3.5 text-text-sec">{lead.campaign}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{lead.quality}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center font-medium">{lead.calls}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                      lead.status === 'Sale' || lead.status === 'Activated' ? 'bg-indigo-50 text-indigo-700 font-medium' :
                      lead.status === 'Contacted' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-700">{lead.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-surface-sec text-sm text-text-sec flex justify-between items-center">
          <span>Showing Page {page}</span>
          <div className="flex gap-2">
            <button 
              onClick={handlePrev}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button 
              onClick={handleNext}
              disabled={isNextDisabled}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      {selectedLead && <LeadTimelineModal leadId={selectedLead} onClose={() => setSelectedLead(null)} />}
    </PageShell>
  );
}
