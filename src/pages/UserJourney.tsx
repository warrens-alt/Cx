import React, { useState, useEffect } from 'react';
import { PageShell } from '../components/PageShell';
import PageHeader from '../components/PageHeader';
import { Loader2, AlertCircle } from 'lucide-react';
import { useFilters } from '../lib/FilterContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';



export default function UserJourneyPage() {
  const [months, setMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { source, vendor, startDate, endDate, startMonth, endMonth } = useFilters();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const projectId = 'dashboards-422710';
        const datasetId = 'lead_ledger';
        const tableId = 'clustered_lead_ledger';
        
        const params = new URLSearchParams({ projectId, datasetId, tableId });
        if (source) params.append('source', source);
        if (vendor) params.append('vendor', vendor);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (startMonth) params.append('startMonth', startMonth);
        if (endMonth) params.append('endMonth', endMonth);

        const response = await fetch(`/api/bq/journey-metrics?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
          let data = result.data.filter((m: any) => m.month);
          data = data.sort((a: any, b: any) => a.month.localeCompare(b.month));
          
          const withDisplay = data.map((m: any) => {
            const [yyyy, mm] = m.month.split('-');
            const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
            return {
              ...m,
              amountSpent: 0,
              displayMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            };
          });
          setMonths(withDisplay);
        } else {
          setError(result.error || 'Failed to fetch metrics');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [source, vendor, startMonth, endMonth]);

  // Total Volume
  let fetchedVolume = 0;
  let standardisedVolume = 0;
  let phoneValidatedVolume = 0;
  let idValidatedVolume = 0;
  let deliveredVolume = 0;
  let vendorRecordsVolume = 0;
  let saleVolume = 0;
  let activationVolume = 0;
  
  months.forEach(m => {
    fetchedVolume += m.fetched || 0;
    standardisedVolume += m.standardised || 0;
    phoneValidatedVolume += m.phoneValidated || 0;
    idValidatedVolume += m.idValidated || 0;
    deliveredVolume += m.delivered || 0;
    vendorRecordsVolume += m.vendorRecords || 0;
    saleVolume += m.sale || 0;
    activationVolume += m.activation || 0;
  });

  const formatPct = (num: number, den: number) => {
    if (!den) return '-';
    return ((num / den) * 100).toFixed(2) + '%';
  };
  
  const formatNum = (num: number) => num === 0 ? '-' : num.toLocaleString();

  const rates = [
    { label: 'Fetched→Standardised', num: standardisedVolume, den: fetchedVolume },
    { label: 'Standardised→Phone Validated', num: phoneValidatedVolume, den: standardisedVolume },
    { label: 'Phone Validated→ID Validated', num: idValidatedVolume, den: phoneValidatedVolume },
    { label: 'ID Validated→Delivered', num: deliveredVolume, den: idValidatedVolume },
    { label: 'Delivered→Vendor Record (Proxy)', num: vendorRecordsVolume, den: deliveredVolume },
    { label: 'Vendor Record→Sale', num: saleVolume, den: vendorRecordsVolume },
    { label: 'Sale→Activation', num: activationVolume, den: saleVolume },
  ];

  const volumes = [
    { label: 'Fetched Leads', val: fetchedVolume },
    { label: 'Standardised Leads', val: standardisedVolume },
    { label: 'Phone Validated Leads', val: phoneValidatedVolume },
    { label: 'ID Validated Leads', val: idValidatedVolume },
    { label: 'Delivered Leads', val: deliveredVolume },
    { label: 'Vendor Records / Acceptance Proxy', val: vendorRecordsVolume },
    { label: 'Sale', val: saleVolume },
    { label: 'Activation', val: activationVolume },
  ];

  const thDark = "bg-[#0f2b4a] text-white px-4 py-2.5 text-sm font-semibold text-left whitespace-nowrap";
  const thTeal = "bg-slate-100 text-slate-800 px-4 py-2.5 text-sm font-semibold text-left whitespace-nowrap border-b border-slate-200";
  const tdVal = "px-4 py-2 text-sm text-right text-slate-700 whitespace-nowrap bg-white border-b border-slate-100 font-mono";
  const tdLabel = "px-4 py-2 text-sm text-left text-slate-800 whitespace-nowrap bg-white border-b border-slate-100 font-medium";
  const tdLabelItalic = "px-4 py-2 text-sm text-left text-slate-600 whitespace-nowrap italic bg-white border-b border-slate-100";
  const tdGreen = "bg-[#e2f0d9] px-4 py-2 text-sm text-text-main font-bold whitespace-nowrap border-b border-slate-100";
  const tdEmpty = "bg-white border-b border-slate-100";

  if (loading) {
     return (
       <PageShell>
         <div className="flex-1 flex flex-col items-center justify-center p-12">
           <Loader2 className="w-8 h-8 animate-spin text-teal mb-4" />
           <span className="text-text-sec font-medium">Aggregating User Journey Data...</span>
         </div>
       </PageShell>
     );
  }

  if (error) {
    return (
      <PageShell>
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <div className="whitespace-pre-wrap text-sm">{error}</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader 
        title="Customer Journey Model" 
        category="End-to-End Progression"
        description="Aggregated funnel metrics driven directly by BigQuery payload."
      />

      {months.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[380px] flex flex-col">
          <h2 className="text-lg font-semibold text-text-main mb-6">Volume Over Time</h2>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFetched" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#247F7D" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#247F7D" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActivation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10283B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10283B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area isAnimationActive={false} type="monotone" dataKey="fetched" name="Fetched Leads" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorFetched)" />
                <Area isAnimationActive={false} type="monotone" dataKey="delivered" name="Delivered Leads" stroke="#247F7D" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" />
                <Area isAnimationActive={false} type="monotone" dataKey="activation" name="Activated Leads" stroke="#10283B" strokeWidth={2} fillOpacity={1} fill="url(#colorActivation)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-row items-start gap-6 mb-8 overflow-x-auto pb-4 custom-scrollbar">
        {/* Table 1: OnVest Journey */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 min-w-[380px]">
          <table className="w-full text-left">
            <thead>
              <tr><th colSpan={2} className={thDark}>OnVest Journey</th></tr>
              <tr>
                <th className="bg-surface-sec text-text-sec px-4 py-2 text-xs font-medium uppercase tracking-wider border-b border-slate-200">Touchpoint Through Rates</th>
                <th className="bg-surface-sec text-text-sec px-4 py-2 text-xs font-medium uppercase tracking-wider text-right border-b border-slate-200">SR%</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r, i) => (
                <tr key={i} className="hover:bg-surface-sec/50 transition-colors">
                  <td className={tdLabelItalic}>{r.label}</td>
                  <td className={tdVal}>{formatPct(r.num, r.den)}</td>
                </tr>
              ))}
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
              <tr className="hover:bg-surface-sec/50 transition-colors">
                <td className={tdLabel}>Billable 1: Fetched→Delivered</td>
                <td className={tdVal}>{formatPct(deliveredVolume, fetchedVolume)}</td>
              </tr>
              <tr className="hover:bg-surface-sec/50 transition-colors">
                <td className={tdLabel}>Billable 2: Delivered→Activation</td>
                <td className={tdVal}>{formatPct(activationVolume, deliveredVolume)}</td>
              </tr>
              <tr className="hover:bg-surface-sec/50 transition-colors">
                <td className={tdGreen}>End-to-End Activation</td>
                <td className={tdGreen + " text-right font-mono"}>{formatPct(activationVolume, fetchedVolume)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Table 2: Touchpoints */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 min-w-[340px]">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={thDark}>Touchpoints</th>
                <th className={thDark + " text-right"}>Observed Volume</th>
              </tr>
            </thead>
            <tbody>
              {volumes.map((v, i) => (
                <tr key={i} className="hover:bg-surface-sec/50 transition-colors">
                  <td className={tdLabel}>{v.label}</td>
                  <td className={tdVal}>{formatNum(v.val)}</td>
                </tr>
              ))}
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
              <tr><td className={tdEmpty} colSpan={2}>&nbsp;</td></tr>
            </tbody>
          </table>
        </div>

        {/* Table 3: Control / Date (Monthly Rates) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 min-w-[1000px]">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className={thDark}>Control / Date</th>
                <th className={thDark + " text-right"}>Fetched→Std</th>
                <th className={thDark + " text-right"}>Std→Phone Valid</th>
                <th className={thDark + " text-right"}>Phone Valid→ID Valid</th>
                <th className={thDark + " text-right"}>ID Valid→Delivered</th>
                <th className={thDark + " text-right"}>Delivered→VR (Proxy)</th>
                <th className={thDark + " text-right"}>VR→Activation</th>
                <th className={thDark + " text-right"}>Delivered→Activation</th>
                <th className={thDark + " text-right"}>B1: Fetched→Delivered</th>
                <th className={thDark + " text-right"}>B2: Delivered→Activation</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec/50 transition-colors">
                  <td className={tdLabel}>{m.displayMonth}</td>
                  <td className={tdVal}>{formatPct(m.standardised, m.fetched)}</td>
                  <td className={tdVal}>{formatPct(m.phoneValidated, m.standardised)}</td>
                  <td className={tdVal}>{formatPct(m.idValidated, m.phoneValidated)}</td>
                  <td className={tdVal}>{formatPct(m.delivered, m.idValidated)}</td>
                  <td className={tdVal}>{formatPct(m.vendorRecords, m.delivered)}</td>
                  <td className={tdVal}>{formatPct(m.activation, m.vendorRecords)}</td>
                  <td className={tdVal}>{formatPct(m.activation, m.delivered)}</td>
                  <td className={tdVal}>{formatPct(m.delivered, m.fetched)}</td>
                  <td className={tdVal}>{formatPct(m.activation, m.delivered)}</td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr><td colSpan={10} className={tdLabel + " text-center text-text-sec py-8"}>No grouping data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr>
                <th className={thTeal}>Period Start</th>
                <th className={thTeal + " text-right"}>Fetched Leads</th>
                <th className={thTeal + " text-right"}>Standardised Leads</th>
                <th className={thTeal + " text-right"}>Phone Validated Leads</th>
                <th className={thTeal + " text-right"}>ID Validated Leads</th>
                <th className={thTeal + " text-right"}>Internal DeDuped Leads</th>
                <th className={thTeal + " text-right"}>Internal Scored Leads</th>
                <th className={thTeal + " text-right"}>Contactability Verification</th>
                <th className={thTeal + " text-right"}>Attempted to Deliver</th>
                <th className={thTeal + " text-right"}>Delivered Leads</th>
                <th className={thTeal + " text-right"}>Vendor Records / Acceptance Proxy</th>
                <th className={thTeal + " text-right"}>Leads Sold</th>
                <th className={thTeal + " text-right"}>Activated Leads</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m: any, i: number) => (
                <tr key={i} className="hover:bg-surface-sec/50 transition-colors">
                  <td className={tdLabel}>{m.displayMonth}</td>
                  <td className={tdVal}>{formatNum(m.fetched)}</td>
                  <td className={tdVal}>{formatNum(m.standardised)}</td>
                  <td className={tdVal}>{formatNum(m.phoneValidated)}</td>
                  <td className={tdVal}>{formatNum(m.idValidated)}</td>
                  <td className={tdVal}>{formatNum(m.deduped)}</td>
                  <td className={tdVal}>{formatNum(m.scored)}</td>
                  <td className={tdVal}>{formatNum(m.contactability)}</td>
                  <td className={tdVal}>{formatNum(m.attemptedDeliver)}</td>
                  <td className={tdVal}>{formatNum(m.delivered)}</td>
                  <td className={tdVal}>{formatNum(m.vendorRecords)}</td>
                  <td className={tdVal}>{formatNum(m.sale)}</td>
                  <td className={tdVal}>{formatNum(m.activation)}</td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr><td colSpan={13} className={tdLabel + " text-center text-text-sec py-8"}>No grouping data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
