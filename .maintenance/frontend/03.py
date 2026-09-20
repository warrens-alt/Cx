from pathlib import Path
import re
R=Path.cwd()
def write(name,content):
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
def edit(name,old,new,count=-1):
 p=R/name;s=p.read_text()
 if old not in s:raise ValueError(name+': missing '+old[:60])
 p.write_text(s.replace(old,new,count))

write('src/components/KpiCard.tsx', '''import React, { Suspense, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowRight, Info, Table as TableIcon } from 'lucide-react';
import { formatKpiValue } from '../lib/formatters';
const DataAuditDrawer=React.lazy(()=>import('./DataAuditDrawer'));
const MetricLineageDrawer=React.lazy(()=>import('./MetricLineageDrawer'));
interface KpiCardProps { title:string;value:string|number|null;change?:number;changeLabel?:string;isPositiveGood?:boolean;prefix?:string;suffix?:string;loading?:boolean;subtitle?:string;lineage?:any;metadata?:any;onAnalyse?:()=>void;onWhyChanged?:()=>void; }
export default function KpiCard({title,value,change,changeLabel='vs baseline',isPositiveGood=true,prefix='',suffix='',loading=false,subtitle,lineage,metadata,onAnalyse,onWhyChanged}:KpiCardProps){
  const [drawerOpen,setDrawerOpen]=useState(false),[auditOpen,setAuditOpen]=useState(false);
  if(loading)return <div className="enterprise-card cx-kpi" role="status" aria-label={`Loading ${title}`}><div className="animate-pulse h-4 bg-slate-100 rounded mb-4"/><div className="animate-pulse h-9 bg-slate-100 rounded w-1/2"/></div>;
  const missing=value===null||value===undefined||value==='Unavailable';
  const hasChange=typeof change==='number'&&Number.isFinite(change);
  const positive=hasChange&&(change!>0?isPositiveGood:!isPositiveGood),Icon=change!>=0?ArrowUpRight:ArrowDownRight;
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
''')

write('src/components/charts/ChartToolbar.tsx', '''import React, { Suspense, useRef, useState } from 'react';
import { Maximize2, Table as TableIcon } from 'lucide-react';
const DataAuditDrawer=React.lazy(()=>import('../DataAuditDrawer'));
export function ChartToolbar({title,subtitle,children,auditTitle,auditContext,auditGrain}:{title:string;subtitle?:string;children?:React.ReactNode;auditTitle?:string;auditContext?:any;auditGrain?:string}){
  const [open,setOpen]=useState(false),[error,setError]=useState<string|null>(null);
  const root=useRef<HTMLDivElement>(null);
  const fullscreen=async()=>{setError(null);const card=root.current?.closest('.enterprise-card');try{
    if(document.fullscreenElement===card)await document.exitFullscreen();else if(card?.requestFullscreen)await card.requestFullscreen();else setError('Full-screen mode is not supported in this browser.');
  }catch{setError('Full-screen mode could not be opened.');}};
  return <div ref={root} className="cx-chart-toolbar"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}{error&&<p role="status">{error}</p>}</div>
    <div className="cx-inline-actions">{children}{auditTitle&&<button type="button" className="cx-button-secondary" onClick={()=>setOpen(true)}><TableIcon size={14}/>View Data</button>}
      <button type="button" className="cx-icon-button" aria-label={`Expand chart: ${title}`} title="Full screen" onClick={fullscreen}><Maximize2 size={16}/></button>
    </div>{open&&auditTitle&&<Suspense fallback={<p role="status">Loading records…</p>}><DataAuditDrawer isOpen onClose={()=>setOpen(false)} title={auditTitle} contextFilters={auditContext||{}} defaultGrain={auditGrain||'lead'}/></Suspense>}
  </div>;
}
''')
# Prevent SVG fill collisions when two chart instances render the same measure.
edit('src/components/charts/TrendChart.tsx',"import { useState } from 'react';","import { useId } from 'react';")
edit('src/components/charts/TrendChart.tsx','  const formatValue =','  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");\n  const formatValue =',1)
edit('src/components/charts/TrendChart.tsx','id={`color-${currentKey}`}','id={gradientId}')
edit('src/components/charts/TrendChart.tsx','url(#color-${currentKey})','url(#${gradientId})')
# Observe width changes without repainting charts on every resize event.
for f in (R/'src/components/charts').glob('*.tsx'):
 s=f.read_text().replace('<ResponsiveContainer width="100%" height="100%">','<ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>')
 f.write_text(s)

