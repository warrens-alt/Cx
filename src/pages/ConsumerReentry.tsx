import { VisualTable } from '../components/visuals/DataVisual';
import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TableSkeleton } from '../components/Skeleton';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { DataState } from '../components/DataState';
import { Users, Repeat, DollarSign, TrendingDown, Layers, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ConsumerReentry() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data, loading, error, refetch } = useAnalyticsData('consumers');
  const [activeTab, setActiveTab] = useState<'tiers' | 'sequence' | 'sample'>('tiers');

  if (error) return <PageShell><PageHeader title="Consumer Re-entry"/><DataState error={error} retry={refetch}/></PageShell>;

  if (loading) {
    return (
      <PageShell>
        <TableSkeleton />
      </PageShell>
    );
  }

  if (error || !data || !data.overview) {
    return (
      <PageShell>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Load Consumer Re-entry Data</h2>
          <p className="text-slate-600 text-sm mb-4">
            {error || 'No consumer entities detected in the current filter range.'}
          </p>
        </div>
      </PageShell>
    );
  }

  const { overview, tiers, sequenceEconomics, repeatConsumersSample } = data;

  return (
    <PageShell>
      <PageHeader
        title="Consumer Re-entry & Recycle Intelligence"
        description="Consumer-level deduplication, repeat entry frequency, sequence decay economics, and multi-lead lifecycle value."
      >
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Entity: vw_consumers (Grain: consumer_id)</span>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-5 mb-6 sm:mb-8">
        <KpiCard
          title="Total Consumers"
          value={overview.total_consumers || 0}
          subtitle={`${Number(overview.avg_leads_per_consumer || 0).toFixed(2)} leads / consumer`}
        />
        <KpiCard
          title="Repeat Consumers"
          value={overview.repeat_consumers || 0}
          subtitle={`${Number(overview.repeat_consumer_share_pct || 0).toFixed(1)}% re-entry rate`}
        />
        <KpiCard
          title="Revenue-Matched Sale Share (Single-Lead Consumers)"
          value={`${Number(overview.single_billable_sale_rate_pct || 0).toFixed(1)}%`}
          subtitle="Consumers with a revenue-matched sale / single-lead consumers"
        />
        <KpiCard
          title="Revenue-Matched Sale Share (Repeat Consumers)"
          value={`${Number(overview.repeat_billable_sale_rate_pct || 0).toFixed(1)}%`}
          subtitle="Consumers with a revenue-matched sale / repeat consumers"
        />
        <KpiCard
          title="Recorded Revenue (Single-Lead Consumers)"
          value={Math.round(overview.single_consumer_revenue || 0)}
          prefix={currencyPrefix}
          subtitle={`${currencyPrefix}${Number(overview.rev_per_single_consumer || 0).toFixed(2)} / consumer`}
        />
        <KpiCard
          title="Recorded Revenue (Repeat Consumers)"
          value={Math.round(overview.repeat_consumer_revenue || 0)}
          prefix={currencyPrefix}
          subtitle={`${currencyPrefix}${Number(overview.rev_per_repeat_consumer || 0).toFixed(2)} / consumer`}
        />
        <KpiCard
          title="Recorded Revenue (All Consumers)"
          value={Math.round(overview.total_revenue || 0)}
          prefix={currencyPrefix}
          subtitle="Revenue summed by recorded consumer ID; not verified lifetime value"
        />
      </div>

      {/* Sub Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tiers'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Volume Tiers Distribution</span>
        </button>

        <button
          onClick={() => setActiveTab('sequence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'sequence'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Sequential Entry Economics</span>
        </button>

        <button
          onClick={() => setActiveTab('sample')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'sample'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>High-Frequency Repeat Consumers</span>
        </button>
      </div>

      {activeTab === 'tiers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Consumer Volume Tier Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of consumer base by lifetime lead submission count and revenue yield.
              </p>
            </div>
            <div className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded">
              Rule: Count(DISTINCT consumer_id)
            </div>
          </div>

          <div className="overflow-x-auto">
            <VisualTable visual={{id:'consumers.tiers',data:(tiers)}} className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lead Tier</th>
                  <th className="py-3 px-4 text-right">Consumers</th>
                  <th className="py-3 px-4 text-right">Consumer Share</th>
                  <th className="py-3 px-4 text-right">Total Leads</th>
                  <th className="py-3 px-4 text-right">Consumers w/ Sale</th>
                  <th className="py-3 px-4 text-right">Consumers with Sales / Consumers (%)</th>
                  <th className="py-3 px-4 text-right">Revenue-Matched Consumers with Sales / Consumers (%)</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue / Consumer</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue / Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {tiers.map((tier: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                      {tier.lead_tier}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(tier.consumer_count || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{Number(tier.consumer_share_pct || 0).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(tier.total_leads || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{Number(tier.consumers_with_sale || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{Number(tier.sale_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">{Number(tier.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(tier.total_revenue || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-teal-700">{currencyPrefix}{Number(tier.rev_per_consumer || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 bg-slate-50/50">{currencyPrefix}{Number(tier.rev_per_lead || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </VisualTable>
          </div>
        </div>
      )}

      {activeTab === 'sequence' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Sequential Entry Conversion & Economics</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                How contact, reach, sales, and revenue decay or perform across sequential submissions by the same consumer.
              </p>
            </div>
            <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
              Order: ROW_NUMBER() OVER(PARTITION BY consumer_id ORDER BY capture_timestamp ASC)
            </div>
          </div>

          <div className="overflow-x-auto">
            <VisualTable visual={{id:'consumers.sequence',data:(sequenceEconomics)}} className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sequential Stage</th>
                  <th className="py-3 px-4 text-right">Lead Count</th>
                  <th className="py-3 px-4 text-right">Delivered / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">Dialled / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">RPC / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">Sales / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">Revenue-Matched Sales / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue / Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {sequenceEconomics.map((seq: any, idx: number) => {
                  const isFirst = seq.entry_stage === '1st Entry';
                  return (
                    <tr key={idx} className={isFirst ? 'bg-teal-50/20 font-medium' : 'hover:bg-slate-50/60'}>
                      <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isFirst ? 'bg-teal-600' : 'bg-slate-400'}`}></span>
                        {seq.entry_stage}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">{Number(seq.leads || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">{Number(seq.delivery_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">{Number(seq.call_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">{Number(seq.rpc_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right text-slate-600">{Number(seq.sale_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">{Number(seq.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(seq.total_revenue || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-teal-800 bg-teal-50/50">{currencyPrefix}{Number(seq.rev_per_lead || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </VisualTable>
          </div>
        </div>
      )}

      {activeTab === 'sample' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Highest-Value Multi-Lead Consumers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Top repeat consumers ranked by recorded revenue across retained entries.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <VisualTable visual={{id:'consumers.sample',data:(repeatConsumersSample)}} className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Consumer ID</th>
                  <th className="py-3 px-4 text-center">Recorded Leads</th>
                  <th className="py-3 px-4 text-center">Unique Sources</th>
                  <th className="py-3 px-4 text-center">Unique Vendors</th>
                  <th className="py-3 px-4 text-center">Transactions</th>
                  <th className="py-3 px-4">First Lead Date</th>
                  <th className="py-3 px-4">Latest Lead Date</th>
                  <th className="py-3 px-4 text-center">Sale Flag with Recorded Revenue</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {repeatConsumersSample.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">{c.consumer_id}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{c.lead_count}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">{c.unique_source_count}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{c.unique_vendor_count}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{c.transaction_count}</td>
                    <td className="py-3 px-4 text-slate-600">{c.first_lead_date?.value || c.first_lead_date || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-600">{c.latest_lead_date?.value || c.latest_lead_date || 'N/A'}</td>
                    <td className="py-3 px-4 text-center">
                      {c.has_billable_sale ? (
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">Yes</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-xs text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{currencyPrefix}{Number(c.total_revenue || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </VisualTable>
          </div>
        </div>
      )}
    </PageShell>
  );
}
