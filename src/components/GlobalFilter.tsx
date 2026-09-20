import React, { useEffect, useState, useMemo } from 'react';
import { useFilters } from '../lib/FilterContext';
import { 
  ChevronDown, 
  Calendar as CalendarIcon, 
  SlidersHorizontal, 
  RefreshCw, 
  X, 
  Search, 
  Menu, 
  Check, 
  RotateCcw,
  Sparkles,
  Command
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface GlobalFilterProps {
  onOpenMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

const DATE_PRESETS = [
  { id: 'august_full', label: 'Aug 2026 (Full Month)', start: '2026-08-01', end: '2026-08-31' },
  { id: 'last_7d', label: 'Last 7 Days (Aug 25-31)', start: '2026-08-25', end: '2026-08-31' },
  { id: 'last_14d', label: 'Last 14 Days (Aug 18-31)', start: '2026-08-18', end: '2026-08-31' },
  { id: 'first_half', label: 'First Half (Aug 1-15)', start: '2026-08-01', end: '2026-08-15' },
  { id: 'second_half', label: 'Second Half (Aug 16-31)', start: '2026-08-16', end: '2026-08-31' },
  { id: 'q3_2026', label: 'Q3 2026 (Jul-Sep)', start: '2026-07-01', end: '2026-09-30' },
  { id: 'full_year_2026', label: 'Full Year 2026', start: '2026-01-01', end: '2026-12-31' },
];

export default function GlobalFilter({ onOpenMobileMenu, onOpenCommandPalette }: GlobalFilterProps) {
  const { 
    startDate, setStartDate, 
    endDate, setEndDate,
    setDateRange,
    filters, setFilter, clearFilters,
    source, setSource,
    vendor, setVendor,
    medium, setMedium
  } = useFilters();
  
  const [options, setOptions] = useState<any>({ sources: [], vendors: [], mediums: [], grades: [], vettings: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchOptions = async () => {
      try {
        const queryParams = new URLSearchParams({ clientId: 'default_tenant' });
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        const response = await fetch('/api/analytics/filter-options?' + queryParams.toString(), {
          signal: controller.signal
        });
        if (!response.ok) return;
        const result = await response.json();
        
        if (result && result.success && result.data) {
          setOptions(result.data);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Filter options fetch notice:', err.message || err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();

    return () => {
      controller.abort();
    };
  }, [startDate, endDate]);

  const activeFilterCount = Object.keys(filters).length;

  const currentPreset = useMemo(() => {
    const match = DATE_PRESETS.find(p => p.start === startDate && p.end === endDate);
    return match ? match.id : 'custom';
  }, [startDate, endDate]);

  const handlePresetChange = (presetId: string) => {
    const found = DATE_PRESETS.find(p => p.id === presetId);
    if (found) {
      if (setDateRange) {
        setDateRange(found.start, found.end);
      } else {
        setStartDate(found.start);
        setEndDate(found.end);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Trigger re-render / data notification
    window.dispatchEvent(new CustomEvent('analytics:refresh'));
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleAdvancedFilter = (key: string, value: string) => {
    if (!value) {
      setFilter(key, null);
    } else {
      setFilter(key, { operator: 'in', values: [value] });
    }
  };
  
  const getFilterValue = (key: string) => {
    return filters[key]?.values?.[0] || '';
  };

  const getBooleanFilterValue = (key: string) => {
    return filters[key]?.value !== undefined ? String(filters[key].value) : '';
  };

  const handleBooleanFilter = (key: string, value: string) => {
    if (!value) {
      setFilter(key, null);
    } else {
      setFilter(key, { operator: 'equals', value: value === 'true' });
    }
  };

  // Build active filters list for chip rendering
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; remove: () => void }[] = [];

    // Date range chip if different from default
    if (startDate !== '2026-08-01' || endDate !== '2026-08-31') {
      chips.push({
        key: 'date_range',
        label: 'Date Range',
        value: `${startDate} to ${endDate}`,
        remove: () => {
          if (setDateRange) {
            setDateRange('2026-08-01', '2026-08-31');
          } else {
            setStartDate('2026-08-01');
            setEndDate('2026-08-31');
          }
        }
      });
    }

    if (source) {
      chips.push({
        key: 'source',
        label: 'Source',
        value: source,
        remove: () => setSource('')
      });
    }

    if (vendor) {
      chips.push({
        key: 'vendor',
        label: 'Vendor',
        value: vendor,
        remove: () => setVendor('')
      });
    }

    if (medium) {
      chips.push({
        key: 'medium',
        label: 'Medium',
        value: medium,
        remove: () => setMedium('')
      });
    }

    Object.entries(filters).forEach(([key, filterCond]) => {
      const cond = filterCond as any;
      if (['source', 'vendor', 'medium'].includes(key)) return;

      let displayVal = '';
      if (cond.operator === 'equals') {
        displayVal = cond.value === true ? 'Yes' : cond.value === false ? 'No' : String(cond.value);
      } else if (cond.operator === 'in' && cond.values?.length) {
        displayVal = cond.values.join(', ');
      } else if (cond.operator === 'between') {
        displayVal = `${cond.min}-${cond.max}`;
      }

      if (displayVal) {
        const prettyKey = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        chips.push({
          key,
          label: prettyKey,
          value: displayVal,
          remove: () => setFilter(key, null)
        });
      }
    });

    return chips;
  }, [filters, source, vendor, medium, setSource, setVendor, setMedium, setFilter]);

  return (
    <>
      <header className="bg-surface border-b border-border-subtle sticky top-0 z-30 shrink-0 shadow-xs">
        {/* Main Toolbar Row */}
        <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Mobile Hamburger & Search Command trigger */}
          <div className="flex items-center gap-2.5">
            {onOpenMobileMenu && (
              <button
                onClick={onOpenMobileMenu}
                aria-label="Open Navigation Menu"
                className="lg:hidden p-2 text-text-sec hover:text-text-main hover:bg-surface-sec rounded-md border border-border-subtle transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Quick Command Palette Button */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-text-sec bg-surface-sec hover:bg-slate-100 border border-border-subtle rounded-md transition-all group"
              title="Search analytical modules & metrics (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-text-mute group-hover:text-text-main transition-colors" />
              <span className="hidden sm:inline">Search modules or jump to view...</span>
              <span className="sm:hidden">Search...</span>
              <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-text-mute bg-surface border border-border-subtle rounded ml-1">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Date Presets, Custom Date Picker, Quick Source, Filter Drawer Trigger */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-auto">
            {/* Date Range Preset Selector */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-text-mute hidden sm:block shrink-0" />
              <select
                value={currentPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="text-xs sm:text-sm font-medium bg-surface border border-border-subtle rounded-md px-3 py-1.5 text-text-main outline-none focus:border-teal hover:border-border-strong transition-colors cursor-pointer"
              >
                {DATE_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Date Inputs: always visible when 'custom' is selected, otherwise visible on lg+ screens */}
            <div className={cn(
              "items-center gap-1.5",
              currentPreset === 'custom' ? "flex" : "hidden lg:flex"
            )}>
              <input 
                type="date"
                className="w-[130px] border border-border-subtle rounded-md px-2.5 py-1.5 text-xs font-medium text-text-main bg-surface outline-none focus:border-teal transition-colors"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Universal Start Date"
              />
              <span className="text-text-mute text-xs font-medium px-0.5">to</span>
              <input 
                type="date"
                className="w-[130px] border border-border-subtle rounded-md px-2.5 py-1.5 text-xs font-medium text-text-main bg-surface outline-none focus:border-teal transition-colors"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Universal End Date"
              />
            </div>

            <div className="h-5 w-px bg-border-subtle hidden sm:block" />

            {/* Quick Source Filter */}
            <div className="hidden md:flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium text-text-sec">Source:</label>
              <select 
                className="min-w-[140px] max-w-[220px] border border-border-subtle rounded-md px-3 py-1.5 text-xs sm:text-sm text-text-main bg-surface font-medium outline-none focus:border-teal transition-colors"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={loading}
              >
                <option value="">All Sources</option>
                {options.sources?.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Advanced Filters Button */}
            <button 
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 border rounded-md text-xs sm:text-sm font-medium transition-all shadow-xs",
                activeFilterCount > 0 
                  ? "bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100 font-semibold" 
                  : "bg-surface border-border-strong text-text-main hover:bg-surface-sec"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-2 py-0.5 bg-teal text-white rounded-full text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Refresh Data Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-text-sec hover:text-text-main hover:bg-surface-sec border border-border-subtle rounded-md transition-colors"
              title="Refresh dataset from BigQuery"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-teal")} />
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar (renders when any filter is active) */}
        {activeChips.length > 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-surface-sec border-t border-border-subtle flex items-center gap-2.5 flex-wrap text-xs sm:text-sm">
            <span className="text-xs font-semibold text-text-sec uppercase tracking-wider">
              Applied Filters ({activeChips.length}):
            </span>

            {activeChips.map((chip) => (
              <span 
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-teal-200 text-teal-900 text-xs font-medium shadow-2xs"
              >
                <span className="text-text-sec text-xs">{chip.label}:</span>
                <span className="font-semibold whitespace-nowrap">{chip.value}</span>
                <button 
                  onClick={chip.remove}
                  className="p-0.5 hover:bg-teal-100 rounded-full text-teal-700 hover:text-teal-950 transition-colors ml-1"
                  title={`Remove ${chip.label} filter`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <button 
              onClick={clearFilters}
              className="text-xs text-text-mute hover:text-red-600 font-medium underline ml-auto transition-colors px-2 py-1"
            >
              Clear all filters
            </button>
          </div>
        )}
      </header>

      {/* Advanced Filter Drawer Backdrop */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Advanced Filter Drawer */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          drawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-sec">
          <div>
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-teal" />
              Universal Dimensional Filters
            </h2>
            <p className="text-xs text-text-sec mt-0.5">Applied deterministically across all BigQuery analytical queries</p>
          </div>
          <button 
            onClick={() => setDrawerOpen(false)} 
            className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Universal Date Range Block */}
          <div className="space-y-3 bg-teal-50/50 p-4 rounded-lg border border-teal-100">
            <h3 className="text-xs font-bold tracking-wider text-teal-900 uppercase flex items-center gap-1.5 border-b border-teal-200/60 pb-2">
              <CalendarIcon className="w-3.5 h-3.5 text-teal" />
              Universal Date Filter
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Date Range Preset</label>
              <select 
                className="w-full border border-teal-200 rounded-md px-3 py-2 text-xs font-medium bg-white text-text-main focus:border-teal outline-none"
                value={currentPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                {DATE_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-sec">Start Date</label>
                <input 
                  type="date"
                  className="w-full border border-teal-200 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white text-text-main focus:border-teal outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-text-sec">End Date</label>
                <input 
                  type="date"
                  className="w-full border border-teal-200 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white text-text-main focus:border-teal outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-teal-800/80">Applied globally across all metrics, views, and tabs.</p>
          </div>

          {/* Acquisition Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-text-sec uppercase border-b border-border-subtle pb-2">
              Acquisition & Channel
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Lead Source</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">All Sources</option>
                {options.sources?.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Traffic Medium</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={medium} onChange={(e) => setMedium(e.target.value)}>
                <option value="">All Mediums</option>
                {options.mediums?.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Partner Vendor</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="">All Vendors</option>
                {options.vendors?.map((v: any) => (
                  <option key={v.value || v} value={v.value || v}>
                    {v.label || v} {v.uniqueLeads ? `(${v.uniqueLeads.toLocaleString()} leads)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead Quality Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-text-sec uppercase border-b border-border-subtle pb-2">
              Lead Quality & Underwriting
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Lead Grade</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getFilterValue('grade')} onChange={(e) => handleAdvancedFilter('grade', e.target.value)}>
                <option value="">All Grades</option>
                {options.grades?.map((g: string) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Vetting Score Tier</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getFilterValue('vetting')} onChange={(e) => handleAdvancedFilter('vetting', e.target.value)}>
                <option value="">All Scores</option>
                {options.vettings?.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Operational Outcomes Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-text-sec uppercase border-b border-border-subtle pb-2">
              Operational Outcomes
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Right Party Contact (RPC)</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('rpc')} onChange={(e) => handleBooleanFilter('rpc', e.target.value)}>
                <option value="">All Leads</option>
                <option value="true">RPC Achieved (Yes)</option>
                <option value="false">No Contact (No)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Commercial Sale Realized</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('sale')} onChange={(e) => handleBooleanFilter('sale', e.target.value)}>
                <option value="">All Leads</option>
                <option value="true">Sale Completed (Yes)</option>
                <option value="false">Unconverted (No)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Activation Confirmed</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('activated')} onChange={(e) => handleBooleanFilter('activated', e.target.value)}>
                <option value="">All Leads</option>
                <option value="true">Policy Activated (Yes)</option>
                <option value="false">Not Activated (No)</option>
              </select>
            </div>
          </div>
          
          {/* Data Validation Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-text-sec uppercase border-b border-border-subtle pb-2">
              Data Validation & Verification
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Overall Lead Validity</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('valid_lead')} onChange={(e) => handleBooleanFilter('valid_lead', e.target.value)}>
                <option value="">All Records</option>
                <option value="true">Clean / Valid Only</option>
                <option value="false">Failed Validation Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">National ID Validation</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('valid_idno')} onChange={(e) => handleBooleanFilter('valid_idno', e.target.value)}>
                <option value="">All Records</option>
                <option value="true">Valid National ID</option>
                <option value="false">Invalid / Incomplete ID</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Phone Number Format</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" value={getBooleanFilterValue('phone_valid')} onChange={(e) => handleBooleanFilter('phone_valid', e.target.value)}>
                <option value="">All Records</option>
                <option value="true">Valid Format / E.164</option>
                <option value="false">Invalid Number</option>
              </select>
            </div>
          </div>

          {/* Activity / Calls Block */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-text-sec uppercase border-b border-border-subtle pb-2">
              Outbound Contact Activity
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-sec">Total Dial Attempts</label>
              <select className="w-full border border-border-subtle rounded-md px-3 py-2 text-xs font-medium bg-surface text-text-main focus:border-teal outline-none" 
                value={filters.calls?.operator === 'equals' ? String(filters.calls.value) : (filters.calls?.operator === 'between' ? `${filters.calls.min}-${filters.calls.max}` : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) setFilter('calls', null);
                  else if (val.includes('-')) {
                    const [min, max] = val.split('-').map(Number);
                    setFilter('calls', { operator: 'between', min, max });
                  } else {
                    setFilter('calls', { operator: 'equals', value: Number(val) });
                  }
                }}
              >
                <option value="">Any Attempts</option>
                <option value="0">0 Attempts (Uncalled)</option>
                <option value="1">1 Attempt</option>
                <option value="2">2 Attempts</option>
                <option value="3-5">3 - 5 Attempts</option>
                <option value="6-10">6 - 10 Attempts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border-subtle bg-surface-sec flex items-center justify-between gap-3">
          <button 
            onClick={clearFilters}
            className="px-3 py-2 text-xs font-semibold text-text-sec hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
          <button 
            onClick={() => setDrawerOpen(false)}
            className="px-5 py-2 bg-teal hover:bg-teal-dark text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
