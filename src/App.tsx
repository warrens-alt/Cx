import './styles/reportBrowsing.css';
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Menu, Search, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, ArrowRight, AlertCircle, Columns3 } from 'lucide-react';
import { BRAND, PAGE_TITLES } from '../contracts/naming';
import { ClientProvider, useClient } from './lib/ClientContext';
import { FilterProvider, useFilters } from './lib/FilterContext';
import { DENSITY_KEY, safeDensity, type TableDensity } from './lib/presentation';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
const GlobalFilter = React.lazy(() => import('./components/GlobalFilter'));
import { PageSkeleton } from './components/Skeleton';
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const Vetting = React.lazy(() => import('./pages/Vetting'));
const VisualWorkspace = React.lazy(() => import('./pages/VisualWorkspace'));
const VersionedReports = React.lazy(() => import('./pages/VersionedReports'));
const Overview = React.lazy(() => import('./pages/Overview'));
const Insights = React.lazy(() => import('./pages/Insights'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Funnel = React.lazy(() => import('./pages/Funnel'));
const SpeedToLead = React.lazy(() => import('./pages/SpeedToLead'));
const CallPerformance = React.lazy(() => import('./pages/CallPerformance'));
const Cohorts = React.lazy(() => import('./pages/Cohorts'));
const SourceAnalysis = React.lazy(() => import('./pages/SourceAnalysis'));
const QualityVetting = React.lazy(() => import('./pages/QualityVetting'));
const DataQuality = React.lazy(() => import('./pages/DataQuality'));
const LeadExplorer = React.lazy(() => import('./pages/LeadExplorer'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const AdminValidation = React.lazy(() => import('./pages/AdminValidation'));
const DataCoverage = React.lazy(() => import('./pages/DataCoverage'));
const Acquisition = React.lazy(() => import('./pages/Acquisition'));
const Outcomes = React.lazy(() => import('./pages/Outcomes'));
const DataAudit = React.lazy(() => import('./pages/DataAudit'));
const RoutingIntelligence = React.lazy(() => import('./pages/RoutingIntelligence'));
const ConsumerReentry = React.lazy(() => import('./pages/ConsumerReentry'));
const DataTrust = React.lazy(() => import('./pages/DataTrust'));
const Revetting = React.lazy(() => import('./pages/Revetting'));


function Shell() {
  const location=useLocation(), { clientConfig, selectedClient, loading:clientLoading, error:clientError }=useClient();
  const { startDate, endDate, filters, filterError, resetScope } = useFilters();
  const [mobile,setMobile]=useState(false), [sidebar,setSidebar]=useState(true), [command,setCommand]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [density,setDensity]=useState<TableDensity>(()=>{try{return safeDensity(localStorage.getItem(DENSITY_KEY));}catch{return 'comfortable';}});
  const evidencePage=location.pathname==='/reports'||location.pathname==='/';
  useEffect(()=>{try{localStorage.setItem(DENSITY_KEY,density);}catch{}},[density]);
  useEffect(()=>{
    setMobile(false);
    document.getElementById('main-content')?.scrollTo({top:0});
  },[location.pathname]);
  useEffect(()=>{const listener=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setMobile(false);setCommand(old=>!old);}};
    window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);
  },[]);
  useEffect(()=>{const mq=window.matchMedia('(min-width: 1024px)');const close=()=>{if(mq.matches)setMobile(false);};mq.addEventListener('change',close);return()=>mq.removeEventListener('change',close);},[]);
  const openSearch=()=>{setMobile(false);setCommand(true);};
  return <div className="cx-app" data-density={density}>
    <a className="cx-skip" href="#main-content">Skip to report content</a>
    {sidebar && <div className="cx-desktop-sidebar"><Sidebar onSearch={openSearch}/></div>}
    <Modal open={mobile} onClose={()=>setMobile(false)} label="Navigation" className="cx-nav-modal"><Sidebar onClose={()=>setMobile(false)} onSearch={openSearch}/></Modal>
    <div className="cx-workarea">
      <header className="cx-topbar">
        <button type="button" className="cx-icon-button cx-mobile-menu" aria-label="Open navigation" onClick={()=>setMobile(true)}><Menu size={20}/></button>
        <button type="button" className="cx-icon-button cx-desktop-toggle" aria-label={sidebar?'Collapse navigation':'Expand navigation'} aria-expanded={sidebar} onClick={()=>setSidebar(old=>!old)}>{sidebar?<PanelLeftClose size={18}/>:<PanelLeftOpen size={18}/>}</button>
        <div className="cx-breadcrumb"><span>{BRAND.name}</span><span aria-hidden="true">/</span><strong>{(location.pathname==='/visuals'?'Visual Workspace':location.pathname==='/vetting'?'Vetting':PAGE_TITLES[location.pathname])||'Workspace'}</strong></div>
        <div className="cx-topbar-actions"><button type="button" className="cx-search-trigger" aria-label="Search pages" onClick={openSearch}><Search size={16}/><span>Find a page</span><kbd>⌘ K</kbd></button>
          <button type="button" className="cx-icon-button" aria-label={density==='comfortable'?'Use compact table spacing':'Use comfortable table spacing'} aria-pressed={density==='compact'} onClick={()=>setDensity(old=>old==='compact'?'comfortable':'compact')}><Columns3 size={18}/></button>
          <span className="cx-workspace-name" title={clientConfig?.name}>{clientConfig?.name||'Workspace'}</span>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="cx-main">
        {clientError && <section className="cx-scope-error" role="alert"><AlertCircle size={22}/><div><h1>Workspace access is unavailable</h1><p>{clientError}</p><p>No fallback tenant or substitute analytical data is being displayed.</p></div></section>}
        {clientLoading && <p className="cx-filter-loading" role="status">Verifying workspace access…</p>}
        {!evidencePage && <div className="cx-legacy-bar"><div role="note"><AlertCircle size={16} aria-hidden="true"/><span><strong>Legacy exploration</strong> — not independently reconciled.</span><Link to="/reports">Evidence Reports <ArrowRight size={14}/></Link></div>
          <span className="cx-scope-summary">{filterError ? 'Reporting selection needs attention' : <>Capture dates: {startDate} to {endDate} · {Object.keys(filters || {}).length} filters</>}</span>
          <button type="button" className="cx-button-secondary" aria-expanded={filtersOpen} aria-controls="legacy-filters" onClick={()=>setFiltersOpen(old=>!old)}><SlidersHorizontal size={15}/>Report filters</button>
        </div>}
        {!evidencePage && <div id="legacy-filters" hidden={!filtersOpen}>{filtersOpen && !filterError && <Suspense fallback={<p className="cx-filter-loading" role="status">Loading report controls…</p>}><GlobalFilter/></Suspense>}</div>}
        <ErrorBoundary resetKeys={[location.pathname]} fallbackRender={({resetErrorBoundary})=><section className="cx-route-error" role="alert"><AlertCircle size={28}/><h1>This page could not be displayed</h1><p>Navigation is still available. Retry the page or return to Evidence Reports.</p><div><button className="cx-button-primary" onClick={resetErrorBoundary}>Retry page</button><Link className="cx-button-secondary" to="/reports">Evidence Reports</Link></div></section>}>
          {!evidencePage && filterError ? <section className="cx-scope-error" role="alert"><AlertCircle size={22}/><div><h1>Reporting selection needs attention</h1><p>{filterError}</p><p>No analytical request was sent with an invalid selection.</p><button type="button" className="cx-button-primary" onClick={resetScope}>Reset reporting scope</button></div></section> : <Suspense fallback={<PageSkeleton/>}>
            <Routes>
              <Route path="/" element={<Navigate to="/reports" replace />} />
              <Route path="/reports" element={<VersionedReports key={selectedClient} />} />
              <Route path="/vetting" element={<Vetting key={selectedClient} />} />
              <Route path="/visuals" element={<VisualWorkspace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/routing" element={<RoutingIntelligence />} />
              <Route path="/consumers" element={<ConsumerReentry />} />
              <Route path="/acquisition" element={<Acquisition />} />
              <Route path="/lead-performance" element={<Funnel />} />
              <Route path="/speed-to-lead" element={<SpeedToLead />} />
              <Route path="/call-performance" element={<CallPerformance />} />
              <Route path="/cohorts" element={<Cohorts />} />
              <Route path="/outcomes" element={<Outcomes />} />
              <Route path="/sources" element={<SourceAnalysis />} />
              <Route path="/quality" element={<QualityVetting />} />
              <Route path="/revetting" element={<Revetting />} />
              <Route path="/data-trust" element={<DataTrust />} />
              <Route path="/data-quality" element={<DataQuality />} />
              <Route path="/data-coverage" element={<DataCoverage />} />
              <Route path="/audit" element={<DataAudit />} />
              <Route path="/explorer" element={<LeadExplorer />} />
              <Route path="/admin" element={<SettingsPage />} />
              <Route path="/validation" element={<AdminValidation />} />
              <Route path="*" element={<section className="cx-route-error"><h1>Page not found</h1><p>The requested workspace page does not exist.</p><Link className="cx-button-primary" to="/reports">Open Evidence Reports</Link></section>}/>
            </Routes>
          </Suspense>}
        </ErrorBoundary>
      </main>
    </div>
    {command && <Suspense fallback={<Modal open label="Loading search" onClose={()=>setCommand(false)}><div className="p-6"><p role="status">Loading navigation…</p><button className="cx-button-secondary mt-4" onClick={()=>setCommand(false)}>Close</button></div></Modal>}><CommandPalette isOpen onClose={()=>setCommand(false)}/></Suspense>}
  </div>;
}
export default function App(){return <BrowserRouter><ClientProvider><FilterProvider><Shell/></FilterProvider></ClientProvider></BrowserRouter>;}
