from pathlib import Path
import re
R=Path.cwd()
def write(name,content):
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
def edit(name,old,new,count=-1):
 p=R/name;s=p.read_text()
 if old not in s:raise ValueError(name+': missing '+old[:60])
 p.write_text(s.replace(old,new,count))

write('src/components/GlobalFilter.tsx', '''import React, { useState } from 'react';
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
''')
# Native modal handles focus for all entry points; current group can still be collapsed by choice.
edit('src/components/Sidebar.tsx','const expanded=!!q || isActiveGroup || !collapsed[group.title];','const expanded=!!q || !collapsed[group.title];')

# Shared visual system: retain navy/teal brand, improve contrast, rhythm and responsive boundaries.
p=R/'src/index.css';s=p.read_text()
s=s.replace('  .enterprise-table th {','  .enterprise-table thead th {')
s=s.replace('@apply px-4 py-3 bg-slate-50/80 text-text-sec font-semibold border-b border-border-strong uppercase tracking-wider text-[11px] sticky top-0 backdrop-blur-xs;', '@apply px-4 py-3 bg-slate-50 text-text-sec font-semibold border-b border-border-subtle text-xs sticky top-0;')
s=s.replace('  .enterprise-table td {','  .enterprise-table td, .enterprise-table tbody th {')
s=s.replace('    letter-spacing: -0.011em;','    letter-spacing: -0.011em;\n    font-variant-numeric: tabular-nums;\n    font-size: 14px;')
s=s.replace('@apply text-xs font-semibold text-text-sec uppercase tracking-wider leading-normal;', '@apply text-sm font-semibold text-text-sec leading-normal;')
s += '''
/* Workspace refinement. Values and scope are never abbreviated or altered by presentation. */
:root { --cx-radius: 14px; --cx-shadow: 0 2px 8px rgb(15 30 46 / .035); }
html,body,#root { min-height:100%; margin:0; }
button,input,select,textarea { font:inherit; }
button,a,input,select,textarea,summary { -webkit-tap-highlight-color:transparent; }
button,summary { cursor:pointer; }
button:disabled { cursor:not-allowed; opacity:.5; }
:where(button,a,input,select,textarea,summary,[tabindex]):focus-visible { outline:3px solid #0d9488; outline-offset:3px; }
input,select,textarea { accent-color:#0f766e; }
button svg, a svg { flex-shrink:0; }
.cx-app { display:flex; height:100vh; height:100dvh; overflow:hidden; background:#f6f8fb; }
.cx-workarea { min-width:0; flex:1; display:flex; flex-direction:column; }
.cx-main { min-height:0; min-width:0; flex:1; overflow:auto; overscroll-behavior:contain; }
.cx-main:focus { outline:none; }
.cx-skip { position:fixed; top:10px; left:14px; z-index:100; transform:translateY(-150%); border-radius:8px; background:#fff; padding:12px 18px; color:#0f172a; }
.cx-skip:focus { transform:none; }
.cx-desktop-sidebar { display:none; flex-shrink:0; }
.cx-sidebar { width:264px; max-width:100%; height:100%; display:flex; flex-direction:column; color:#e2e8f0; background:#0f1e2e; border-right:1px solid #203347; }
.cx-brand { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:22px 18px; }
.cx-brand-link { display:flex; align-items:center; gap:10px; min-width:0; color:#fff; text-decoration:none; }
.cx-brand-icon { height:36px; width:36px; display:grid; place-items:center; background:#0f766e; border:1px solid #259a8c; border-radius:11px; flex-shrink:0; }
.cx-brand strong { display:block; font-family:var(--font-display); font-size:17px; letter-spacing:-.045em; }
.cx-brand small { display:block; font-size:10px; margin-top:3px; color:#a9bacd; }
.cx-nav-search { margin:0 14px 12px; border:1px solid #33465a; border-radius:9px; display:flex; align-items:center; padding:0 10px; gap:9px; background:#0a1623; color:#b4c4d5; }
.cx-nav-search input { width:100%; min-width:0; height:38px; background:transparent; border:0; font-size:12px; outline:none; color:#fff; }
.cx-nav-search:focus-within { outline:2px solid #2dd4bf; outline-offset:2px; }
.cx-nav-search input::placeholder { color:#9aadc3; }
.cx-nav-search button { display:flex; padding:5px; }
.cx-navigation { min-height:0; flex:1; overflow-y:auto; padding:0 10px 20px; }
.cx-navigation section+section { margin-top:16px; }
.cx-nav-group { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; padding:8px 12px; color:#9baec2; font-size:10px; letter-spacing:.09em; font-weight:600; text-align:left; }
.cx-nav-group svg { transition:transform .16s; }
.cx-nav-link { position:relative; min-height:39px; display:flex; align-items:center; gap:10px; padding:9px 12px; margin:2px 0; border-radius:8px; font-size:12px; line-height:1.5; color:#bbc9d8; text-decoration:none; transition:background .15s,color .15s; }
.cx-nav-link span { min-width:0; }
.cx-nav-link:hover { background:#1b2f42; color:#fff; }
.cx-nav-link[aria-current=page] { background:#163c42; color:#e8fffa; box-shadow:inset 0 0 0 1px #286268; }
.cx-nav-link[aria-current=page] svg { color:#5eead4; }
.cx-nav-indicator { width:5px; height:5px; border-radius:100%; background:#5eead4; margin-left:auto; flex-shrink:0; }
.cx-nav-empty { padding:16px; color:#cbd5e1; font-size:13px; }
.cx-sidebar-footer { padding:12px 14px 16px; border-top:1px solid #283b4d; }
.cx-nav-command { display:flex; gap:9px; align-items:center; width:100%; padding:9px 4px; font-size:12px; color:#becddd; }
.cx-nav-command kbd { margin-left:auto; font-size:10px; color:#94a3b8; }
.cx-workspace { margin-top:6px; padding:11px; border:1px solid #2b4055; border-radius:9px; display:flex; align-items:center; gap:9px; background:#152638; }
.cx-workspace>span { min-width:0; flex:1; }
.cx-workspace strong { display:block; font-size:11px; color:#e2e8f0; }
.cx-workspace small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; color:#9cafc2; margin-top:3px; }
.cx-workspace a { padding:6px; }
.cx-sidebar-footer>p { font-size:10px; color:#9cafc2; margin:10px 0 0; }
.cx-topbar { flex-shrink:0; height:64px; display:flex; align-items:center; gap:12px; padding:0 22px; background:#fff; border-bottom:1px solid #e2e8f0; }
.cx-breadcrumb { display:flex; align-items:center; gap:12px; font-size:12px; min-width:0; color:#64748b; }
.cx-breadcrumb strong { color:#334155; font-weight:500; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
.cx-topbar-actions { display:flex; gap:10px; align-items:center; margin-left:auto; flex-shrink:0; }
.cx-icon-button { width:38px; height:38px; align-items:center; justify-content:center; border:1px solid transparent; border-radius:8px; color:#475569; }
.cx-icon-button:not(.hidden) { display:inline-flex; }
.cx-icon-button:hover,.cx-icon-button[aria-pressed=true] { background:#eff7f6; border-color:#cce5e1; color:#0f766e; }
.cx-nav-icon { min-height:40px; min-width:40px; display:grid; place-items:center; }
.cx-search-trigger { display:flex; align-items:center; gap:9px; min-height:36px; border:1px solid #e2e8f0; border-radius:8px; color:#64748b; padding:0 10px; font-size:12px; }
.cx-search-trigger kbd { font-family:var(--font-sans); font-size:10px; background:#f1f5f9; padding:2px 5px; border-radius:4px; }
.cx-workspace-name { max-width:150px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; font-size:11px; border-left:1px solid #e2e8f0; padding-left:12px; color:#64748b; }
.cx-page { width:100%; min-width:0; padding:32px clamp(18px,3vw,42px) 60px; max-width:1680px; margin:0 auto; }
.cx-page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:26px; }
.cx-page-header>div { min-width:0; }
.cx-page-header h1 { font-size:clamp(24px,2.1vw,30px); font-weight:700; letter-spacing:-.05em; line-height:1.25; }
.cx-page-header p { color:#526377; font-size:13px; line-height:1.75; max-width:800px; margin-top:9px; }
.cx-page-actions,.cx-inline-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.cx-button-primary,.cx-button-secondary { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:9px 15px; border-radius:8px; font-size:12px; font-weight:600; line-height:1.45; text-align:center; text-decoration:none; transition:background .15s; }
.cx-button-primary { background:#0f766e; color:#fff; border:1px solid #0f766e; box-shadow:0 1px 2px #0f766e22; }
.cx-button-primary:hover:not(:disabled) { background:#115e59; }
.cx-button-secondary { background:#fff; color:#334155; border:1px solid #cbd5e1; }
.cx-button-secondary:hover:not(:disabled) { background:#f1f5f9; }
.cx-link-button { display:inline-flex; gap:6px; align-items:center; min-height:34px; color:#0f766e; font-size:12px; font-weight:600; text-decoration:none; }
.cx-link-button:hover { text-decoration:underline; }
.cx-field { display:block; min-width:0; color:#475569; font-size:12px; }
.cx-field>span { display:block; margin-bottom:7px; font-weight:600; }
.cx-field input:not([type=checkbox]),.cx-field select { display:block; box-sizing:border-box; width:100%; min-width:0; height:41px; padding:9px 11px; border:1px solid #cbd5e1; background:#fff; border-radius:8px; color:#172b40; font-size:13px; line-height:1.4; }
.cx-field input::placeholder { color:#7c8999; }
.cx-field small { display:block; line-height:1.5; margin-top:5px; color:#64748b; }
.cx-legacy-bar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:12px clamp(18px,3vw,42px); border-bottom:1px solid #e8e5d7; background:#fffcf4; }
.cx-legacy-bar>div { display:flex; align-items:center; flex-wrap:wrap; gap:8px; color:#78531d; font-size:11px; }
.cx-legacy-bar a { display:inline-flex; gap:4px; align-items:center; color:#77501c; text-decoration:underline; }
.cx-legacy-bar .cx-button-secondary { background:transparent; border-color:#dfd2b7; font-size:11px; min-height:32px; padding:5px 9px; }
.cx-filter-panel { background:#fff; padding:22px clamp(18px,3vw,42px); border-bottom:1px solid #dbe3ec; }
.cx-filter-heading { display:flex; align-items:start; justify-content:space-between; gap:16px; margin-bottom:18px; }
.cx-filter-heading h2 { font-size:14px; font-weight:600; }
.cx-filter-heading p,.cx-filter-note { font-size:11px; color:#64748b; margin-top:5px; line-height:1.6; }
.cx-filter-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.cx-filter-details { margin:18px 0 14px; }
.cx-filter-details summary { display:flex; align-items:center; gap:8px; font-size:12px; color:#475569; }
.cx-filter-chips { display:flex; flex-wrap:wrap; gap:6px; }
.cx-filter-chip { display:flex; align-items:center; gap:7px; max-width:100%; padding:6px 9px; border-radius:6px; border:1px solid #cce5e1; background:#f0fdfa; color:#115e59; font-size:11px; }
.cx-filter-chip span { overflow-wrap:anywhere; }
.cx-inline-error { color:#9f1239; font-size:13px; margin-top:12px; }
.enterprise-card { min-width:0; border-radius:var(--cx-radius); box-shadow:var(--cx-shadow); }
.enterprise-card:fullscreen { padding:28px; overflow:auto; background:#fff; }
.enterprise-table { font-variant-numeric:tabular-nums; }
.enterprise-table thead th { z-index:1; line-height:1.5; min-width:105px; }
.enterprise-table tbody th { position:static; background:transparent; font-weight:500; text-transform:none; letter-spacing:normal; }
.enterprise-table tbody tr:last-child td,.enterprise-table tbody tr:last-child th { border-bottom:0; }
.enterprise-table tbody tr:hover { background:#f4f9f8; }
[data-density=compact] .enterprise-table td,[data-density=compact] .enterprise-table tbody th { padding-top:8px; padding-bottom:8px; font-size:12px; }
.cx-chart-toolbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
.cx-chart-toolbar>div:first-child { flex:1; min-width:160px; }
.cx-chart-toolbar h3 { font-size:14px; font-weight:600; letter-spacing:-.02em; }
.cx-chart-toolbar p { font-size:12px; color:#64748b; line-height:1.7; margin-top:5px; max-width:600px; }
.cx-kpi { position:relative; padding:20px; display:flex; flex-direction:column; height:100%; }
.cx-kpi-heading { display:flex; align-items:flex-start; gap:9px; justify-content:space-between; }
.cx-kpi-heading h3 { font-size:12px; font-weight:600; color:#475569; line-height:1.6; overflow-wrap:anywhere; }
.cx-kpi-tools { display:flex; flex-shrink:0; }
.cx-kpi-tools button { width:28px; height:28px; display:grid; place-items:center; border-radius:6px; color:#64748b; }
.cx-kpi-tools button:hover { background:#f0fdfa; color:#0f766e; }
.cx-kpi-amount { display:flex; flex-wrap:wrap; gap:6px; align-items:baseline; margin:12px 0 6px; }
.cx-kpi-amount strong { font-family:var(--font-display); font-size:clamp(24px,2.5vw,32px); line-height:1.25; letter-spacing:-.05em; overflow-wrap:anywhere; }
.cx-kpi-amount small { color:#64748b; font-size:12px; }
.cx-kpi-note { font-size:11px; line-height:1.7; color:#64748b; margin-top:auto; padding-top:10px; }
.cx-kpi-footer { display:flex; gap:12px; justify-content:space-between; margin-top:14px; padding-top:10px; border-top:1px solid #eef2f6; }
.cx-modal { border:1px solid #dce5ec; border-radius:16px; padding:0; box-shadow:0 24px 80px #07132140; background:#fff; color:#0f172a; max-height:calc(100dvh - 40px); max-width:calc(100vw - 32px); margin:8vh auto auto; }
.cx-modal::backdrop { background:rgb(10 21 32 / .6); backdrop-filter:blur(3px); }
.cx-nav-modal { margin:0; height:100dvh; max-height:100dvh; width:290px; max-width:calc(100vw - 36px); border:0; border-radius:0; background:#0f1e2e; }
.cx-nav-modal .cx-sidebar { width:100%; }
.cx-command-modal { width:620px; }
.cx-command-input { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid #e2e8f0; }
.cx-command-input input { min-width:0; flex:1; padding:7px 0; background:transparent; border:0; outline:none; font-size:15px; }
.cx-command-results { max-height:min(460px,60dvh); overflow:auto; padding:8px; }
.cx-command-option { display:flex; align-items:center; gap:12px; cursor:pointer; padding:12px; border-radius:9px; }
.cx-command-option[aria-selected=true] { background:#edf8f6; color:#0f766e; }
.cx-command-option>span { min-width:0; flex:1; }
.cx-command-option strong { display:block; font-size:13px; font-weight:600; line-height:1.5; }
.cx-command-option small { display:block; font-size:11px; margin-top:2px; color:#64748b; text-transform:capitalize; }
.cx-command-footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:12px 18px; border-top:1px solid #e2e8f0; background:#f8fafc; color:#64748b; font-size:10px; }
.cx-route-error { max-width:640px; padding:48px 24px; margin:40px auto; }
.cx-route-error h1 { font-size:24px; font-weight:700; margin-top:16px; }
.cx-route-error p { font-size:14px; line-height:1.7; color:#64748b; margin:12px 0 20px; }
.cx-route-error>div { display:flex; gap:10px; flex-wrap:wrap; }
@media(min-width:1024px) { .cx-desktop-sidebar{display:block;} }
@media(max-width:767px) {
  .cx-topbar { height:58px; padding:0 12px; gap:6px; }
  .cx-topbar-actions { gap:4px; }
  .cx-breadcrumb { font-size:12px; }
  .cx-breadcrumb>span,.cx-workspace-name,.cx-search-trigger span,.cx-search-trigger kbd { display:none; }
  .cx-search-trigger { width:38px; height:38px; padding:0; justify-content:center; border:0; }
  .cx-page { padding:22px 16px 40px; }
  .cx-page-header { flex-direction:column; gap:14px; margin-bottom:22px; }
  .cx-page-header p { font-size:13px; }
  .cx-filter-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .cx-filter-heading { flex-direction:column; }
  .cx-nav-link { min-height:44px; font-size:13px; }
  .cx-field input:not([type=checkbox]),.cx-field select { font-size:16px; min-height:44px; }
  .cx-button-primary,.cx-button-secondary { min-height:44px; }
  .cx-kpi-tools button { width:36px; height:36px; }
  .enterprise-table th,.enterprise-table td { padding-left:12px; padding-right:12px; }
  .cx-legacy-bar { padding:12px 16px; }
}
@media(max-width:390px) { .cx-filter-grid{grid-template-columns:1fr;} }
@media(prefers-reduced-motion:reduce) {
  *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; }
}
@media print { .cx-topbar,.cx-desktop-sidebar,.cx-filter-panel,.cx-legacy-bar {display:none!important;} .cx-app,.cx-main{height:auto;overflow:visible;} .enterprise-card{break-inside:avoid;box-shadow:none;} }
'''
p.write_text(s)
