import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  Sparkles, 
  Compass, 
  GitBranch, 
  Phone, 
  Megaphone, 
  Banknote, 
  Share2, 
  Activity, 
  CheckCircle2, 
  Repeat, 
  Award, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  Command
} from 'lucide-react';
import { useFilters } from '../lib/FilterContext';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Pages' | 'Actions' | 'Filters';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFilters?: () => void;
}

export default function CommandPalette({ isOpen, onClose, onOpenFilters }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { clearFilters, setStartDate, setEndDate } = useFilters();

  const commands: CommandItem[] = [
    // Pages
    {
      id: 'page-overview',
      title: 'Executive Overview',
      subtitle: 'High-level KPI scorecard, lead-to-revenue trends & source performance',
      category: 'Pages',
      icon: LayoutDashboard,
      action: () => { navigate('/overview'); onClose(); },
      keywords: ['dashboard', 'kpi', 'revenue', 'leads', 'home', 'executive']
    },
    {
      id: 'page-insights',
      title: 'Automated Insights',
      subtitle: 'AI-assisted deterministic variance explanations and alerts',
      category: 'Pages',
      icon: Sparkles,
      action: () => { navigate('/insights'); onClose(); },
      keywords: ['ai', 'anomalies', 'drivers', 'summary']
    },
    {
      id: 'page-explore',
      title: 'Data Explorer',
      subtitle: 'Multi-dimensional pivot, bar, line, area & donut charting workspace',
      category: 'Pages',
      icon: Compass,
      action: () => { navigate('/explore'); onClose(); },
      keywords: ['pivot', 'chart', 'dimension', 'custom', 'analytics']
    },
    {
      id: 'page-routing',
      title: 'Routing & Handoffs',
      subtitle: 'Routing depth, call centre allocation & transfer efficiency',
      category: 'Pages',
      icon: GitBranch,
      action: () => { navigate('/routing'); onClose(); },
      keywords: ['routing', 'handoff', 'call centre', 'depth']
    },
    {
      id: 'page-call-performance',
      title: 'Call Performance',
      subtitle: 'Dial attempts, contactability decay, RPC curves & dispositions',
      category: 'Pages',
      icon: Phone,
      action: () => { navigate('/call-performance'); onClose(); },
      keywords: ['dials', 'calls', 'rpc', 'contact', 'attempts']
    },
    {
      id: 'page-speed-to-lead',
      title: 'Speed to Lead',
      subtitle: 'First contact latency buckets and conversion decay curves',
      category: 'Pages',
      icon: Phone,
      action: () => { navigate('/speed-to-lead'); onClose(); },
      keywords: ['speed', 'latency', 'seconds', 'minutes', 'sla']
    },
    {
      id: 'page-acquisition',
      title: 'Acquisition & Media',
      subtitle: 'Traffic mediums, campaign mix, CPA & media economics',
      category: 'Pages',
      icon: Megaphone,
      action: () => { navigate('/acquisition'); onClose(); },
      keywords: ['cpa', 'media', 'campaigns', 'ad spend', 'marketing']
    },
    {
      id: 'page-outcomes',
      title: 'Outcomes & Revenue',
      subtitle: 'Sales realization, revenue leakage, clawbacks & billing yields',
      category: 'Pages',
      icon: Banknote,
      action: () => { navigate('/outcomes'); onClose(); },
      keywords: ['revenue', 'sales', 'money', 'billing', 'leakage']
    },
    {
      id: 'page-sources',
      title: 'Sources & Mix',
      subtitle: 'Channel volume, conversion efficiency & vendor attribution mix',
      category: 'Pages',
      icon: Share2,
      action: () => { navigate('/sources'); onClose(); },
      keywords: ['sources', 'vendors', 'channel', 'partners']
    },
    {
      id: 'page-lead-perf',
      title: 'Lead Performance & Funnel',
      subtitle: 'End-to-end conversion steps from submission to activation',
      category: 'Pages',
      icon: Activity,
      action: () => { navigate('/lead-performance'); onClose(); },
      keywords: ['funnel', 'stages', 'conversion', 'waterfall']
    },
    {
      id: 'page-quality',
      title: 'Lead Quality & Vetting',
      subtitle: 'Credit scores, validation rules, vetting bands & qualification',
      category: 'Pages',
      icon: CheckCircle2,
      action: () => { navigate('/quality'); onClose(); },
      keywords: ['vetting', 'grades', 'score', 'credit', 'qualification']
    },
    {
      id: 'page-reentry',
      title: 'Consumer Re-entry',
      subtitle: 'Duplicate detection, repeat submissions & re-engagement cycles',
      category: 'Pages',
      icon: Repeat,
      action: () => { navigate('/consumers'); onClose(); },
      keywords: ['duplicate', 'repeat', 're-entry', 'churn', 'frequency']
    },
    {
      id: 'page-revetting',
      title: 'Re-vetting Analysis',
      subtitle: 'Secondary underwriting adjustments, score drift & uplift',
      category: 'Pages',
      icon: Award,
      action: () => { navigate('/revetting'); onClose(); },
      keywords: ['re-vetting', 'uplift', 're-eval', 'tier']
    },
    {
      id: 'page-cohorts',
      title: 'Cohorts Analysis',
      subtitle: 'Longitudinal maturation curves and retention tracking',
      category: 'Pages',
      icon: Activity,
      action: () => { navigate('/cohorts'); onClose(); },
      keywords: ['cohorts', 'maturation', 'time series', 'weeks', 'days']
    },
    {
      id: 'page-explorer',
      title: 'Lead Records Explorer',
      subtitle: 'Row-level record lookup, field verification & audit inspector',
      category: 'Pages',
      icon: Search,
      action: () => { navigate('/explorer'); onClose(); },
      keywords: ['records', 'lead id', 'search', 'lookup', 'rows', 'table']
    },
    {
      id: 'page-data-trust',
      title: 'Data Trust Matrix',
      subtitle: 'Discrepancy audit, field completeness and reconciliation scores',
      category: 'Pages',
      icon: ShieldCheck,
      action: () => { navigate('/data-trust'); onClose(); },
      keywords: ['trust', 'reconciliation', 'audit', 'completeness']
    },
    {
      id: 'page-data-quality',
      title: 'Data Quality & Freshness',
      subtitle: 'Pipeline sync health, SLA timeliness and schema compliance',
      category: 'Pages',
      icon: ShieldAlert,
      action: () => { navigate('/data-quality'); onClose(); },
      keywords: ['freshness', 'sla', 'pipeline', 'sync', 'errors']
    },
    {
      id: 'page-admin',
      title: 'Admin & Configuration',
      subtitle: 'System parameters, currency format and tenant configuration',
      category: 'Pages',
      icon: Settings,
      action: () => { navigate('/admin'); onClose(); },
      keywords: ['admin', 'settings', 'currency', 'tenant', 'config']
    },

    // Actions
    {
      id: 'action-filters',
      title: 'Open Universal Filters',
      subtitle: 'Apply multi-dimensional source, quality and outcome filters',
      category: 'Actions',
      icon: SlidersHorizontal,
      action: () => {
        onClose();
        if (onOpenFilters) onOpenFilters();
      },
      keywords: ['filter', 'criteria', 'dimension', 'slice']
    },
    {
      id: 'action-reset-filters',
      title: 'Reset All Active Filters',
      subtitle: 'Clear all applied source, vendor, outcome and quality criteria',
      category: 'Actions',
      icon: RotateCcw,
      action: () => {
        clearFilters();
        onClose();
      },
      keywords: ['clear', 'reset', 'clean', 'default']
    },
    {
      id: 'action-reset-date',
      title: 'Reset Date Range: Full Month (Aug 2026)',
      subtitle: 'Set date range back to standard August 2026 data window',
      category: 'Actions',
      icon: RotateCcw,
      action: () => {
        setStartDate('2026-08-01');
        setEndDate('2026-08-31');
        onClose();
      },
      keywords: ['august', 'month', 'date', 'range', 'default']
    }
  ];

  const filteredCommands = commands.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some(k => k.includes(q)))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-2xl bg-surface rounded-xl shadow-2xl border border-border-strong overflow-hidden flex flex-col max-h-[80vh] z-10 fade-in">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle bg-surface">
          <Search className="w-5 h-5 text-text-mute shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search pages (e.g., 'call', 'speed', 'revenue', 'filters')..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-[15px] font-medium text-text-main placeholder:text-text-mute outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-text-mute hover:text-text-main px-2 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-text-mute bg-surface-sec border border-border-subtle rounded ml-2">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-text-sec">
              <Command className="w-8 h-8 mx-auto text-text-mute mb-2 opacity-50" />
              <p className="text-sm font-semibold text-text-main">No commands or pages found</p>
              <p className="text-xs text-text-mute mt-1">Try searching for keywords like "leads", "revenue", or "quality"</p>
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-teal-light text-teal-dark font-medium' 
                      : 'hover:bg-surface-sec text-text-main'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-teal text-white' : 'bg-surface-sec border border-border-subtle text-text-sec'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-teal-dark' : 'text-text-main'}`}>
                          {item.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wider ${
                          item.category === 'Pages' 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-text-sec mt-0.5 leading-normal">{item.subtitle}</p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-teal translate-x-0.5' : 'text-transparent'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-4 py-2.5 bg-surface-sec border-t border-border-subtle flex items-center justify-between text-xs text-text-sec">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-surface border border-border-subtle px-1.5 py-0.5 rounded text-xs">↑</kbd> <kbd className="font-mono bg-surface border border-border-subtle px-1.5 py-0.5 rounded text-xs">↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-surface border border-border-subtle px-1.5 py-0.5 rounded text-xs">↵</kbd> to select</span>
          </div>
          <span className="font-medium text-text-sec">ConversionX Navigator</span>
        </div>
      </div>
    </div>
  );
}
