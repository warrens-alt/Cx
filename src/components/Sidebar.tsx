import React, { useState } from 'react';
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
        const expanded=!!q || !collapsed[group.title];
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
