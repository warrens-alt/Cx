import React from 'react';
import { chartCoordinate } from '../../lib/evidenceWorkspace';

export interface ExactBarDatum { label: string; value: string | null; formatted: string; secondary?: string | null; secondaryFormatted?: string; }

export default function ExactBarChart({ data, title, description, empty = 'No measured groups matched this selection.', onSelect }: { data: ExactBarDatum[]; title: string; description: string; empty?: string; onSelect?: (label: string) => void }) {
  const max = Math.max(0, ...data.map(item=>Math.abs(chartCoordinate(item.value) ?? 0)));
  return <section className="enterprise-card cx-ops-chart" aria-label={title}><header><div><h2>{title}</h2><p>{description}</p></div><span>{data.length} groups</span></header>
    {!data.length ? <p className="cx-ops-chart-empty" role="status">{empty}</p> : <div className="cx-ops-bars">{data.map(item=>{
      const coordinate = Math.abs(chartCoordinate(item.value) ?? 0), width=max?Math.max(2,(coordinate/max)*100):0;
      return <button type="button" key={item.label} className="cx-ops-bar-row" onClick={()=>onSelect?.(item.label)} disabled={!onSelect} aria-label={`${item.label}: ${item.formatted}`}>
        <span className="cx-ops-bar-label">{item.label}</span><span className="cx-ops-bar-track"><span style={{width:`${width}%`}}/></span><strong>{item.formatted}</strong>
        {item.secondaryFormatted&&<small>{item.secondaryFormatted}</small>}
      </button>;
    })}</div>}
  </section>;
}
