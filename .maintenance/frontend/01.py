from pathlib import Path
import re
R=Path.cwd()
def write(name, content):
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
def edit(name, old, new, count=-1):
 p=R/name;s=p.read_text()
 if old not in s: raise ValueError(f'Missing anchor: {name}: {old[:90]}')
 p.write_text(s.replace(old,new,count))

write('src/components/Modal.tsx', '''import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Native modal provides inert background, keyboard containment and Escape handling. */
export default function Modal({ open, onClose, label, className = '', children }:
  { open: boolean; onClose: () => void; label: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={ref} aria-label={label} className={`cx-modal ${className}`}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current();
    }}>{children}</dialog>, document.body);
}
''')

write('src/lib/presentation.ts', '''export type TableDensity = 'comfortable' | 'compact';
export const DENSITY_KEY = 'cx.presentation.density.v1';
export function safeDensity(value: unknown): TableDensity { return value === 'compact' ? 'compact' : 'comfortable'; }
export function isCurrentPage(pathname: string, path: string): boolean { return pathname === path || pathname.startsWith(path + '/'); }
/** Preserve legacy report filters when moving between legacy pages; evidence scope remains separate. */
export function navigationTarget(path: string, currentPath: string, search: string) {
  return { pathname: path, search: path === '/reports' || currentPath === '/reports' ? '' : search };
}
export function utcDatePresets(now = new Date()) {
  const end = now.toISOString().slice(0,10);
  const previousMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return [
    { id:'last7', label:'Last 7 days (UTC)', start:new Date(Date.parse(end)-6*86400000).toISOString().slice(0,10), end },
    { id:'last30', label:'Last 30 days (UTC)', start:new Date(Date.parse(end)-29*86400000).toISOString().slice(0,10), end },
    { id:'month', label:'This month to date (UTC)', start:end.slice(0,7)+'-01', end },
    { id:'previous', label:'Previous calendar month (UTC)', start:previousMonthEnd.toISOString().slice(0,7)+'-01', end:previousMonthEnd.toISOString().slice(0,10) },
  ];
}
''')

# Keep every existing navigation label and route; move static configuration out of the render path.
p=R/'src/App.tsx';s=p.read_text()
a=s.index('  const navGroups = [');b=s.index('\n\n  // Filter items',a)
groups=s[a:b].replace('  const navGroups =','export const NAV_GROUPS =',1)
write('src/lib/navigation.ts', "import { PAGE_TITLES } from '../../contracts/naming';\nimport { LayoutDashboard, Megaphone, Activity, Phone, Banknote, Share2, CheckCircle2, ShieldCheck, ShieldAlert, Search, Settings as SettingsIcon, GitBranch, Repeat, Award, Sparkles, Compass } from 'lucide-react';\n"+groups+'\n')

