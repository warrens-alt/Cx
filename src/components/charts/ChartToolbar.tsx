import DataAuditDrawer from '../DataAuditDrawer';
import { Table as TableIcon } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { Maximize2, Download, MoreHorizontal } from 'lucide-react';

export function ChartToolbar({
  auditTitle,
  auditContext,
  auditGrain, 
  title, 
  subtitle,
  children 
}: { 
  title: string; 
  subtitle?: string;
  children?: React.ReactNode;
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
}) {
  const [auditOpen, setAuditOpen] = useState(false);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
      <div>
        <h3 className="font-display text-sm sm:text-base font-semibold text-text-main tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-text-sec mt-0.5 leading-normal">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {auditTitle && (
          <button 
            onClick={() => setAuditOpen(true)} 
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-sec bg-surface border border-border-subtle rounded-lg hover:bg-slate-50 hover:text-text-main transition-colors shrink-0 shadow-2xs"
          >
            <TableIcon className="w-3.5 h-3.5 text-teal" />
            View Data
          </button>
        )}
        <div className="flex items-center gap-1 border-l border-border-subtle pl-2 ml-1">
          <button className="p-1.5 text-text-mute hover:text-text-main hover:bg-surface-sec rounded-lg transition-colors" title="Export">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-text-mute hover:text-text-main hover:bg-surface-sec rounded-lg transition-colors" title="Full Screen">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-text-mute hover:text-text-main hover:bg-surface-sec rounded-lg transition-colors" title="More Options">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      {auditTitle && (
        <DataAuditDrawer
          isOpen={auditOpen}
          onClose={() => setAuditOpen(false)}
          title={auditTitle}
          contextFilters={auditContext || {}}
          defaultGrain={auditGrain || 'lead'}
        />
      )}
    </div>
  );
}
