import React, { useEffect, useState } from 'react';
import { formatTableNumber } from '../lib/formatters';
import { TableSkeleton } from '../components/Skeleton';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { useFilters } from '../lib/FilterContext';
import { Loader2, Database, TableProperties, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';

export default function DataCoverage() {
  const { startDate, endDate } = useFilters();
  const [tableData, setTableData] = useState<any[]>([]);
  const [paramData, setParamData] = useState<any>(null);
  const [hlcCoverage, setHlcCoverage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    const vendorCoverageUrl = `/api/analytics/vendor-coverage?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    Promise.all([
      fetch('/api/analytics/discovery').then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false })),
      fetch('/api/analytics/parameter-coverage').then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false })),
      fetch(vendorCoverageUrl).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }))
    ]).then(([tData, pData, hData]) => {
      if (!isCurrent) return;
      if (tData?.success) setTableData(tData.data);
      if (pData?.success) setParamData(pData.data);
      if (hData && hData?.success) setHlcCoverage(hData.data);
      setLoading(false);
    }).catch(err => {
      console.warn("Data coverage fetch failed:", err);
      if (isCurrent) setLoading(false);
    });

    return () => { isCurrent = false; };
  }, [startDate, endDate]);

  if (loading || !paramData) {
    return (
      <div className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6"><TableSkeleton /></div>
    );
  }
  
  const mappedCount = tableData.filter(d => d.mapped).length;
  const totalCount = tableData.length;
  const coverage = totalCount > 0 ? ((mappedCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 pb-24 max-w-[1920px] mx-auto fade-in space-y-6">
      <PageHeader 
        title="Data & Parameter Coverage" 
        category="Semantic Schema Integrity"
        description="Audit BigQuery field mappings, canonical parameter schemas, and multi-vendor telemetry coverage." 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-6 sm:mb-8">
        <KpiCard title="Parameters Mapped" value={paramData.summary.mapped + " / " + paramData.summary.totalRequired} />
        <KpiCard title="Parameter Coverage" value={paramData.summary.coveragePercent} suffix="%" />
        <KpiCard title="Tables Scanned" value={totalCount} />
        <KpiCard title="Source Conflicts" value={paramData.summary.sourceConflicts} isPositiveGood={false} />
      </div>
      <div className="enterprise-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
          <h2 className="font-semibold text-text-main">Canonical Parameter Registry</h2>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Source Table</th>
                <th>Source Column</th>
                <th>Type</th>
                <th>Fallback Source</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paramData.parameters.map((p: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec">
                  <td>{p.canonicalParameter}</td>
                  <td>{p.sourceTable}</td>
                  <td>{p.sourceColumn}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-mono">{p.dataType}</span>
                  </td>
                  <td>{p.fallbackSource || '-'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'MAPPED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="enterprise-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
          <h2 className="font-semibold text-text-main">Table Schema Matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Table</th>
                <th>Domain</th>
                <th>Rows</th>
                <th>Used By</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableData.map((d: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec">
                  <td>{d.dataset}</td>
                  <td>
                    <TableProperties className="w-4 h-4 text-indigo-400" />
                    {d.table}
                  </td>
                  <td>{d.domain}</td>
                  <td>{formatTableNumber(d.rows)}</td>
                  <td>{d.usedBy || '-'}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.mapped ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {d.mapped ? 'MAPPED' : 'UNMAPPED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="enterprise-card overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
          <h2 className="font-semibold text-text-main">HLC Vendor Field Coverage</h2>
          <p className="text-xs text-text-sec mt-1">Completeness of analytical fields partitioned by HLC Vendor.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th className="text-right">Transactions</th>
                <th className="text-right">Status</th>
                <th className="text-right">Delivery</th>
                <th className="text-right">1st Call</th>
                <th className="text-right">Last Call</th>
                <th className="text-right">Disposition</th>
                <th className="text-right">RPC</th>
                <th className="text-right">Sale</th>
                <th className="text-right">Activation</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {hlcCoverage.map((d: any, i: number) => {
                const pct = (val: number) => (val * 100).toFixed(1) + '%';
                const getColor = (val: number) => val > 0.9 ? 'text-emerald-600 font-medium' : val > 0.5 ? 'text-amber-600' : 'text-slate-400';
                return (
                  <tr key={i} className="hover:bg-surface-sec">
                    <td className="font-medium text-text-main">{d.vendor || 'Unknown'}</td>
                    <td className="text-right">{formatTableNumber(d.total_transactions)}</td>
                    <td className={"text-right " + getColor(d.coverage_status)}>{pct(d.coverage_status)}</td>
                    <td className={"text-right " + getColor(d.coverage_delivery)}>{pct(d.coverage_delivery)}</td>
                    <td className={"text-right " + getColor(d.coverage_first_call)}>{pct(d.coverage_first_call)}</td>
                    <td className={"text-right " + getColor(d.coverage_last_call)}>{pct(d.coverage_last_call)}</td>
                    <td className={"text-right " + getColor(d.coverage_disposition)}>{pct(d.coverage_disposition)}</td>
                    <td className={"text-right " + getColor(d.coverage_rpc)}>{pct(d.coverage_rpc)}</td>
                    <td className={"text-right " + getColor(d.coverage_sale)}>{pct(d.coverage_sale)}</td>
                    <td className={"text-right " + getColor(d.coverage_activation)}>{pct(d.coverage_activation)}</td>
                    <td className={"text-right " + getColor(d.coverage_revenue)}>{pct(d.coverage_revenue)}</td>
                  </tr>
                );
              })}
              {hlcCoverage.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-text-mute italic">No HLC vendor data available for the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