write('src/components/Sidebar.tsx', '''import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Search, X, ChevronDown, Settings, Layers, ArrowUpRight } from 'lucide-react';
import { BRAND } from '../../contracts/naming';
import { NAV_GROUPS } from '../lib/navigation';
import { isCurrentPage, navigationTarget } from '../lib/presentation';
import { useClient } from '../lib/ClientContext';
export default function Sidebar({ onClose, onSearch }: { onClose?: () => void; onSearch: () => void }) {
  const location = useLocation(), { clientConfig } = useClient();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  const groups = NAV_GROUPS.map(group => ({ ...group, items: group.items.filter(item => !q || (item.name+' '+group.title).toLowerCase().includes(q)) })).filter(group=>group.items.length);
  return <aside className="cx-sidebar">
    <div className="cx-brand"><Link to="/reports" onClick={onClose} aria-label={`${BRAND.name} home`} className="cx-brand-link">
      <span className="cx-brand-icon"><Activity size={20} aria-hidden="true"/></span><span><strong>{BRAND.name}</strong><small>{BRAND.description}</small></span></Link>
      {onClose && <button type="button" className="cx-nav-icon" aria-label="Close navigation" onClick={onClose}><X size={20}/></button>}
    </div>
    <div className="cx-nav-search"><Search size={16} aria-hidden="true"/><input aria-label="Filter navigation" placeholder="Find a page…" value={query} onChange={e=>setQuery(e.target.value)}/>{query && <button type="button" aria-label="Clear navigation search" onClick={()=>setQuery('')}><X size={16}/></button>}</div>
    <nav aria-label="Main navigation" className="cx-navigation">
      {!groups.length && <p className="cx-nav-empty" role="status">No pages match “{query}”.</p>}
      {groups.map(group=>{
        const id='nav-'+group.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
        const isActiveGroup=group.items.some(item=>isCurrentPage(location.pathname,item.path));
        const expanded=!!q || isActiveGroup || !collapsed[group.title];
        return <section key={group.title}><button type="button" aria-expanded={expanded} aria-controls={id} className="cx-nav-group" onClick={()=>setCollapsed(old=>({...old,[group.title]:!old[group.title]}))}>
          <span>{group.title}</span><ChevronDown size={14} className={expanded?'':'-rotate-90'} aria-hidden="true"/></button>
          <ul id={id} hidden={!expanded}>{group.items.map(item=>{const Icon=item.icon; const active=isCurrentPage(location.pathname,item.path);
            return <li key={item.path}><Link to={navigationTarget(item.path,location.pathname,location.search)} aria-current={active?'page':undefined} onClick={onClose} className="cx-nav-link">
              <Icon size={17} aria-hidden="true"/><span>{item.name}</span>{active && <span className="cx-nav-indicator" aria-hidden="true"/>}</Link></li>;
          })}</ul></section>;
      })}
    </nav>
    <div className="cx-sidebar-footer"><button type="button" onClick={onSearch} className="cx-nav-command"><Search size={16}/><span>Quick navigation</span><kbd>⌘ K</kbd></button>
      <div className="cx-workspace"><Layers size={18} aria-hidden="true"/><span><strong>Analyst Workspace</strong><small>{clientConfig?.name || 'No workspace selected'}</small></span>
        <Link to="/admin" aria-label="Open configuration" onClick={onClose}><Settings size={17}/></Link></div>
      <p>Evidence status is shown in each report.</p>
    </div>
  </aside>;
}
''')