# Report structure and typography; the request, metric IDs and exact-number formatter remain intact.
p=R/'src/pages/VersionedReports.tsx';s=p.read_text()
s=s.replace("import React, { useEffect, useMemo, useState }", "import React, { useEffect, useMemo, useRef, useState }")
s="import { Database, FileCheck2, ArrowRight, Download, RefreshCw, Info, X, Check, ChevronDown } from 'lucide-react';\n"+s
s=s.replace('  const [definition, setDefinition]', '  const evidenceController = useRef<AbortController | null>(null);\n  const [definition, setDefinition]')
s=s.replace('  useEffect(() => { setEvidence(null); setEvidenceError(null); setDefinition(null); }, [submitted, matches]);', '''  useEffect(() => {
    evidenceController.current?.abort(); setBusy(false); setEvidence(null); setEvidenceError(null); setDefinition(null);
    return () => evidenceController.current?.abort();
  }, [submitted, matches]);''')
s=s.replace('    const executionId = data.executionId;', '    evidenceController.current?.abort();\n    const controller = new AbortController(); evidenceController.current = controller;\n    const executionId = data.executionId;')
s=s.replace("requestJson('/evidence',undefined,", "requestJson('/evidence',controller.signal,")
s=s.replace('setEvidence(result); }', 'if (!controller.signal.aborted) setEvidence(result); }')
s=s.replace("catch(e) { setEvidenceError(e instanceof Error ? e.message : 'Evidence request failed'); }", "catch(e) { if (!controller.signal.aborted) setEvidenceError(e instanceof Error ? e.message : 'Evidence request failed'); }")
s=s.replace('finally { setBusy(false); }','finally { if (!controller.signal.aborted) setBusy(false); }')
s=s.replace('<div className="max-w-[1500px] mx-auto p-4 sm:p-8 space-y-6">','<div className="cx-page cx-report">')
a=s.index('    <header>');b=s.index('    {catalogue.isLoading',a)
s=s[:a]+'''    <header className="cx-page-header"><div><h1 className="text-page-title">{PAGE_TITLES['/reports']}</h1><p>Build a report from a fixed data release. Every metric keeps its definition, exact value and supporting records.</p></div><a className="cx-button-secondary" href="#report-scope"><FileCheck2 size={16}/>Configure report</a></header>
'''+s[b:]
s=s.replace('className="enterprise-card p-5" role="status"','className="cx-report-empty" role="status"')
s=s.replace('<h2 className="font-semibold">No approved release available</h2>','<Database className="cx-empty-icon" size={28} aria-hidden="true"/><h2>No approved release available</h2>')
s=s.replace('<div className="enterprise-card p-4 text-sm"><strong>Available release:', '<div className="cx-release-strip"><Database size={19} aria-hidden="true"/><div><strong>Available release:')
s=s.replace('{catalogue.data.release.sourceBatchIds.length} retained source batches.</p></div>', '{catalogue.data.release.sourceBatchIds.length} retained source batches.</p></div><span className="cx-release-label">Fixed source snapshots</span></div>')
s=s.replace('<form className="enterprise-card p-5 space-y-4"','<form id="report-scope" className="enterprise-card cx-report-form"')
s=s.replace('<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">', '<div className="cx-report-form-heading"><div><h2>Reporting scope</h2><p>Choose the population and observation window. Dates below are explicitly UTC.</p></div><span className="cx-status">{metrics.length} metrics selected</span></div>\n      <div className="cx-report-fields">',1)
s=s.replace('className="text-sm">From', 'className="cx-field">From').replace('className="text-sm">Through','className="cx-field">Through')
# Wrap input captions in spans to standardise the label rhythm without changing their accessible names.
s=re.sub(r'<label className="(?:text-sm|cx-field)">([^<]+)(<(?:input|select))',r'<label className="cx-field"><span>\1</span>\2',s)
s=s.replace('className="block border rounded p-2 w-full"','')
a=s.index('      <fieldset>');b=s.index('    </form>',a)
s=s[:a]+'''      <fieldset className="cx-metric-picker"><legend>Metrics</legend><p>Keep event counts, lead counts and commercial amounts distinct.</p><div className="cx-metric-options">{METRICS.map(m=><label key={m.id} className="cx-metric-choice" data-selected={metrics.includes(m.id)}><input type="checkbox" checked={metrics.includes(m.id)} onChange={e=>setMetrics(old=>e.target.checked?[...old,m.id]:old.filter(id=>id!==m.id))}/><span>{m.label}</span></label>)}</div></fieldset>
      <footer className="cx-report-form-footer"><p><Info size={14} aria-hidden="true"/>Source completeness is separate from calculation checks.</p><button type="submit" disabled={!catalogue.data?.available || !metrics.length || report.isFetching} className="cx-button-primary">{report.isFetching?<RefreshCw size={15} className="animate-spin"/>:<ArrowRight size={15}/>}Create snapshot-bound report</button></footer>
'''+s[b:]
s=s.replace('className="space-y-5" aria-label="Report results"','className="cx-report-results" aria-label="Report results"')
s=s.replace('<div className="enterprise-card p-4 text-sm"><p>Execution:', '<div className="cx-execution-strip"><h2>Report results</h2><p>Execution:')
s=s.replace('className="underline mr-4" onClick={()=>report.refetch()}', 'className="cx-link-button mr-4" onClick={()=>report.refetch()}')
s=s.replace('className="underline mt-2" onClick={()=>{const {token,...safe}=data;', 'className="cx-link-button mt-2" onClick={()=>{const {token,...safe}=data;')
s=s.replace('className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"','className="cx-result-grid"')
s=s.replace('className="enterprise-card p-5" data-testid=', 'className="enterprise-card cx-result-card" data-testid=')
s=s.replace('className="text-2xl font-bold mt-2 break-words" data-testid="metric-value"', 'className="cx-exact-value" data-testid="metric-value"')
s=s.replace('<p className="text-xs mt-2">Calculation: {m.calculationStatus}. Evidence: {m.completeness}.</p>','<p className="cx-result-status"><span className="cx-status" data-status={m.calculationStatus}>Calculation: {m.calculationStatus}</span><span className="cx-status" data-status={m.completeness}>Evidence: {m.completeness}</span></p>')
s=s.replace('<div className="flex gap-3 mt-3 text-xs"><button className="underline"', '<div className="cx-result-actions"><button className="cx-link-button"')
s=s.replace('className="underline disabled:opacity-40"','className="cx-link-button disabled:opacity-40"')
s=s.replace('<aside className="enterprise-card p-5" aria-label="Metric definition">','<aside className="cx-definition-panel" aria-label="Metric definition"><button type="button" className="cx-icon-button float-right" aria-label="Close metric definition" onClick={()=>setDefinition(null)}><X size={18}/></button>')
s=s.replace('<div className="enterprise-card overflow-x-auto"><table', '<div className="enterprise-card overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable report breakdown"><table')
s=s.replace('<tbody>{data.groups.map', '<tbody>{data.groups.length===0&&<tr><td colSpan={6} className="cx-empty-table">{data.request.grouping===\'none\'?\'Totals-only report. No grouped breakdown was requested.\':\'No grouped records were returned.\'}</td></tr>}{data.groups.map')
s=s.replace('<details className="enterprise-card p-5">','<details className="enterprise-card cx-report-details">')
s=s.replace('<section className="enterprise-card p-5"><h2 className="font-semibold">Evidence:', '<section className="enterprise-card cx-evidence-panel"><h2 className="font-semibold">Evidence:')
s=s.replace('className="underline my-3"', 'className="cx-link-button my-3"')
p.write_text(s)

