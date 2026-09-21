import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { datasetsFor } from '../../lib/visuals/datasets';
import type { VisualDataset } from '../../lib/visuals/model';
import '../../styles/visuals.css';
const VisualExplorer=React.lazy(()=>import('./VisualExplorer'));
export interface DataVisualProps { id:string; data:unknown; context?:any; datasets?:VisualDataset[]; onInspect?:(dataset:VisualDataset,rowIndex:number)=>void; }
export default function DataVisual({id,data,context,datasets,onInspect}:DataVisualProps){
  const host=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false);
  const contextKey=JSON.stringify(context||{});
  const sources=useMemo(()=>datasets||datasetsFor(id,data,context),[id,data,contextKey,datasets]);
  useEffect(()=>{if(!host.current)return;if(typeof IntersectionObserver==='undefined'){setReady(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'250px'});observer.observe(host.current);return()=>observer.disconnect();},[]);
  return <div ref={host} className="cx-data-visual" data-visual-surface={id}>
    <ErrorBoundary resetKeys={[id,data]} fallbackRender={({resetErrorBoundary})=><div role="alert" className="cx-viz-empty">The visual view could not be displayed. The original table remains available.<button type="button" onClick={resetErrorBoundary}>Retry chart</button></div>}>
      {ready?<Suspense fallback={<div className="cx-viz-placeholder" role="status">Loading interactive visuals…</div>}><VisualExplorer datasets={sources} onInspect={onInspect}/></Suspense>:<div className="cx-viz-placeholder"><span>Interactive chart view</span><button type="button" onClick={()=>setReady(true)}>Open chart controls</button></div>}
    </ErrorBoundary>
  </div>;
}
/** Keeps the original table and its exact renderer; chart views never parse its displayed text. */
export function VisualTable({visual,children,...tableProps}:any){
  const [view,setView]=useState<'both'|'chart'|'table'>('both');
  return <div className="cx-visual-table" data-visual-table={visual.id}>
    <nav aria-label="Chart and table view" className="cx-viz-tabs">{(['both','chart','table'] as const).map(mode=><button type="button" key={mode} aria-pressed={view===mode} onClick={()=>setView(mode)}>{mode==='both'?'Chart + table':mode==='chart'?'Chart only':'Table only'}</button>)}</nav>
    {view!=='table'&&<DataVisual {...visual}/>}<div hidden={view==='chart'} className="cx-original-table"><table {...tableProps}>{children}</table></div>
  </div>;
}
