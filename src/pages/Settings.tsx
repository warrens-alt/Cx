import { useClient } from '../lib/ClientContext';
import React, { useState, useEffect } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { Database, AlertCircle, CheckCircle2, Server, Key, Table } from 'lucide-react';

export default function Settings() {
  const { selectedClient } = useClient();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedClient) return;
    fetch(`/api/analytics/health?clientId=${selectedClient}`)
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setStatus({ success: false, error: 'Could not reach server.' });
        setLoading(false);
      });
  }, [selectedClient]);

  return (
    <PageShell>
      <PageHeader 
        title="System & Data Pipeline Status" 
        category="Infrastructure Telemetry"
        description="Verify service account authentication, BigQuery connection status, and real-time streaming health." 
      />

      <div className="max-w-3xl space-y-8">
        <div className="enterprise-card overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-surface-sec/50 flex items-center gap-3">
            <Database className="w-5 h-5 text-teal" />
            <h3 className="text-[16px] font-semibold text-text-main">BigQuery Configuration (Server-Side)</h3>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-sm text-text-sec">Checking connection...</div>
            ) : status?.success ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium text-sm">System Healthy: {status.client}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-surface-sec rounded border border-slate-100">
                    <div className="text-text-sec mb-1 flex items-center gap-2"><Server className="w-4 h-4"/> Authentication</div>
                    <div className="font-medium">Service Account (ADC)</div>
                  </div>
                  <div className="p-4 bg-surface-sec rounded border border-slate-100">
                    <div className="text-text-sec mb-1 flex items-center gap-2"><Key className="w-4 h-4"/> Client ID</div>
                    <div className="font-medium">default</div>
                  </div>
                  <div className="p-4 bg-surface-sec rounded border border-slate-100">
                    <div className="text-text-sec mb-1 flex items-center gap-2"><Table className="w-4 h-4"/> Last Data Sync</div>
                    <div className="font-medium">{status.health?.latestData ? new Date(status.health.latestData.value).toLocaleString() : 'N/A'}</div>
                  </div>
                  <div className="p-4 bg-surface-sec rounded border border-slate-100">
                    <div className="text-text-sec mb-1 flex items-center gap-2"><Database className="w-4 h-4"/> Connection</div>
                    <div className="font-medium text-emerald-600">{status.health?.status || 'Unknown'}</div>
                  </div>
                </div>

                <div className="text-xs text-text-sec mt-4 border-t border-slate-100 pt-4">
                  Note: Client database credentials are now strictly managed server-side via the central <code>ClientDataSource</code> configuration. Frontend configuration is disabled to enforce analytical integrity.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-100">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Connection Failed</h4>
                  <p className="text-sm mt-1 opacity-90">{status?.error || status?.health?.error || 'Unknown error'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
