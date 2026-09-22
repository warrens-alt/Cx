import React, { useEffect, useState } from 'react';
import { Check, Clipboard, Database, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useFilters } from '../../lib/FilterContext';

export default function EvidenceScopeBar({ releaseId, cutoff, busy = false }: { releaseId?: string | null; cutoff?: string | null; busy?: boolean }) {
  const scope = useFilters();
  const [draft, setDraft] = useState({ startDate: scope.startDate, endDate: scope.endDate, vendor: scope.vendor, source: scope.source, medium: scope.medium });
  const [copied, setCopied] = useState(false);
  useEffect(() => setDraft({ startDate: scope.startDate, endDate: scope.endDate, vendor: scope.vendor, source: scope.source, medium: scope.medium }), [scope.startDate, scope.endDate, scope.vendor, scope.source, scope.medium]);
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    scope.setDateRange(draft.startDate, draft.endDate);
    scope.setVendor(draft.vendor); scope.setSource(draft.source); scope.setMedium(draft.medium);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };
  const chips = [scope.vendor && `Vendor: ${scope.vendor}`, scope.source && `Source: ${scope.source}`, scope.medium && `Medium: ${scope.medium}`].filter(Boolean) as string[];
  return <section className="cx-ops-scope" aria-label="Current reporting scope">
    <div className="cx-ops-scope-summary">
      <Database size={17} aria-hidden="true"/><div><strong>{scope.startDate} — {scope.endDate}</strong><span>{releaseId ? `Approved release ${releaseId}` : 'Approved release unavailable'}{cutoff ? ` · evidence through ${cutoff.slice(0,10)}` : ''}</span></div>
      {busy && <span className="cx-ops-running" role="status">Calculating selected scope…</span>}
      <div className="cx-ops-scope-actions"><button type="button" className="cx-button-secondary" onClick={copy}>{copied?<Check size={15}/>:<Clipboard size={15}/>} {copied?'View link copied':'Copy current view'}</button></div>
    </div>
    {chips.length > 0 && <div className="cx-ops-chips" aria-label="Active filters">{chips.map(chip=><span key={chip}>{chip}</span>)}</div>}
    <details className="cx-ops-filter-drawer"><summary><SlidersHorizontal size={15}/>Edit query filters</summary>
      <form onSubmit={apply} className="cx-ops-filter-form">
        <label className="cx-field"><span>From (UTC)</span><input type="date" required value={draft.startDate} max={draft.endDate} onChange={event=>setDraft(old=>({...old,startDate:event.target.value}))}/></label>
        <label className="cx-field"><span>Through (UTC)</span><input type="date" required value={draft.endDate} min={draft.startDate} max={cutoff?.slice(0,10)} onChange={event=>setDraft(old=>({...old,endDate:event.target.value}))}/></label>
        <label className="cx-field"><span>Vendor names</span><input value={draft.vendor} placeholder="Comma-separated exact names" onChange={event=>setDraft(old=>({...old,vendor:event.target.value}))}/></label>
        <label className="cx-field"><span>Sources</span><input value={draft.source} placeholder="Comma-separated exact names" onChange={event=>setDraft(old=>({...old,source:event.target.value}))}/></label>
        <label className="cx-field"><span>Media</span><input value={draft.medium} placeholder="Comma-separated exact names" onChange={event=>setDraft(old=>({...old,medium:event.target.value}))}/></label>
        <div className="cx-ops-filter-actions"><button type="submit" className="cx-button-primary">Apply scope</button><button type="button" className="cx-button-secondary" onClick={()=>scope.clearFilters()}><X size={15}/>Clear filters</button><button type="button" className="cx-link-button" onClick={()=>scope.resetScope()}><RotateCcw size={14}/>Reset report</button></div>
      </form>
      <p>These controls change the warehouse query. Chart type, search, sort and pagination below are local presentation controls.</p>
    </details>
    <p className="cx-ops-copy-note">Copied links reopen the current selection. They are not frozen snapshots; use Evidence Reports for a pinned execution.</p>
  </section>;
}