# Retain lazy modules and routes verbatim; replace only the application chrome.
s=(R/'src/App.tsx').read_text()
lazy=s[s.index('const VersionedReports'):s.index("import { FilterProvider }")]
routes=s[s.index('                  <Routes>'):s.index('                  </Routes>')+len('                  </Routes>')]
write('src/App.tsx', '''import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Menu, Search, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, ArrowRight, AlertCircle, Columns3 } from 'lucide-react';
import { BRAND, PAGE_TITLES } from '../contracts/naming';
import { ClientProvider, useClient } from './lib/ClientContext';
import { FilterProvider } from './lib/FilterContext';
import { DENSITY_KEY, safeDensity, type TableDensity } from './lib/presentation';
import Sidebar from './components/Sidebar';
import Modal from './components/Modal';
import GlobalFilter from './components/GlobalFilter';
import { PageSkeleton } from './components/Skeleton';
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
''' + lazy + '''
function Shell() {
  const location=useLocation(), { clientConfig }=useClient();
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
        <button type="button" className="cx-icon-button lg:hidden" aria-label="Open navigation" onClick={()=>setMobile(true)}><Menu size={20}/></button>
        <button type="button" className="cx-icon-button hidden lg:inline-flex" aria-label={sidebar?'Collapse navigation':'Expand navigation'} aria-expanded={sidebar} onClick={()=>setSidebar(old=>!old)}>{sidebar?<PanelLeftClose size={18}/>:<PanelLeftOpen size={18}/>}</button>
        <div className="cx-breadcrumb"><span>{BRAND.name}</span><span aria-hidden="true">/</span><strong>{PAGE_TITLES[location.pathname]||'Workspace'}</strong></div>
        <div className="cx-topbar-actions"><button type="button" className="cx-search-trigger" aria-label="Search pages" onClick={openSearch}><Search size={16}/><span>Find a page</span><kbd>⌘ K</kbd></button>
          <button type="button" className="cx-icon-button" aria-label={density==='comfortable'?'Use compact table spacing':'Use comfortable table spacing'} aria-pressed={density==='compact'} onClick={()=>setDensity(old=>old==='compact'?'comfortable':'compact')}><Columns3 size={18}/></button>
          <span className="cx-workspace-name" title={clientConfig?.name}>{clientConfig?.name||'Workspace'}</span>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="cx-main">
        {!evidencePage && <div className="cx-legacy-bar"><div role="note"><AlertCircle size={16} aria-hidden="true"/><span><strong>Legacy exploration</strong> — not independently reconciled.</span><Link to="/reports">Evidence Reports <ArrowRight size={14}/></Link></div>
          <button type="button" className="cx-button-secondary" aria-expanded={filtersOpen} aria-controls="legacy-filters" onClick={()=>setFiltersOpen(old=>!old)}><SlidersHorizontal size={15}/>Report filters</button>
        </div>}
        {!evidencePage && <div id="legacy-filters" hidden={!filtersOpen}><GlobalFilter/></div>}
        <ErrorBoundary resetKeys={[location.pathname]} fallbackRender={({resetErrorBoundary})=><section className="cx-route-error" role="alert"><AlertCircle size={28}/><h1>This page could not be displayed</h1><p>Navigation is still available. Retry the page or return to Evidence Reports.</p><div><button className="cx-button-primary" onClick={resetErrorBoundary}>Retry page</button><Link className="cx-button-secondary" to="/reports">Evidence Reports</Link></div></section>}>
          <Suspense fallback={<PageSkeleton/>}>
''' + routes.replace('                  ','            ') + '''
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
    {command && <Suspense fallback={<Modal open label="Loading search" onClose={()=>setCommand(false)}><div className="p-6"><p role="status">Loading navigation…</p><button className="cx-button-secondary mt-4" onClick={()=>setCommand(false)}>Close</button></div></Modal>}><CommandPalette isOpen onClose={()=>setCommand(false)}/></Suspense>}
  </div>;
}
export default function App(){return <BrowserRouter><ClientProvider><FilterProvider><Shell/></FilterProvider></ClientProvider></BrowserRouter>;}
''')
edit('src/App.tsx','            </Routes>', '''              <Route path="*" element={<section className="cx-route-error"><h1>Page not found</h1><p>The requested workspace page does not exist.</p><Link className="cx-button-primary" to="/reports">Open Evidence Reports</Link></section>}/>
            </Routes>''')

