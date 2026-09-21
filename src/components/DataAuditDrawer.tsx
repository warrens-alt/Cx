import { VisualTable } from './visuals/DataVisual';
import React from 'react';
import { formatTableNumber } from '../lib/formatters';
import { useState, useEffect } from 'react';
import { X, Download, Table as TableIcon } from 'lucide-react';
import { useClient } from '../lib/ClientContext';
import { useFilters } from '../lib/FilterContext';

interface DataAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultGrain?: string;
  contextFilters?: Record<string, any>;
}

export default function DataAuditDrawer({
  isOpen,
  onClose,
  title,
  defaultGrain = 'lead',
  contextFilters = {}
}: DataAuditDrawerProps) {
  const { selectedClient, clientConfig } = useClient();
  const { startDate, endDate, filters } = useFilters();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [grain, setGrain] = useState(defaultGrain);

  const [activeGroups, setActiveGroups] = useState<string[]>(['Lead', 'Quality', 'Outcomes', 'HLC 1']);

  const getColumnGroup = (key: string) => {
    if (key.match(/^hlc_(\d+)_/)) {
      const num = key.match(/^hlc_(\d+)_/)[1];
      return `HLC ${num}`;
    }
    if (['lead_id', 'consumer_id', 'capture_date', 'capture_timestamp', 'source', 'medium'].includes(key)) return 'Lead';
    if (['valid_lead', 'valid_idno', 'phone_valid', 'grade', 'vetting', 'sentinel_capture'].includes(key)) return 'Quality';
    if (['has_delivery', 'has_call', 'has_rpc', 'has_sale', 'has_activation', 'total_calls', 'first_call_timestamp', 'last_call_timestamp', 'total_revenue'].includes(key)) return 'Outcomes';
    return 'Other';
  };

  const allGroups = Array.from(new Set(data.length > 0 ? Object.keys(data[0]).map(getColumnGroup) : []));

  const toggleGroup = (grp: string) => {
    setActiveGroups(prev => prev.includes(grp) ? prev.filter(g => g !== grp) : [...prev, grp]);
  };

  
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    
    const combinedFilters = { ...filters, ...contextFilters };
    
    const params = new URLSearchParams({ 
      clientId: selectedClient || 'default',
      grain,
      format: 'json'
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (Object.keys(combinedFilters).length > 0) {
      params.append('filters', JSON.stringify(combinedFilters));
    }
    
    fetch('/api/analytics/export?' + params.toString())
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setData(res.data);
        } else {
          setData([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen, grain, selectedClient, startDate, endDate, JSON.stringify(filters), JSON.stringify(contextFilters)]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const combinedFilters = { ...filters, ...contextFilters };
    const params = new URLSearchParams({ 
      clientId: selectedClient || 'default',
      grain,
      format
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (Object.keys(combinedFilters).length > 0) {
      params.append('filters', JSON.stringify(combinedFilters));
    }
    
    const url = '/api/analytics/export?' + params.toString();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const uniqueLeads = new Set(data.map(r => r['Lead ID'])).size;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[900px] max-w-[95vw] bg-surface shadow-2xl z-[110] flex flex-col slide-in-right">
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-surface-sec">
          <div>
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-teal" />
              {title}
            </h2>
            <p className="text-sm text-text-sec mt-1">Audit the underlying data for this metric or chart.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 border-b border-border-subtle bg-slate-50/50 flex flex-wrap items-center gap-6 text-sm">
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Data Grain</span>
            <select 
              value={grain} 
              onChange={e => setGrain(e.target.value)}
              className="bg-white border rounded px-2 py-1 font-semibold text-text-main"
            >
              <option value="lead">Unique Lead</option>
              <option value="transaction">Lead × Vendor Transaction</option>
            </select>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Rows</span>
            <span className="font-semibold text-text-main">{formatTableNumber(data.length)}</span>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Unique Leads</span>
            <span className="font-semibold text-text-main">{formatTableNumber(uniqueLeads)}</span>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Timezone</span>
            <span className="font-semibold text-text-main">{clientConfig?.timezone || 'UTC'}</span>
          </div>
          <div>
            <span className="text-text-mute font-medium block text-xs uppercase tracking-wider mb-1">Data As Of</span>
            <span className="font-semibold text-text-main">{new Date().toLocaleString()}</span>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-white border border-border-strong rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>        
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-mute">
              <TableIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No records found for the current filter context.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-text-mute flex items-center mr-2">COLUMN GROUPS:</span>
                {allGroups.map(grp => (
                  <button 
                    key={grp}
                    onClick={() => toggleGroup(grp)}
                    className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${activeGroups.includes(grp) ? 'bg-teal text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
              <div className="bg-white border rounded-lg shadow-sm overflow-auto max-h-full">
              <VisualTable visual={{id:'legacy.audit',data:(data)}} className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {Object.keys(data[0]).filter(k => activeGroups.includes(getColumnGroup(k))).map(key => (
                      <th key={key} className="p-3 font-semibold text-text-sec border-b">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      {Object.entries(row).filter(([k]) => activeGroups.includes(getColumnGroup(k))).map(([k, val]: any, j) => (
                        <td key={j} className="p-3 text-text-main">
                          {val === null ? <span className="text-slate-300 italic">null</span> :
                           typeof val === 'boolean' ? (val ? 'True' : 'False') :
                           String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </VisualTable>

              {data.length > 100 && (
                <div className="p-4 text-center text-text-mute text-sm border-t">
                  Showing first 100 of {formatTableNumber(data.length)} rows. Export to see all records.
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
