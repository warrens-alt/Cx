import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, X, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useClient } from '../lib/ClientContext';
import { useFilters } from '../lib/FilterContext';
import { utcDatePresets } from '../lib/presentation';
export function cn(...inputs: any[]) { return twMerge(clsx(inputs)); }
export default function GlobalFilter(_props:{onOpenMobileMenu?:()=>void;onOpenCommandPalette?:()=>void}) {
  const {selectedClient}=useClient(), {startDate,endDate,setDateRange,filters,setFilter,clearFilters}=useFilters();
  const cache=useQueryClient(),[refreshing,setRefreshing]=useState(false),[refreshError,setRefreshError]=useState<string|null>(null);
  const options=useQuery({queryKey:['filter-options',selectedClient,startDate,endDate],queryFn:async({signal})=>{
    const response=await fetch('/api/analytics/filter-options?'+new URLSearchParams({clientId:selectedClient,startDate,endDate}),{signal,credentials:'same-origin'});
    const payload=await response.json();if(!response.ok||payload.success!==true)throw new Error(typeof payload.error==='string'?payload.error:'Filter choices could not be loaded');return payload.data;
  },staleTime:120000,retry:false});
  const opts=options.data||{},presets=utcDatePresets();
  const refresh=async()=>{setRefreshing(true);setRefreshError(null);try{await Promise.all([cache.invalidateQueries({queryKey:['analytics']}),options.refetch()]);}catch{setRefreshError('Reload could not complete. Retry the affected report.');}finally{setRefreshing(false);}};
  const select=(key:string,label:string,values:any[])=>{
    const selected=filters[key]?.operator==='in'?filters[key]?.values?.join(',')||'':'';
    const choices=Array.isArray(values)?values.map(v=>String(v.value??v)):[];
    return <label className="cx-field" key={key}><span>{label}</span><select value={selected} onChange={e=>setFilter(key,e.target.value?{operator:'in',values:[e.target.value]}:null)}>
      <option value="">All</option>{selected&&!choices.includes(selected)&&<option value={selected}>{selected}</option>}{choices.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
  };
  const booleanSelect=(key:string,label:string)=><label className="cx-field" key={key}><span>{label}</span><select value={filters[key]?.operator==='equals'?String(filters[key].value):''} onChange={e=>setFilter(key,e.target.value===''?null:{operator:'equals',value:e.target.value==='true'})}><option value="">All, including unknown</option><option value="true">Recorded yes</option><option value="false">Recorded no</option></select></label>;
  return <section className="cx-filter-panel" aria-label="Legacy report filters">
    <div className="cx-filter-heading"><div><h2>Report filters</h2><p>Capture-cohort scope. Supported filters depend on the selected report.</p></div><div className="cx-inline-actions">
      <button type="button" className="cx-button-secondary" onClick={clearFilters} disabled={!Object.keys(filters).length}>Clear filters</button>
      <button type="button" className="cx-button-secondary" disabled={refreshing} onClick={refresh}><RefreshCw size={14} className={refreshing?'animate-spin':''}/>{refreshing?'Reloading…':'Reload results'}</button></div></div>
    <div className="cx-filter-grid">
      <label className="cx-field"><span>Capture date from</span><input aria-label="Capture date from" type="date" value={startDate} max={endDate||undefined} onChange={e=>{if(e.target.value)setDateRange(e.target.value,endDate);}}/></label>
      <label className="cx-field"><span>Capture date through</span><input aria-label="Capture date through" type="date" value={endDate} min={startDate||undefined} onChange={e=>{if(e.target.value)setDateRange(startDate,e.target.value);}}/></label>
      <label className="cx-field"><span>Date shortcut</span><select value={presets.find(p=>p.start===startDate&&p.end===endDate)?.id||'custom'} onChange={e=>{const p=presets.find(p=>p.id===e.target.value);if(p)setDateRange(p.start,p.end);}}><option value="custom">Custom date range</option>{presets.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      {select('vendor','Vendor',opts.vendors)}{select('source','Lead Source',opts.sources)}{select('medium','Traffic Medium',opts.mediums)}
    </div>
    <details className="cx-filter-details"><summary><SlidersHorizontal size={15}/>Validation and outcome filters</summary><div className="cx-filter-grid mt-4">
      {select('grade','Recorded Lead Grade',opts.grades)}{select('vetting','Vetting Classification',opts.vettings)}{booleanSelect('sale','Sale Recorded')}{booleanSelect('activated','Activation Recorded')}{booleanSelect('rpc','Right-Party Contact Recorded')}{booleanSelect('valid_lead','Lead Validity')}
    </div></details>
    {Object.keys(filters).length>0&&<div className="cx-filter-chips" aria-label="Applied filters">{Object.entries(filters).map(([key,value]:[string,any])=><button className="cx-filter-chip" key={key} onClick={()=>setFilter(key,null)} aria-label={`Remove ${key} filter`}><span>{key}: {value.values?.join(', ')??String(value.value??`${value.min}–${value.max}`)}</span><X size={13}/></button>)}</div>}
    <p className="cx-filter-note">Reloading may use the server cache; it does not refresh warehouse ingestion.</p>
    {(options.error||refreshError)&&<p role="alert" className="cx-inline-error">{refreshError||options.error?.message}</p>}
  </section>;
}