write('src/components/CommandPalette.tsx', '''import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { PAGE_TITLES } from '../../contracts/naming';
import { NAV_GROUPS } from '../lib/navigation';
import { navigationTarget } from '../lib/presentation';
import Modal from './Modal';
const PAGES=NAV_GROUPS.flatMap(group=>group.items.map(item=>({...item,group:group.title,title:PAGE_TITLES[item.path]})));
export default function CommandPalette({isOpen,onClose}:{isOpen:boolean;onClose:()=>void;onOpenFilters?:()=>void}){
  const [query,setQuery]=useState(''),[index,setIndex]=useState(0);
  const navigate=useNavigate(),location=useLocation(),list=useRef<HTMLDivElement>(null);
  const results=useMemo(()=>PAGES.filter(p=>(p.title+' '+p.group+' '+p.path).toLowerCase().includes(query.trim().toLowerCase())),[query]);
  useEffect(()=>{if(isOpen){setQuery('');setIndex(0);}},[isOpen]);
  useEffect(()=>{list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({block:'nearest'});},[index]);
  const go=(path:string)=>{navigate(navigationTarget(path,location.pathname,location.search));onClose();};
  return <Modal open={isOpen} onClose={onClose} label="Quick navigation" className="cx-command-modal">
    <div className="cx-command-input"><Search size={20} aria-hidden="true"/><input autoFocus role="combobox" aria-label="Search pages and navigation" aria-expanded="true" aria-controls="page-results" aria-autocomplete="list" aria-activedescendant={results.length?`command-${index}`:undefined}
      placeholder="Find a page…" value={query} onChange={e=>{setQuery(e.target.value);setIndex(0);}} onKeyDown={e=>{
        if(e.key==='ArrowDown'){e.preventDefault();setIndex(old=>results.length?(old+1)%results.length:0);}
        if(e.key==='ArrowUp'){e.preventDefault();setIndex(old=>results.length?(old-1+results.length)%results.length:0);}
        if(e.key==='Enter'&&results[index]){e.preventDefault();go(results[index].path);}
      }}/><button className="cx-icon-button" onClick={onClose} aria-label="Close search"><X size={18}/></button></div>
    <div className="cx-command-results" role="listbox" aria-label="Matching pages" id="page-results" ref={list}>
      {!results.length&&<p className="p-6 text-sm text-text-sec" role="status">No pages match “{query}”. Try “calls”, “sources” or “evidence”.</p>}
      {results.map((item,i)=>{const Icon=item.icon;return <div role="option" aria-selected={i===index} id={`command-${i}`} data-index={i} key={item.path} onMouseEnter={()=>setIndex(i)} onClick={()=>go(item.path)} className="cx-command-option">
        <Icon size={18} aria-hidden="true"/><span><strong>{item.title}</strong><small>{item.group.toLowerCase()}</small></span><ArrowRight size={16} aria-hidden="true"/></div>;})}
    </div><footer className="cx-command-footer"><span>Arrow keys to navigate · Enter to open</span><span>Esc to close</span></footer>
  </Modal>;
}
''')

write('src/components/PageHeader.tsx', '''import React from 'react';
import { useLocation } from 'react-router-dom';
import { PAGE_TITLES } from '../../contracts/naming';
interface PageHeaderProps { title:string;description?:string;category?:string;badge?:string;children?:React.ReactNode; }
export default function PageHeader({title,description,badge,children}:PageHeaderProps){
  const location=useLocation();
  return <header className="cx-page-header"><div><h1 className="text-page-title">{PAGE_TITLES[location.pathname]||title}</h1>{description&&<p>{description}</p>}{badge&&<span className="cx-status mt-3">{badge}</span>}</div>{children&&<div className="cx-page-actions">{children}</div>}</header>;
}
''')
write('src/components/PageShell.tsx', '''import React from 'react';
export function PageShell({children,className=''}:{children:React.ReactNode;className?:string}){
  return <div className={`cx-page ${className}`}>{children}</div>;
}
''')
# No decorative random chart data in loading placeholders.
edit('src/components/Skeleton.tsx','Math.max(20, Math.random() * 100)', '[40,65,48,82,56,70,90,68,74,52,86,62][i]')
p=R/'src/components/Skeleton.tsx';p.write_text(p.read_text()+'''
export function PageSkeleton(){
  return <div className="cx-page" role="status" aria-label="Loading page"><span className="sr-only">Loading analytical page…</span>
    <div aria-hidden="true"><Skeleton className="h-8 w-64 mb-3"/><Skeleton className="h-4 w-full max-w-xl mb-8"/>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">{[0,1,2,3].map(i=><div key={i} className="enterprise-card p-6"><Skeleton className="h-4 w-3/4 mb-5"/><Skeleton className="h-9 w-1/2"/></div>)}</div><ChartSkeleton/></div>
  </div>;
}
''')
