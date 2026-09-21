import { VisualTable } from '../components/visuals/DataVisual';
import React from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { useAnalyticsData } from '../lib/useAnalyticsData';
export default function AdminValidation() {
  const { data, loading, error, refetch } = useAnalyticsData('validation');
  return <PageShell><PageHeader title="Analytics Validation" description="Only independent, like-for-like measurements can establish reconciliation." />
    {loading ? <p role="status">Loading validation status…</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => refetch?.()}>Retry</button></div> : <div className="enterprise-card p-6 space-y-4">
      <h2 className="font-semibold">{data?.overallStatus || 'NOT_VERIFIED'}</h2><p>{data?.chain || 'No validation evidence is available.'}</p>
      <div className="overflow-x-auto"><VisualTable visual={{id:'validation.checks',data:(data?.metrics || [])}} className="enterprise-table w-full"><thead><tr><th>Metric</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
        {(data?.metrics || []).map((row: any) => <tr key={row.metric}><td>{row.metric}</td><td>{row.status}</td><td>{row.discrepancy}</td></tr>)}
      </tbody></VisualTable></div>
      <p className="text-sm">Missing raw, API, or rendered-interface measurements remain unknown. They are never filled with a semantic value to manufacture a pass.</p>
    </div>}
  </PageShell>;
}
