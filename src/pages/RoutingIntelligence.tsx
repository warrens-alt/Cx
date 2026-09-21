import { VisualTable } from '../components/visuals/DataVisual';
import React, { useState } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { TableSkeleton } from '../components/Skeleton';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useClient } from '../lib/ClientContext';
import { GitBranch, GitFork, Clock, AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RoutingIntelligence() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const { data, loading, error } = useAnalyticsData('routing');
  const [activeTab, setActiveTab] = useState<'paths' | 'handoff' | 'missing'>('paths');

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
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Load Routing Intelligence</h2>
          <p className="text-slate-600 text-sm mb-4">
            {error || 'No routing telemetry events found for the selected timeframe and filter context.'}
          </p>
        </div>
      </PageShell>
    );
  }

  const { overview, depthBreakdown, partnerHandoff, topRoutePaths, missingSample } = data;

  return (
    <PageShell>
      <PageHeader
        title="Routing Intelligence"
        description="Multi-partner routing journeys, cascade depth monetization, partner handoff fidelity, and latency telemetry."
      >
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Semantic Source: vw_ror_events & vw_leads</span>
        </div>
      </PageHeader>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4 lg:gap-5 mb-6 sm:mb-8">
        <KpiCard
          title="Total Routed Leads"
          value={overview.total_routed_leads || 0}
          subtitle={`${Number(overview.routed_lead_share_pct || 0).toFixed(1)}% of all captured`}
        />
        <KpiCard
          title="Avg Routing Depth"
          value={Number(overview.avg_routing_depth || 0).toFixed(2)}
          subtitle="Partners per routed lead"
        />
        <KpiCard
          title="Multi-Route Leads"
          value={overview.multi_route_leads || 0}
          subtitle={`${Number((overview.multi_route_leads / (overview.total_routed_leads || 1)) * 100).toFixed(1)}% cascaded`}
        />
        <KpiCard
          title="Handoff to HLC"
          value={`${Number(overview.handoff_rate_pct || 0).toFixed(1)}%`}
          subtitle={`${overview.missing_handoff_leads || 0} missing handoffs`}
        />
        <KpiCard
          title="Revenue-Matched Sale Share"
          value={`${Number(overview.routed_billable_sale_rate_pct || 0).toFixed(1)}%`}
          subtitle={`${overview.routed_billable_sale_leads || 0} leads with sales and recorded revenue`}
        />
        <KpiCard
          title="Routed Revenue"
          value={Math.round(overview.routed_revenue || 0)}
          prefix={currencyPrefix}
          subtitle="Total monetization"
        />
        <KpiCard
          title="Value per Routed Lead"
          value={Number(overview.rev_per_routed_lead || 0).toFixed(2)}
          prefix={currencyPrefix}
          subtitle="Rev / routed lead"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('paths')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'paths'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Routing Depth & Journey Paths</span>
        </button>

        <button
          onClick={() => setActiveTab('handoff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'handoff'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>Partner Handoff Matrix ({partnerHandoff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('missing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'missing'
              ? 'bg-[#18364F] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Handoff Discrepancies ({overview.missing_handoff_leads || 0})</span>
        </button>
      </div>

      {activeTab === 'paths' && (
        <div className="space-y-6">
          {/* Depth Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Routing Depth Economics</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monetization impact of cascading leads across multiple partners vs single-route termination.
                </p>
              </div>
              <div className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                Rule: Lead-level DISTINCT metrics
              </div>
            </div>

            <div className="overflow-x-auto">
              <VisualTable visual={{id:'routing.depth',data:(depthBreakdown)}} className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Routing Depth</th>
                    <th className="py-3 px-4 text-right">Unique Leads</th>
                    <th className="py-3 px-4 text-right">Share %</th>
                    <th className="py-3 px-4 text-right">Handoff Rate</th>
                    <th className="py-3 px-4 text-right">Delivery Rate</th>
                    <th className="py-3 px-4 text-right">Call Rate</th>
                    <th className="py-3 px-4 text-right">Sales / Fetched Leads (%)</th>
                    <th className="py-3 px-4 text-right">Revenue-Matched Sales / Fetched Leads (%)</th>
                    <th className="py-3 px-4 text-right">Recorded Revenue</th>
                    <th className="py-3 px-4 text-right">Recorded Revenue / Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {depthBreakdown.map((row: any, idx: number) => {
                    const isHighDepth = row.routing_depth >= 3;
                    return (
                      <tr key={idx} className={isHighDepth ? 'bg-teal-50/20 hover:bg-teal-50/40' : 'hover:bg-slate-50/50'}>
                        <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isHighDepth ? 'bg-teal-600' : 'bg-slate-400'}`}></span>
                          {row.depth_bucket}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(row.leads || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(row.lead_share_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(row.handoff_rate_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(row.delivery_rate_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(row.call_rate_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(row.sale_rate_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">{Number(row.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(row.total_revenue || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-teal-700 bg-teal-50/40">{currencyPrefix}{Number(row.rev_per_lead || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </VisualTable>
            </div>
          </div>

          {/* Top Route Paths Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Top Partner Routing Sequences</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Performance across specific chronological route journeys ordered by volume and sequence monetization.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <VisualTable visual={{id:'routing.paths',data:(topRoutePaths)}} className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Journey Path</th>
                    <th className="py-3 px-4 text-center">Hops</th>
                    <th className="py-3 px-4 text-right">Unique Leads</th>
                    <th className="py-3 px-4 text-right">Share %</th>
                    <th className="py-3 px-4 text-right">Delivered / Fetched Leads (%)</th>
                    <th className="py-3 px-4 text-right">Called %</th>
                    <th className="py-3 px-4 text-right">Sales / Fetched Leads (%)</th>
                    <th className="py-3 px-4 text-right">Revenue-Matched Sales / Fetched Leads (%)</th>
                    <th className="py-3 px-4 text-right">Recorded Revenue</th>
                    <th className="py-3 px-4 text-right">Recorded Revenue / Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {topRoutePaths.map((path: any, idx: number) => {
                    const partners = path.route_path.split(' -> ');
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center flex-wrap gap-1.5">
                            {partners.map((p: string, pIdx: number) => (
                              <React.Fragment key={pIdx}>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  pIdx === 0 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {p}
                                </span>
                                {pIdx < partners.length - 1 && (
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-sans font-medium text-slate-700">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            {path.partner_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(path.leads || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(path.share_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(path.deliv_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(path.call_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-slate-600">{Number(path.sale_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">{Number(path.billable_sale_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(path.total_revenue || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-teal-700 bg-teal-50/30">{currencyPrefix}{Number(path.rev_per_lead || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </VisualTable>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'handoff' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Partner Handoff & Latency Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluation of routing delivery, HLC handoff rates, cascade delays, and monetization per partner.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Cascade Delay: seconds between routing hops</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <VisualTable visual={{id:'routing.handoff',data:(partnerHandoff)}} className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ROR Partner</th>
                  <th className="py-3 px-4 text-right">Total Routed</th>
                  <th className="py-3 px-4 text-right">1st Route</th>
                  <th className="py-3 px-4 text-right">Cascade Route</th>
                  <th className="py-3 px-4 text-right">Avg Cascade Delay</th>
                  <th className="py-3 px-4 text-right">Handoff Leads</th>
                  <th className="py-3 px-4 text-right">Handoff Rate</th>
                  <th className="py-3 px-4 text-right">Delivered Rate</th>
                  <th className="py-3 px-4 text-right">Revenue-Matched Sales / Fetched Leads (%)</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue</th>
                  <th className="py-3 px-4 text-right">Recorded Revenue / Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {partnerHandoff.map((p: any, idx: number) => {
                  const handoffPct = Number(p.handoff_rate_pct || 0);
                  const isHealthy = handoffPct >= 95;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-sans font-medium text-slate-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {p.partner}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">{Number(p.routed_leads || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{Number(p.first_route_leads || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{Number(p.cascade_route_leads || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {p.avg_cascade_delay_sec != null ? `${Number(p.avg_cascade_delay_sec).toFixed(0)}s` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-medium">{Number(p.handoff_leads || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                          handoffPct >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {handoffPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">{Number(p.delivery_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">{Number(p.billable_sale_rate_pct || 0).toFixed(1)}%</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{currencyPrefix}{Math.round(p.total_revenue || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-teal-700">{currencyPrefix}{Number(p.rev_per_lead || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </VisualTable>
          </div>
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Routing Records without Matched Vendor Transactions</h3>
              <p className="text-xs text-slate-500">
                Audit of records with an ROR partner routing timestamp where no corresponding HLC transaction was registered.
              </p>
            </div>
          </div>

          {missingSample.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center text-emerald-800">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
              <p className="font-semibold text-sm">No Missing Matches Returned by This Check</p>
              <p className="text-xs text-emerald-700 mt-1">
                No missing-match sample was returned. This does not establish independent reconciliation, successful delivery or complete source coverage.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <VisualTable visual={{id:'routing.missing',data:(missingSample)}} className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Consumer ID</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Route Seq</th>
                    <th className="py-3 px-4">Source / Medium</th>
                    <th className="py-3 px-4">ROR Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {missingSample.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900 font-medium">{m.lead_id}</td>
                      <td className="py-3 px-4 text-slate-600">{m.consumer_id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-800">{m.partner}</td>
                      <td className="py-3 px-4 text-center">{m.route_sequence}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{m.source} / {m.medium}</td>
                      <td className="py-3 px-4 text-slate-500">{m.ror_timestamp?.value || m.ror_timestamp || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </VisualTable>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
