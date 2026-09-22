import React from 'react';
import { AlertCircle, Database, LoaderCircle } from 'lucide-react';

export default function WorkspaceState({ loading, error, missingRelease, scopeError, retry }: { loading?: boolean; error?: unknown; missingRelease?: string | null; scopeError?: string | null; retry?: () => void }) {
  if (loading) return <section className="enterprise-card cx-ops-state" role="status"><LoaderCircle className="animate-spin" size={22}/><div><h2>Calculating the selected scope</h2><p>Figures remain hidden until the snapshot-bound query completes.</p></div></section>;
  if (error) return <section className="enterprise-card cx-ops-state cx-ops-state-error" role="alert"><AlertCircle size={22}/><div><h2>This workspace could not be calculated</h2><p>{error instanceof Error ? error.message : 'The reporting request failed.'}</p>{retry&&<button type="button" className="cx-button-secondary" onClick={retry}>Retry request</button>}</div></section>;
  if (scopeError) return <section className="enterprise-card cx-ops-state cx-ops-state-warning" role="status"><AlertCircle size={22}/><div><h2>Reporting scope exceeds approved evidence</h2><p>{scopeError}</p></div></section>;
  if (missingRelease) return <section className="enterprise-card cx-ops-state" role="status"><Database size={22}/><div><h2>No approved release available</h2><p>{missingRelease}</p><p>No legacy or demonstration figures are substituted.</p></div></section>;
  return null;
}
