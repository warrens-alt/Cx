import { useClient } from './lib/ClientContext';
import { ClientProvider } from './lib/ClientContext';
import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Activity,
  Phone,
  Banknote,
  Share2,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Search,
  Settings as SettingsIcon,
  User,
  GitBranch,
  Repeat,
  Award,
  Sparkles,
  Compass,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  SlidersHorizontal,
  Command as CommandIcon,
  Circle
} from 'lucide-react';

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

import { FilterProvider } from './lib/FilterContext';
import GlobalFilter from './components/GlobalFilter';
import CommandPalette from './components/CommandPalette';

interface SidebarProps {
  onCloseMobile?: () => void;
  onOpenCommandPalette?: () => void;
}

function Sidebar({ onCloseMobile, onOpenCommandPalette }: SidebarProps) {
  const location = useLocation();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Executive Overview', path: '/overview', icon: LayoutDashboard },
        { name: 'Automated Insights', path: '/insights', icon: Sparkles },
        { name: 'Data Explorer', path: '/explore', icon: Compass }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Routing & Handoffs', path: '/routing', icon: GitBranch },
        { name: 'Call Performance', path: '/call-performance', icon: Phone },
        { name: 'Speed to Lead', path: '/speed-to-lead', icon: Phone },
        { name: 'Acquisition & Media', path: '/acquisition', icon: Megaphone }
      ]
    },
    {
      title: 'COMMERCIAL',
      items: [
        { name: 'Outcomes & Revenue', path: '/outcomes', icon: Banknote }
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { name: 'Sources & Mix', path: '/sources', icon: Share2 },
        { name: 'Lead Performance', path: '/lead-performance', icon: Activity },
        { name: 'Lead Quality', path: '/quality', icon: CheckCircle2 },
        { name: 'Consumer Re-entry', path: '/consumers', icon: Repeat },
        { name: 'Re-vetting Analysis', path: '/revetting', icon: Award },
        { name: 'Cohorts', path: '/cohorts', icon: Activity },
        { name: 'Lead Records Explorer', path: '/explorer', icon: Search }
      ]
    },
    {
      title: 'DATA TRUST & QUALITY',
      items: [
        { name: 'Data Trust Matrix', path: '/data-trust', icon: ShieldCheck },
        { name: 'Data Quality & Freshness', path: '/data-quality', icon: ShieldAlert },
        { name: 'Data Coverage', path: '/data-coverage', icon: Activity },
        { name: 'Data Audit & Record Trace', path: '/audit', icon: Search }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Analytics Validation', path: '/validation', icon: CheckCircle2 },
        { name: 'Admin & Configuration', path: '/admin', icon: SettingsIcon }
      ]
    }
  ];

  // Filter items if searchQuery is present
  const q = searchQuery.toLowerCase().trim();
  const filteredNavGroups = navGroups.map(group => {
    if (!q) return group;
    const matchingItems = group.items.filter(item => 
      item.name.toLowerCase().includes(q) || group.title.toLowerCase().includes(q)
    );
    return { ...group, items: matchingItems };
  }).filter(group => group.items.length > 0);

  return (
    <aside className="w-[264px] bg-[#0F1E2E] text-slate-100 h-full flex flex-col relative overflow-hidden shrink-0 border-r border-[#1E354A]/80 select-none">
      {/* Brand Identity Header */}
      <div className="p-4 border-b border-[#1E354A]/80 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center shadow-xs ring-1 ring-teal/40">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-tight text-white leading-tight">ConversionX</span>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium">Revenue Intelligence</span>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search inside Navigation */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Filter modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A1520]/80 text-xs text-white placeholder:text-slate-400 rounded-lg pl-8 pr-7 py-1.5 outline-none border border-slate-700/60 focus:border-teal focus:ring-1 focus:ring-teal/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable Navigation */}
      <nav className="flex-1 py-2.5 overflow-y-auto custom-scrollbar px-3 space-y-3.5">
        {filteredNavGroups.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No modules match "{searchQuery}"
          </div>
        ) : (
          filteredNavGroups.map((group) => {
            const isCollapsed = collapsedSections[group.title] && !searchQuery;

            return (
              <div key={group.title}>
                <button
                  onClick={() => toggleSection(group.title)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                >
                  <span className="font-display">{group.title}</span>
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>
                
                {!isCollapsed && (
                  <ul className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location.pathname.startsWith(item.path);
                      const Icon = item.icon;
                      
                      return (
                        <li key={item.path}>
                          <Link
                            to={item.path}
                            onClick={onCloseMobile}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all rounded-lg group ${
                              isActive 
                                ? 'bg-teal/15 text-white font-semibold ring-1 ring-teal/30' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                            }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                            <span className="leading-snug break-words">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </nav>
      
      {/* Live Data Status & User Footer */}
      <div className="p-3 border-t border-[#1E354A]/80 bg-[#0A1520]/70 space-y-2">
        {/* Status Indicator */}
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-300">BigQuery Connected</span>
          </span>
          <span className="font-mono text-[11px] text-slate-400">vw_leads</span>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#162B3D]/50 border border-slate-700/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#0F1E2E] flex items-center justify-center border border-slate-700/60">
              <User className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-200 leading-tight">Analyst Workspace</span>
              <span className="text-[10px] text-slate-400 font-mono">dashboards-422710</span>
            </div>
          </div>
          <Link 
            to="/admin" 
            title="System Settings"
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut for Command Palette: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BrowserRouter>
      <ClientProvider>
        <FilterProvider>
          <div className="flex h-screen bg-app-bg overflow-hidden font-sans">
            
            {/* Desktop Sidebar */}
            <div className="hidden lg:block h-full">
              <Sidebar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
            </div>

            {/* Mobile Sidebar Overlay Drawer */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <div 
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
                  onClick={() => setMobileMenuOpen(false)} 
                />
                <div className="relative w-[280px] max-w-[85vw] h-full z-10 shadow-2xl">
                  <Sidebar 
                    onCloseMobile={() => setMobileMenuOpen(false)} 
                    onOpenCommandPalette={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Application Container */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <GlobalFilter 
                onOpenMobileMenu={() => setMobileMenuOpen(true)}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              />

              <main className="flex-1 overflow-y-auto relative custom-scrollbar">
                <Suspense fallback={
                  <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
                    <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                    <div className="text-xs font-semibold text-text-sec uppercase tracking-wider">
                      Loading analytical module...
                    </div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
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
                  </Routes>
                </Suspense>
              </main>
            </div>

            {/* Global Command Palette */}
            <CommandPalette 
              isOpen={commandPaletteOpen} 
              onClose={() => setCommandPaletteOpen(false)}
            />
          </div>
        </FilterProvider>
      </ClientProvider>
    </BrowserRouter>
  );
}
