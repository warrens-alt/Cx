import React, { useState } from 'react';
import DataVisual from '../components/visuals/DataVisual';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { DataState } from '../components/DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { API_VISUAL_REPORT_GROUPS } from '../lib/visuals/datasets';
export default function VisualWorkspace(){
  const [endpoint,setEndpoint]=useState('overview');
  const {data,metadata,loading,error,refetch}=useAnalyticsData(endpoint);
  return <PageShell><PageHeader title="Visual Workspace" description="Explore every available report and configured source through adjustable charts. The source API and reporting filters remain authoritative."/>
    <section className="cx-visual-workspace-intro"><p>Choose an API report, then a dataset and measure. Switch chart type, compare compatible series, inspect points, or count returned records by category. Date-based reports support line and area charts. Tables elsewhere in the app also have their own visual controls.</p>
      <label>Report or configured source<select aria-label="Visual report source" value={endpoint} onChange={e=>setEndpoint(e.target.value)}>{API_VISUAL_REPORT_GROUPS.map(group=><optgroup key={group.label} label={group.label}>{group.reports.map(([value,label])=><option key={value} value={value}>{label}</option>)}</optgroup>)}</select></label>
      <p className="mt-3">Source diagnostics use their stated source date, not necessarily capture date. Unsupported filters or missing permissions produce an error, never a broader replacement query. Unmapped warehouse tables remain metadata-only until approved.</p>
    </section>
    {loading||error||!data?<DataState loading={loading} error={error} empty={!data} retry={refetch}/>:<div key={endpoint}><DataVisual id="api.response" data={data} context={{endpoint}}/><details className="enterprise-card p-4"><summary>API reporting context</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(metadata||{},null,2)}</pre></details></div>}
  </PageShell>;
}
