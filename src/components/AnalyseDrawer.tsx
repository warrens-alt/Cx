import { VisualTable } from './visuals/DataVisual';
import React, { useEffect, useRef, useState } from 'react';
import { useAnalyticsData } from '../lib/useAnalyticsData';
interface Props { isOpen: boolean; onClose: () => void; metric: string; metricLabel: string; }
export default function AnalyseDrawer({ isOpen, onClose, metric, metricLabel }: Props) {
  const [dimension, setDimension] = useState('source');
  const { data, metadata, loading, error } = useAnalyticsData('/drivers', { metric, dimension });
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button, select, a[href], [tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const rows = Array.isArray(data) ? data : [];
  const format = (value: unknown) => value === null || value === undefined || !Number.isFinite(Number(value)) ? 'Not available' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return <div className="fixed inset-0 z-50 bg-slate-900/50 flex justify-end"><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="driver-title" className="w-full max-w-3xl bg-surface h-full overflow-y-auto p-6 space-y-5">
    <div className="flex justify-between gap-4"><h2 id="driver-title" className="text-xl font-semibold">Changes in {metricLabel}</h2><button ref={closeButton} onClick={onClose} className="rounded border px-3 py-2" aria-label="Close analysis">Close</button></div>
    <p className="text-sm">Observed changes within the active filters. These comparisons do not establish cause and may reflect different outcome maturity.</p>
    <label className="block">Break down by <select className="border rounded p-2 ml-2" value={dimension} onChange={e => setDimension(e.target.value)}><option value="source">Source</option><option value="medium">Medium</option><option value="grade">Grade</option><option value="vetting">Vetting</option></select></label>
    {loading ? <p role="status">Loading comparison…</p> : error ? <p role="alert">{error}</p> : <>
      <p className="text-sm">Current: {metadata?.currentPeriod?.startDate || '—'} to {metadata?.currentPeriod?.endDate || '—'}. Previous: {metadata?.previousPeriod?.startDate || '—'} to {metadata?.previousPeriod?.endDate || '—'}.</p>
      <div className="overflow-x-auto"><VisualTable visual={{id:'comparison',data:(rows), context:{metric}}} className="enterprise-table w-full"><thead><tr><th>Segment</th><th>Current</th><th>Previous</th><th>Change</th><th>Relative change</th></tr></thead><tbody>
        {rows.map((row: any) => <tr key={row.segment}><td>{row.segment}</td><td>{format(row.current)}</td><td>{format(row.previous)}</td><td>{format(row.change)}</td><td>{row.pctChange === null ? 'No comparable baseline' : `${format(row.pctChange)}%`}</td></tr>)}
      </tbody></VisualTable></div>{rows.length === 0 && <p>No comparable segment records were returned.</p>}
    </>}
  </div></div>;
}
