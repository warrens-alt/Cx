import React from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TableSkeleton } from '../components/Skeleton';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { ShieldCheck, AlertCircle, CheckCircle2, Award } from 'lucide-react';

export default function Revetting() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data, loading, error } = useAnalyticsData('revetting');

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (error || !data || !data.comparison) {
    return (
      <PageShell>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Load Re-vetting Data</h2>
          <p className="text-slate-600 text-sm mb-4">{error || 'No vetting status data available.'}</p>
        </div>
      </PageShell>
    );
  }

  const { comparison, vettingColorBreakdown } = data;
  const original = comparison.find((c: any) => !c.is_revetted) || comparison[0] || {};
  const revetted = comparison.find((c: any) => c.is_revetted) || {};

  return (
    <PageShell>
      <PageHeader
        title="Re-vetting & Quality Vetting Performance"
        description="Comparative analysis of first-pass leads versus re-vetted leads, vetting score tiering, and commercial outcomes."
      >
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Vetting Grain: vw_leads (is_revetted flag)</span>
        </div>
      </PageHeader>

      {/* Comparison KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-5 mb-6 sm:mb-8">
        <KpiCard
          title="Original Leads"
          value={original.leads || 0}
          subtitle="First-pass evaluation"
        />
        <KpiCard
          title="Re-vetted Leads"
          value={revetted.leads || 0}
          subtitle="Secondary vetting pass"
        />
        <KpiCard
          title="Original Billable Sale"
          value={`${Number(original.billable_sale_rate_pct || 0).toFixed(1)}%`}
          subtitle="Conversion rate"
        />
        <KpiCard
          title="Re-vetted Billable Sale"
          value={`${Number(revetted.billable_sale_rate_pct || 0).toFixed(1)}%`}
          subtitle="Conversion rate"
        />
        <KpiCard
          title="Original Rev / Lead"
          value={Number(original.rev_per_lead || 0).toFixed(2)}
          prefix={currencyPrefix}
          subtitle="Monetization per lead"
        />
        <KpiCard
          title="Re-vetted Rev / Lead"
          value={Number(revetted.rev_per_lead || 0).toFixed(2)}
          prefix={currencyPrefix}
          subtitle="Monetization per lead"
        />
      </div>

      {/* Comparison Table */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Original vs Re-vetted Cohort Comparison</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation of full-funnel progression and revenue realization across vetting status.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Cohort</th>
                  <th className="py-3 px-4 text-right">Unique Leads</th>
                  <th className="py-3 px-4 text-right">Delivered %</th>
                  <th className="py-3 px-4 text-right">Call Rate %</th>
                  <th className="py-3 px-4 text-right">RPC Rate %</th>
                  <th className="py-3 px-4 text-right">Sale Event %</th>
                  <th className="py-3 px-4 text-right">Billable Sale %</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Rev / Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {comparison.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${c.is_revetted ? 'bg-indigo-600' : 'bg-teal-600'}`}></span>
                      {c.is_revetted ? 'Re-vetted Leads' : 'Original Leads'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">{Number(c.leads || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right text-slate-600">{Number(c.delivery_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right text-slate-600">{Number(c.call_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right text-slate-600">{Number(c.rpc_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right text-slate-600">{Number(c.sale_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">{Number(c.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(c.total_revenue || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-teal-700 bg-teal-50/30">{currencyPrefix}{Number(c.rev_per_lead || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vetting Score Tier Breakdown */}
        {vettingColorBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Vetting Score Tier Breakdown</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Performance cross-tabulated by vetting tier rating (Green, Orange, Charcoal) and re-vetting status.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Vetting Tier</th>
                    <th className="py-3 px-4 text-center">Re-vetted</th>
                    <th className="py-3 px-4 text-right">Unique Leads</th>
                    <th className="py-3 px-4 text-right">Sale Event %</th>
                    <th className="py-3 px-4 text-right">Billable Sale %</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Rev / Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {vettingColorBreakdown.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-sans font-medium text-slate-900">{row.vetting || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                          row.is_revetted ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.is_revetted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(row.leads || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{Number(row.sale_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">{Number(row.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(row.total_revenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-teal-700">{currencyPrefix}{Number(row.rev_per_lead || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
