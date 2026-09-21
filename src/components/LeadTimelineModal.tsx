import React from 'react';
import { X, Clock, CheckCircle2, User, Phone, DollarSign, Activity } from 'lucide-react';
import Modal from './Modal';
import { DataState } from './DataState';
import { useAnalyticsData } from '../lib/useAnalyticsData';
import { useFilters } from '../lib/FilterContext';
import { useClient } from '../lib/ClientContext';

interface Props {
  leadId: string;
  onClose: () => void;
}

export function LeadTimelineModal({ leadId, onClose }: Props) {
  const { data, loading, fetching, error, refetch } = useAnalyticsData<any[]>(`lead-timeline/${encodeURIComponent(leadId)}`, {}, { enabled: !!leadId });
  const { startDate, endDate } = useFilters();
  const { clientConfig } = useClient();
  const responseError = error || (data !== null && (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) ? 'The timeline response is incomplete. Please retry.' : null);
  const transactions = Array.isArray(data) ? data : [];

  if (!leadId) return null;

  return (
    <Modal open onClose={onClose} label={`Lead timeline: ${leadId}`} className="w-[min(56rem,calc(100vw-2rem))]">
      <div className="bg-white w-full max-h-[80dvh] flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface/50">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-main flex items-center gap-2">
              <User className="w-5 h-5 text-text-mute" />
              Lead timeline
            </h2>
            <p className="text-sm text-text-main font-mono break-all mt-1">{leadId}</p>
            <p className="text-sm text-text-sec mt-1">Recorded transactions in {clientConfig?.name}. Capture dates: {startDate} to {endDate}; active filters apply.</p>
          </div>
          <button 
            onClick={onClose}
            type="button"
            aria-label="Close lead timeline"
            className="cx-icon-button shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-surface-sec/30">
          {loading || responseError ? (
            <DataState loading={loading} error={responseError} retry={refetch} />
          ) : transactions.length === 0 ? (
            <p role="status" className="py-12 text-text-sec">No timeline records matched this lead and the active reporting scope.</p>
          ) : (
            <div className="space-y-6">
              {fetching && <p role="status" className="text-sm text-text-sec">Updating this timeline…</p>}
              <p className="text-sm text-text-sec">{transactions.length} returned transactions. Flags without an event timestamp are shown as recorded, not assigned an inferred time. Times use your browser’s timezone.</p>
              {transactions.map((tx: any, idx: number) => {
                // Determine sequence of events in this transaction
                const events = [];
                
                if (tx.capture_timestamp) {
                  events.push({ time: tx.capture_timestamp, name: 'Captured', icon: <Clock className="w-4 h-4 text-slate-500" /> });
                }
                if (tx.delivery_timestamp) {
                  events.push({ time: tx.delivery_timestamp, name: 'Delivered', icon: <CheckCircle2 className="w-4 h-4 text-blue-500" /> });
                }
                if (tx.first_call_timestamp) {
                  events.push({ 
                    time: tx.first_call_timestamp, 
                    name: `First dial (${tx.total_calls ?? 'unavailable'} recorded call attempts)`,
                    sub: tx.latest_dialer_status,
                    icon: <Phone className="w-4 h-4 text-emerald-500" /> 
                  });
                }
                if (tx.rpc) {
                  events.push({ time: null, name: 'Right-party contact (RPC) recorded', icon: <User className="w-4 h-4 text-emerald-600" /> });
                }
                if (tx.sale_timestamp || tx.sale) {
                  events.push({ time: tx.sale_timestamp, name: 'Sale recorded', icon: <DollarSign className="w-4 h-4 text-indigo-500" /> });
                }
                if (tx.activation_timestamp || tx.activation) {
                  events.push({ time: tx.activation_timestamp, name: 'Activation recorded', icon: <Activity className="w-4 h-4 text-indigo-600" /> });
                }

                return (
                  <div key={`${tx.transaction_id ?? 'transaction'}-${idx}`} className="bg-white rounded-lg border border-border-strong p-5 shadow-sm">
                    <h3 className="font-semibold text-sm text-text-main mb-4 flex flex-wrap gap-2 items-center justify-between break-words">
                      <span>Transaction {idx + 1} &rarr; <span className="text-brand">{tx.vendor || 'Unknown Vendor'}</span></span>
                      {tx.transaction_id && <span className="text-xs text-text-mute font-normal font-mono break-all">{tx.transaction_id}</span>}
                    </h3>
                    
                    <div className="relative border-l-2 border-border-strong ml-3 space-y-6">
                      {events.map((ev, eIdx) => (
                        <div key={eIdx} className="relative pl-6">
                          <div className="absolute -left-[11px] top-1 bg-white border border-border-strong rounded-full p-1 shadow-sm">
                            {ev.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-main">{ev.name}</div>
                            {ev.time ? (
                              <div className="text-xs text-text-sec mt-0.5">
                                {new Date(ev.time.value || ev.time).toLocaleString()}
                              </div>
                            ) : <div className="text-xs text-text-sec mt-0.5">Event timestamp unavailable</div>}
                            {ev.sub && <div className="text-xs text-text-sec mt-1 bg-surface-sec inline-block px-2.5 py-1 rounded">{ev.sub}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
