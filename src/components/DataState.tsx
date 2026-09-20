import React from 'react';
import { AlertCircle, Database } from 'lucide-react';
import { TableSkeleton } from './Skeleton';

/** Failed requests never render cached values as a successful empty result. */
export function DataState({ loading = false, error, empty = false, retry }:
  { loading?: boolean; error?: string | null; empty?: boolean; retry?: () => void }) {
  if (error) return <section role="alert" className="enterprise-card p-6 space-y-3">
    <AlertCircle size={24} aria-hidden="true" />
    <h2 className="font-semibold">Source data could not be loaded</h2>
    <p className="text-sm break-words">{error}</p>
    {retry && <button type="button" className="cx-button-secondary" onClick={retry}>Retry request</button>}
  </section>;
  if (loading) return <div role="status" aria-label="Loading source data"><span className="sr-only">Loading source data…</span><div aria-hidden="true"><TableSkeleton /></div></div>;
  if (empty) return <section role="status" className="enterprise-card p-6 space-y-3">
    <Database size={24} aria-hidden="true" /><h2 className="font-semibold">No source result available</h2>
    <p className="text-sm">No result was returned for this selection. This does not establish a zero count.</p>
  </section>;
  return null;
}