p=R/'src/index.css';p.write_text(p.read_text()+'''
.cx-report>header { margin-bottom:24px; }
.cx-report> :not(header)+* { margin-top:22px; }
.cx-release-strip { display:flex; align-items:center; gap:12px; padding:14px 18px; background:#eef7f5; border:1px solid #d0e6e1; border-radius:10px; color:#154f4a; }
.cx-release-strip strong { font-size:12px; font-weight:600; overflow-wrap:anywhere; }
.cx-release-strip p { font-size:11px; line-height:1.6; margin-top:4px; color:#456c66; overflow-wrap:anywhere; }
.cx-release-label { flex-shrink:0; font-size:10px; font-weight:600; margin-left:auto; }
.cx-report-form { overflow:hidden; }
.cx-report-form-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:20px; }
.cx-report-form-heading h2 { font-size:16px; font-weight:650; letter-spacing:-.025em; }
.cx-report-form-heading p { font-size:12px; line-height:1.7; color:#64748b; margin-top:5px; }
.cx-report-form-heading,.cx-report-fields,.cx-metric-picker { margin-left:24px; margin-right:24px; }
.cx-report-form-heading { margin-top:24px; }
.cx-report-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:17px 20px; }
.cx-metric-picker { margin-top:24px; padding-top:18px; border-top:1px solid #e9eef3; }
.cx-metric-picker legend { padding-top:18px; font-size:13px; font-weight:600; }
.cx-metric-picker>p { font-size:11px; color:#64748b; margin-bottom:14px; }
.cx-metric-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px 14px; }
.cx-metric-choice { min-height:38px; display:flex; gap:9px; align-items:center; padding:7px 9px; border:1px solid transparent; border-radius:7px; color:#526377; font-size:12px; line-height:1.5; cursor:pointer; }
.cx-metric-choice[data-selected=true] { background:#f0f8f6; border-color:#dcece7; color:#184f46; }
.cx-metric-choice input { width:15px; height:15px; flex-shrink:0; }
.cx-report-form-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 24px; margin-top:24px; border-top:1px solid #e2e8f0; background:#fafcfd; }
.cx-report-form-footer p { display:flex; gap:7px; align-items:center; font-size:11px; color:#64748b; line-height:1.6; }
.cx-report-empty { padding:28px; border:1px dashed #cbd5e1; border-radius:14px; background:#fff; }
.cx-report-empty h2 { font-size:17px; font-weight:650; margin:14px 0 10px; }
.cx-report-empty p { max-width:780px; font-size:13px; line-height:1.8; color:#64748b; }
.cx-empty-icon { color:#64748b; }
.cx-execution-strip { padding:6px 0 8px; }
.cx-execution-strip h2 { font-size:19px; font-weight:650; margin-bottom:10px; }
.cx-execution-strip p { font-size:11px; line-height:1.8; color:#64748b; overflow-wrap:anywhere; }
.cx-report-results { display:flex; flex-direction:column; gap:22px; }
.cx-result-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.cx-result-card { padding:21px; display:flex; flex-direction:column; }
.cx-result-card h2 { color:#475569; font-size:12px; font-weight:600; line-height:1.6; }
.cx-exact-value { font-family:var(--font-display); font-size:clamp(22px,2.5vw,30px); font-weight:700; line-height:1.35; letter-spacing:-.045em; margin:12px 0 10px; overflow-wrap:anywhere; }
.cx-status { display:inline-flex; width:fit-content; max-width:100%; font-size:10px; line-height:1.5; padding:4px 7px; border:1px solid #e2e8f0; border-radius:5px; color:#526377; background:#f8fafc; overflow-wrap:anywhere; }
.cx-status[data-status=PARTIAL],.cx-status[data-status=UNAVAILABLE] { background:#fff9ed; border-color:#f0dfbf; color:#80591f; }
.cx-result-status { display:flex; gap:5px; flex-wrap:wrap; }
.cx-result-actions { display:flex; align-items:center; gap:18px; margin-top:auto; padding-top:13px; }
.cx-definition-panel { background:#f0f7f6; border:1px solid #cce5df; border-radius:12px; padding:22px; font-size:13px; line-height:1.8; color:#234d46; }
.cx-definition-panel h2 { font-size:16px; margin-bottom:8px; }
.cx-empty-table { text-align:center; color:#64748b!important; padding:28px!important; }
.cx-report-details { padding:18px 22px; }
.cx-report-details summary { font-size:12px; font-weight:600; color:#475569; min-height:24px; }
.cx-report-details pre,.cx-evidence-panel pre { background:#f5f8fa; border:1px solid #e2e8f0; border-radius:8px; padding:15px; max-height:360px; overflow:auto; color:#475569; line-height:1.8; }
.cx-evidence-panel { padding:22px; }
.cx-evidence-panel>p { font-size:12px; color:#64748b; margin-top:8px; }
@media(min-width:1600px) { .cx-result-grid {grid-template-columns:repeat(4,minmax(0,1fr));} }
@media(max-width:1100px) { .cx-result-grid {grid-template-columns:repeat(2,minmax(0,1fr));} }
@media(max-width:767px) {
  .cx-report-fields,.cx-metric-options {grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 12px;}
  .cx-report-form-heading,.cx-report-fields,.cx-metric-picker {margin-left:16px;margin-right:16px;}
  .cx-report-form-heading {margin-top:18px;}
  .cx-release-label {display:none;}
  .cx-release-strip {padding:13px 15px;}
  .cx-report-form-footer {padding:16px;flex-direction:column;align-items:stretch;gap:12px;}
  .cx-report-form-footer .cx-button-primary {width:100%;}
  .cx-metric-choice {min-height:44px;font-size:12px;padding:7px 6px;}
  .cx-metric-options {gap:6px;}
  .cx-result-card {padding:18px;}
  .cx-result-actions {gap:14px;}
  .cx-report-form-heading>.cx-status {display:none;}
}
@media(max-width:479px) {
  .cx-result-grid,.cx-report-fields {grid-template-columns:1fr;}
  .cx-exact-value {font-size:30px;}
}
''')
