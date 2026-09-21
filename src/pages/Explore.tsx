import React, { Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Compass, Play, RotateCcw, Link2, ArrowRight, Layers3, ShieldAlert } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { ChartSkeleton } from '../components/Skeleton';
import { useClient } from '../lib/ClientContext';
import { useFilters } from '../lib/FilterContext';
import { METRICS, DIMENSIONS, DEFAULT_VIEW, PRESETS, TEMPORAL, readExploreView, writeExploreView, resetExploreView, safeChart, canDonut, type ExploreView } from '../lib/explore/model';
import { useExploreData } from '../lib/explore/useExploreData';
import '../styles/explore.css';
const ExploreResults=React.lazy(()=>import('../components/explore/ExploreResults'));

export default function Explore(){
  const {startDate,endDate,filters,filterError,resetScope}=useFilters(),{selectedClient}=useClient();
  const [params,setParams]=useSearchParams(),pending=useRef(new URLSearchParams(params));
  const [message,setMessage]=useState('');
  useLayoutEffect(()=>{pending.current=new URLSearchParams(params);},[params]);
  const parsed=useMemo(()=>{try{return {view:readExploreView(params),error:null};}catch(error){return {view:DEFAULT_VIEW,error:error instanceof Error?error.message:'Invalid Explore view.'};}},[params]);
  const {view}=parsed,selectionError=filterError||parsed.error;
  const scope={clientId:selectedClient||'default_tenant',startDate,endDate,filters};
  const query=useExploreData(view,scope,selectionError);
  const metric=METRICS.find(m=>m.id===view.metric)!;
  const visual=safeChart(view,query.data?.rows);
  const update=(change:Partial<ExploreView>)=>{
    try{
      const old=readExploreView(pending.current),next={...old,...change};
      if(change.dimension===old.secondary&&!Object.hasOwn(change,'secondary'))next.secondary='';
      next.chart=safeChart(next);
      const updated=writeExploreView(pending.current,next,{startDate,endDate});pending.current=updated;setParams(updated);setMessage('');
    }catch(error){setMessage(error instanceof Error?error.message:'The view could not be changed.');}
  };
  const reset=()=>{const next=resetExploreView(params);pending.current=next;setParams(next,{replace:true});setMessage('');};
  const copy=async()=>{try{const current=writeExploreView(params,view,{startDate,endDate});const url=new URL(window.location.href);url.search=current.toString();await navigator.clipboard.writeText(url.toString());setMessage('View link copied. It restores selections, not a frozen dataset. Access permissions still apply.');}catch{setMessage('Clipboard access is unavailable. The address bar contains the current view selections.');}};
  const contextKey=JSON.stringify([scope,view.metric,view.dimension,view.secondary]);
  return <PageShell><div className="cx-explore-page">
    <header className="cx-explore-hero"><div><span className="cx-explore-kicker"><Compass size={15}/>ANALYSIS WORKSPACE</span><h1>Data Explorer</h1><p>Find the pattern. Compare the groups. Inspect the evidence.</p><div className="cx-explore-scope"><span>{startDate} → {endDate}</span><span>{Object.keys(filters).length} report filters</span><span>Lead-capture cohorts</span></div></div><button type="button" className="cx-button-secondary" onClick={copy} disabled={!!selectionError}><Link2 size={15}/>Copy view link</button></header>
    <div className="cx-explore-presets" aria-label="Analysis presets">{PRESETS.map(p=><button type="button" key={p.id} onClick={()=>update(p.view)} disabled={!!selectionError} aria-pressed={view.metric===p.view.metric&&view.dimension===p.view.dimension&&view.secondary===p.view.secondary}><span>{p.title}<ArrowRight size={14}/></span><small>{p.description}</small></button>)}</div>
    <section className="enterprise-card cx-explore-builder" aria-label="Explore query builder"><div className="cx-explore-builder-title"><Layers3 size={17}/><strong>Build your analysis</strong><span>API-backed measures · no client-side metric redefinition</span></div>
      <div className="cx-explore-builder-controls"><label>Measure<select aria-label="Measure" value={view.metric} onChange={e=>update({metric:e.target.value})} disabled={!!selectionError}>{METRICS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label>Dimension<select aria-label="Dimension" value={view.dimension} onChange={e=>update({dimension:e.target.value})} disabled={!!selectionError}>{DIMENSIONS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
        <label>Second dimension<select aria-label="Second dimension" value={view.secondary} onChange={e=>update({secondary:e.target.value})} disabled={!!selectionError}><option value="">No second dimension</option>{DIMENSIONS.filter(d=>d.id!==view.dimension).map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
        <label>Visualisation<select aria-label="Visualisation" value={visual} onChange={e=>update({chart:e.target.value as ExploreView['chart']})} disabled={!!selectionError}><option value="bar">Horizontal bars</option><option value="column">Columns</option><option value="line" disabled={!TEMPORAL.has(view.dimension)}>Line graph</option><option value="area" disabled={!TEMPORAL.has(view.dimension)}>Area graph</option><option value="donut" disabled={!canDonut(view,query.data?.rows)}>Doughnut composition</option><option value="table">Data table</option></select></label>
      </div>
      <div className="cx-explore-builder-footer"><p><strong>{metric.formula}</strong><span>{metric.definition}</span></p><div><button type="button" className="cx-button-secondary" onClick={reset}><RotateCcw size={14}/>Reset view</button><button type="button" className="cx-button-primary" onClick={query.reload} disabled={query.loading||!!selectionError}><Play size={14}/>{query.loading?'Loading…':'Run Query'}</button></div></div>
    </section>
    <div className="cx-explore-trust"><ShieldAlert size={16}/><p>Legacy exploration—not independently reconciled. Vendor filtering uses the existing model; vendor-grouped reporting belongs in the vendor reports. Recorded revenue is not verified cash collected. <Link to={{pathname:'/reports',search:params.toString()}}>Open Evidence Reports</Link>.</p></div>
    {message&&<p className="cx-explore-message" role="status">{message}</p>}
    {query.error?<section className="enterprise-card cx-explore-status" role="alert"><h2>Explore could not load this selection</h2><p>{query.error}</p><div>{filterError?<button type="button" className="cx-button-secondary" onClick={resetScope}>Reset reporting scope</button>:parsed.error?<button type="button" className="cx-button-secondary" onClick={reset}>Reset Explore view</button>:<button type="button" className="cx-button-secondary" onClick={query.reload}>Retry Explore request</button>}</div><small>No prior or substitute data is being displayed.</small></section>:query.loading?<section role="status" aria-label="Loading Explore results"><ChartSkeleton/><div className="cx-explore-loading"><span>Loading this measure and breakdown…</span><button type="button" className="cx-button-secondary" onClick={query.cancel}>Cancel request</button></div></section>:query.cancelled?<section className="enterprise-card cx-explore-status" role="status"><h2>Explore request cancelled</h2><p>The browser request stopped. An already-running warehouse job may continue. No prior result is displayed.</p><button type="button" className="cx-button-primary" onClick={query.reload}>Run Query</button></section>:query.data?<Suspense fallback={<ChartSkeleton/>}><ExploreResults key={contextKey} result={query.data} view={view} onView={update} scope={scope}/></Suspense>:null}
  </div></PageShell>;
}
