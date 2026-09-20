import React, { Suspense, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ArrowRight, Info, Table as TableIcon } from 'lucide-react';
import { formatKpiValue } from '../lib/formatters';
const DataAuditDrawer=React.lazy(()=>import('./DataAuditDrawer'));
const MetricLineageDrawer=React.lazy(()=>import('./MetricLineageDrawer'));
interface KpiCardProps { title:string;value:string|number|null;change?:number;changeLabel?:string;isPositiveGood?:boolean;prefix?:string;suffix?:string;loading?:boolean;subtitle?:string;lineage?:any;metadata?:any;onAnalyse?:()=>void;onWhyChanged?:()=>void; }
export default function KpiCard({title,value,change,changeLabel='vs baseline',isPositiveGood=true,prefix='',suffix='',loading=false,subtitle,lineage,metadata,onAnalyse,onWhyChanged}:KpiCardProps){
  const [drawerOpen,setDrawerOpen]=useState(false),[auditOpen,setAuditOpen]=useState(false);
  if(loading)return <div className="enterprise-card cx-kpi" role="status" aria-label={`Loading ${title}`}><div className="animate-pulse h-4 bg-slate-100 rounded mb-4"/><div className="animate-pulse h-9 bg-slate-100 rounded w-1/2"/></div>;
  const missing=value===null||value===undefined||value==='Unavailable';
  const hasChange=typeof change==='number'&&Number.isFinite(change);
  const positive=hasChange&&(change!>0?isPositiveGood:!isPositiveGood),Icon=change===0?Minus:change!>0?ArrowUpRight:ArrowDownRight;
  return <>
    <article className="enterprise-card cx-kpi"><div className="cx-kpi-heading"><h3>{title}</h3>{lineage&&<div className="cx-kpi-tools">
      <button type="button" aria-label={`Definition of ${title}`} title="Metric definition" onClick={()=>setDrawerOpen(true)}><Info size={15}/></button>
      <button type="button" aria-label={`Inspect selected lead population for ${title}`} title="Selected lead population (legacy)" onClick={()=>setAuditOpen(true)}><TableIcon size={15}/></button>
    </div>}</div><div className="cx-kpi-amount">{!missing&&prefix&&<small>{prefix}</small>}<strong>{missing?'Unavailable':typeof value==='number'?formatKpiValue(value):value}</strong>{!missing&&suffix&&<small>{suffix}</small>}</div>
    <div className="cx-kpi-note">{hasChange?<span className="inline-flex flex-wrap gap-2 items-center"><span className={change===0?'text-slate-600':positive?'text-emerald-700':'text-rose-700'}><Icon className="inline mr-1" size={14}/>{Math.abs(change!).toFixed(1)}%</span><span>{changeLabel}</span></span>:subtitle||'No comparison supplied'}</div>
    {(onAnalyse||onWhyChanged)&&<footer className="cx-kpi-footer">{onWhyChanged&&<button type="button" className="cx-link-button" onClick={onWhyChanged}>Why changed?</button>}{onAnalyse&&<button type="button" className="cx-link-button ml-auto" onClick={onAnalyse}>Analyse<ArrowRight size={14}/></button>}</footer>}
    </article>
    {lineage&&(auditOpen||drawerOpen)&&<Suspense fallback={<span role="status" className="sr-only">Loading details…</span>}>
      {auditOpen&&<DataAuditDrawer isOpen onClose={()=>setAuditOpen(false)} title={`Selected Lead Population: ${title}`} contextFilters={{}}/>}
      {drawerOpen&&<MetricLineageDrawer isOpen onClose={()=>setDrawerOpen(false)} title={title} lineage={lineage} metadata={metadata}/>}
    </Suspense>}
  </>;
}
