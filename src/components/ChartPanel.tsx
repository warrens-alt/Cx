import DataAuditDrawer from './DataAuditDrawer';
import { Table as TableIcon } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

interface Props {
  auditTitle?: string;
  auditContext?: any;
  auditGrain?: string;
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ChartPanel({ title, subtitle, controls, children, footer, auditTitle, auditContext, auditGrain }: Props) {
  const [auditOpen, setAuditOpen] = useState(false);
  return (
    <div className="enterprise-card flex flex-col h-full">
      {(title || controls) && (
        <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-card-title text-text-main font-semibold">{title}</h3>}
            {subtitle && <p className="text-[12px] text-text-sec mt-1">{subtitle}</p>}
          </div>
          {auditTitle && (
            <button onClick={() => setAuditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-text-sec bg-surface border border-border-subtle rounded hover:bg-slate-50 transition-colors shrink-0">
              <TableIcon className="w-3.5 h-3.5" />
              View Data
            </button>
          )}
          {controls && (
            <div className="flex items-center gap-3 shrink-0">
              {controls}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 p-5 min-h-[220px] relative">
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-sec/30 text-[12px]">
          {footer}
        </div>
      )}
    </div>
  );
}
