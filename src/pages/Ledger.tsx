import React, { useState, useEffect, useMemo } from 'react';
import { PageShell } from '../components/PageShell';
import { formatTableNumber, formatTableCurrency } from '../lib/formatters';
import PageHeader from '../components/PageHeader';
import { loadAssumptions } from '../lib/assumptions';
import { useFilters } from '../lib/FilterContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ReferenceLine, ComposedChart, Line } from 'recharts';

export default function LedgerPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const assumptions = loadAssumptions();
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
              displayMonth: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            };
          });
          setMetrics(withDisplay);
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

  const ledgerData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    // We need to calculate month over month
    let onvestFacilityOpeningBalance = 0;
    
    // Helper to format currency
    const formatCurrency = (val: number) => formatTableCurrency(val);

    return metrics.map((m, index) => {
      // Inputs
      const offernetFetchedLeads = m.fetched || 0;
      const offernetDeliveredLeads = m.delivered || 0; // Using delivered from BQ
      
      // We will project the calculations based on the requested columns
      // Offernet Media Spend = Fetched * plannedMediaCplPerFetchedLead
      const offernetMediaSpend = offernetFetchedLeads * assumptions.plannedMediaCplPerFetchedLead;
      
      // Activations logic first so we can use it in Offernet Revenue
      let ontactActivations = 0;
      if (index >= assumptions.clientActivationLagMonths) {
        ontactActivations = (metrics[index - assumptions.clientActivationLagMonths].delivered || 0) * (assumptions.deliveredToActivationRate / 100);
      }

      // Offernet Accrued Revenue = Delivered * offernetFeePerDeliveredLead + Activations * offernetFeePerActivation
      const offernetAccruedRevenue = (offernetDeliveredLeads * assumptions.offernetFeePerDeliveredLead) + (ontactActivations * assumptions.offernetFeePerActivation);

      // Cash payment to Offernet = Need to calculate based on lag
      const ontactToOffernetPaymentLagMonths = assumptions.ontactToOffernetPaymentLagMonths || 0;
      let cashPaymentToOffernet = 0;
      if (index >= ontactToOffernetPaymentLagMonths) {
        // Need to recalculate the past month's accrued revenue
        const pastDelivered = metrics[index - ontactToOffernetPaymentLagMonths].delivered || 0;
        let pastActivations = 0;
        const pastIndex = index - ontactToOffernetPaymentLagMonths;
        if (pastIndex >= assumptions.clientActivationLagMonths) {
          pastActivations = (metrics[pastIndex - assumptions.clientActivationLagMonths].delivered || 0) * (assumptions.deliveredToActivationRate / 100);
        }
        cashPaymentToOffernet = (pastDelivered * assumptions.offernetFeePerDeliveredLead) + (pastActivations * assumptions.offernetFeePerActivation);
      }
      
      const offernetCashReceived = cashPaymentToOffernet;
      
      // Accrual P&L
      const offernetAccrualPnL = offernetAccruedRevenue - offernetMediaSpend;
      
      const ontactAccruedClientRevenue = ontactActivations * assumptions.clientRevenuePerActivation;
      const clientCashInGross = ontactAccruedClientRevenue;
      
      const reserveHeld = clientCashInGross * (assumptions.clientPaymentReservePercent / 100);
      let reserveReleased = 0;
      if (index >= assumptions.reserveReleaseLagMonths) {
         const pastIndex = index - assumptions.reserveReleaseLagMonths;
         let pastActivations = 0;
         if (pastIndex >= assumptions.clientActivationLagMonths) {
           pastActivations = (metrics[pastIndex - assumptions.clientActivationLagMonths].delivered || 0) * (assumptions.deliveredToActivationRate / 100);
         }
         reserveReleased = pastActivations * assumptions.clientRevenuePerActivation * (assumptions.clientPaymentReservePercent / 100);
      }
      
      const clientCashInNet = clientCashInGross - reserveHeld + reserveReleased;
      
      const ontactVariableOpex = ontactActivations * assumptions.ontactVariableOpsCostPerActivation;
      const ontactSafetyProvision = ontactActivations * assumptions.ontactSafetyProvisionPerActivation;
      
      const ontactFixedOpex = assumptions.ontactFixedOpexPerMonth;
      
      const ontactAccrualPnL = ontactAccruedClientRevenue - offernetAccruedRevenue - ontactVariableOpex - ontactFixedOpex;
      
      const netConsolidatedCashFlow = clientCashInNet - offernetMediaSpend - ontactVariableOpex - ontactFixedOpex;
      
      // AR / AP
      // Simplified: sum of differences
      
      // Need cumulative sums for AR, AP
      
      return {
        month: m.month,
        displayMonth: m.displayMonth,
        offernetFetchedLeads,
        offernetMediaSpend,
        offernetDeliveredLeads,
        offernetAccruedRevenue,
        offernetCashReceived,
        offernetAccountsReceivable: 0, // Need cumSum
        offernetAccrualPnL,
        ontactActivations,
        ontactAccruedClientRevenue,
        clientCashInGross,
        reserveHeld,
        reserveReleased,
        clientCashInNet,
        cashPaymentToOffernet,
        ontactVariableOpex,
        ontactSafetyProvision,
        ontactArEop: 0, // Need cumSum
        ontactApToOffernetEop: 0, // Need cumSum
        ontactFixedOpex,
        ontactAccrualPnL,
        netConsolidatedCashFlow,
        internalCashTransferCheck: 0,
        onvestFacilityOpeningBalance: 0,
        onvestFacilityDraws: 0,
        onvestFacilityInterest: 0,
        onvestFacilityPrincipalRepaid: 0,
        onvestFacilityEndingBalance: 0,
        consolidatedEndingCashBalance: 0,
      };
    });
  }, [metrics, assumptions]);
  
  // Now we need to do a second pass for cumulative fields and facility
  const finalLedger = useMemo(() => {
     let cumOffernetAR = 0;
     let cumOntactAR = 0;
     let cumOntactAP = 0;
     let facilityOpening = 0;
     let consolidatedCash = 0;
     
     return ledgerData.map(row => {
       cumOffernetAR += row.offernetAccruedRevenue - row.offernetCashReceived;
       cumOntactAR += row.ontactAccruedClientRevenue - row.clientCashInNet;
       cumOntactAP += row.offernetAccruedRevenue - row.cashPaymentToOffernet;
       
       const draws = row.netConsolidatedCashFlow < 0 ? Math.abs(row.netConsolidatedCashFlow) : 0;
       // Simply put, if net is negative we draw
       // If net is positive we repay
       
       const interest = facilityOpening * (assumptions.onvestFacilityCouponAnnual / 12 / 100);
       let drawsNeeded = 0;
       let principalRepaid = 0;
       
       const cashAvailable = consolidatedCash + row.netConsolidatedCashFlow - interest;
       if (cashAvailable < assumptions.rcfFundsConsolidatedCashRequirement) {
           drawsNeeded = assumptions.rcfFundsConsolidatedCashRequirement - cashAvailable;
       } else if (cashAvailable > assumptions.rcfFundsConsolidatedCashRequirement && facilityOpening > 0) {
           principalRepaid = Math.min(facilityOpening, cashAvailable - assumptions.rcfFundsConsolidatedCashRequirement);
       }
       
       const facilityEnding = facilityOpening + drawsNeeded - principalRepaid;
       const endingCash = cashAvailable + drawsNeeded - principalRepaid;
       
       const r = {
         ...row,
         offernetAccountsReceivable: cumOffernetAR,
         ontactArEop: cumOntactAR,
         ontactApToOffernetEop: cumOntactAP,
         onvestFacilityOpeningBalance: facilityOpening,
         onvestFacilityDraws: drawsNeeded,
         onvestFacilityInterest: interest,
         onvestFacilityPrincipalRepaid: principalRepaid,
         onvestFacilityEndingBalance: facilityEnding,
         consolidatedEndingCashBalance: endingCash
       };
       
       facilityOpening = facilityEnding;
       consolidatedCash = endingCash;
       return r;
     });
  }, [ledgerData, assumptions]);

  const summary = useMemo(() => {
    if (finalLedger.length === 0) return null;

    let totalOffernetAccruedRevenue = 0;
    let totalOffernetMediaSpend = 0;
    let totalOffernetAccrualPnL = 0;
    
    let totalOntactAccruedClientRevenue = 0;
    let totalOntactVariableCosts = 0;
    let totalOntactFixedOpex = 0;
    let totalOntactAccrualPnL = 0;
    
    let totalConsolidatedNetCashFlow = 0;
    
    let totalOnvestCouponInterest = 0;
    let totalOnvestPrincipalRepaid = 0;
    let maxOnvestRCFUtilisation = 0;
    let sumOnvestFacilityBalance = 0;

    finalLedger.forEach(row => {
      totalOffernetAccruedRevenue += row.offernetAccruedRevenue;
      totalOffernetMediaSpend += row.offernetMediaSpend;
      totalOffernetAccrualPnL += row.offernetAccrualPnL;
      
      totalOntactAccruedClientRevenue += row.ontactAccruedClientRevenue;
      totalOntactVariableCosts += row.ontactVariableOpex + row.ontactSafetyProvision;
      totalOntactFixedOpex += row.ontactFixedOpex;
      totalOntactAccrualPnL += row.ontactAccrualPnL;
      
      totalConsolidatedNetCashFlow += row.netConsolidatedCashFlow;
      
      totalOnvestCouponInterest += row.onvestFacilityInterest;
      totalOnvestPrincipalRepaid += row.onvestFacilityPrincipalRepaid;
      
      if (row.onvestFacilityEndingBalance > maxOnvestRCFUtilisation) {
        maxOnvestRCFUtilisation = row.onvestFacilityEndingBalance;
      }
      sumOnvestFacilityBalance += row.onvestFacilityEndingBalance;
    });

    const averageOnvestFacilityBalance = sumOnvestFacilityBalance / finalLedger.length;
    
    const maxAllowableCac = assumptions.clientRevenuePerActivation;
    const maxRatePerDeliveredLead = maxAllowableCac * (assumptions.deliveredToActivationRate / 100);
    const maxProfitableCplPerFetchedLead = maxRatePerDeliveredLead * (assumptions.fetchedToDeliveredRate / 100);

    return {
      totalOffernetAccruedRevenue,
      totalOffernetMediaSpend,
      totalOffernetAccrualPnL,
      totalOntactAccruedClientRevenue,
      totalOntactVariableCosts,
      totalOntactFixedOpex,
      totalOntactAccrualPnL,
      totalConsolidatedNetCashFlow,
      maxProfitableCplPerFetchedLead,
      selectedFetchedToDeliveredRate: assumptions.fetchedToDeliveredRate,
      selectedDeliveredToActivationRate: assumptions.deliveredToActivationRate,
      averageOnvestFacilityBalance,
      totalOnvestCouponInterest,
      totalOnvestPrincipalRepaid,
      maxOnvestRCFUtilisation
    };
  }, [finalLedger, assumptions]);

  if (loading) {
    return (
      <PageShell>
        <div className="p-8 text-center text-text-sec">Loading ledger data...</div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div className="p-8 text-center text-red-500">Error: {error}</div>
      </PageShell>
    );
  }

  const formatCurrency = (val: number) => {
    if (val < 0) {
      return `(R ${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    return formatTableCurrency(val);
  };
  const formatNum = (val: number) => formatTableNumber(Math.round(val));
  const formatPct = (val: number) => `${val.toFixed(2)}%`;

  const thClass = "px-4 py-3.5 text-right text-xs font-semibold text-text-sec uppercase tracking-wider border-b border-slate-200 whitespace-nowrap";
  const tdLabel = "px-4 py-4 whitespace-nowrap text-sm font-medium text-text-main border-b border-slate-200";
  const tdVal = "px-4 py-4 whitespace-nowrap text-sm text-right text-text-sec border-b border-slate-200 font-mono";

  return (
    <PageShell>
      <PageHeader 
        title="Consolidated Ledger & Unit Economics" 
        category="Financial Accounting & Cash Flow"
        description="Multi-entity revenue accruals, media expenditure, working capital facilities, and net cash flow model." 
      />

      {summary && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main">Model Summary</h2>
            </div>
            <div className="p-0 overflow-auto max-h-[500px]">
              <table className="min-w-full divide-y divide-slate-200">
                <tbody className="bg-white divide-y divide-slate-200">
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Offernet Accrued Revenue</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOffernetAccruedRevenue)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Offernet Media Spend</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOffernetMediaSpend)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec bg-surface-sec/50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-text-main">Offernet Accrual P&L</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-text-main font-mono">{formatCurrency(summary.totalOffernetAccrualPnL)}</td>
                  </tr>
                  <tr><td colSpan={2} className="bg-surface-sec h-2"></td></tr>
                  
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Ontact Accrued Client Revenue</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOntactAccruedClientRevenue)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Ontact Variable Costs</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOntactVariableCosts)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Ontact Fixed Opex</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOntactFixedOpex)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec bg-surface-sec/50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-text-main">Ontact Accrual P&L</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-text-main font-mono">{formatCurrency(summary.totalOntactAccrualPnL)}</td>
                  </tr>
                  <tr><td colSpan={2} className="bg-surface-sec h-2"></td></tr>

                  <tr className="hover:bg-surface-sec bg-indigo-50/30">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-text-main">Consolidated Net Cash Flow</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-teal font-mono">{formatCurrency(summary.totalConsolidatedNetCashFlow)}</td>
                  </tr>
                  <tr><td colSpan={2} className="bg-surface-sec h-2"></td></tr>

                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Max Profitable CPL (Fetched)</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.maxProfitableCplPerFetchedLead)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Selected Fetched→Delivered</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatPct(summary.selectedFetchedToDeliveredRate)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Selected Delivered→Activation</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatPct(summary.selectedDeliveredToActivationRate)}</td>
                  </tr>
                  <tr><td colSpan={2} className="bg-surface-sec h-2"></td></tr>

                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Onvest Avg Facility Balance</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.averageOnvestFacilityBalance)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Onvest Total Coupon Interest</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOnvestCouponInterest)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Onvest Total Principal Repaid</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.totalOnvestPrincipalRepaid)}</td>
                  </tr>
                  <tr className="hover:bg-surface-sec">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-text-main">Onvest Max RCF Utilisation</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-text-sec font-mono">{formatCurrency(summary.maxOnvestRCFUtilisation)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main">Cash Flow & P&L Trend</h2>
            </div>
            <div className="flex-1 p-6 min-h-[400px] flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={finalLedger.map(r => ({
                  ...r,
                  TotalCosts: -(r.offernetMediaSpend + r.ontactVariableOpex + r.ontactFixedOpex),
                  Revenue: r.ontactAccruedClientRevenue
                }))} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickFormatter={(val) => `R${(val/1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => `R ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar isAnimationActive={false} dataKey="Revenue" name="Client Revenue" fill="#10283B" stackId="a" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey="TotalCosts" name="Total Costs" fill="#f43f5e" stackId="a" radius={[0, 0, 4, 4]} />
                  <Line isAnimationActive={false} type="monotone" dataKey="netConsolidatedCashFlow" name="Net Cash Flow" stroke="#247F7D" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-surface-sec">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-text-sec uppercase tracking-wider border-b border-slate-200 sticky left-0 bg-surface-sec z-10">Month</th>
              <th className={thClass}>Offernet Fetched Leads</th>
              <th className={thClass}>Offernet Media Spend</th>
              <th className={thClass}>Offernet Delivered Leads</th>
              <th className={thClass}>Offernet Accrued Revenue</th>
              <th className={thClass}>Offernet Cash Received</th>
              <th className={thClass}>Offernet Accounts Receivable</th>
              <th className={thClass}>Offernet Accrual P&L</th>
              <th className={thClass}>Ontact Activations by Cohort Lag</th>
              <th className={thClass}>Ontact Accrued Client Revenue</th>
              <th className={thClass}>Client Cash In (Gross)</th>
              <th className={thClass}>Reserve Held</th>
              <th className={thClass}>Reserve Released</th>
              <th className={thClass}>Client Cash In (Net)</th>
              <th className={thClass}>Cash Payment to Offernet</th>
              <th className={thClass}>Ontact Variable Opex</th>
              <th className={thClass}>Ontact Safety Provision</th>
              <th className={thClass}>Ontact AR (EOP)</th>
              <th className={thClass}>Ontact AP to Offernet (EOP)</th>
              <th className={thClass}>Ontact Fixed Opex</th>
              <th className={thClass}>Ontact Accrual P&L</th>
              <th className={thClass}>Net Consolidated Cash Flow</th>
              <th className={thClass}>Internal Cash Transfer Check</th>
              <th className={thClass}>Onvest Facility Opening Balance</th>
              <th className={thClass}>Onvest Facility Draws (Consolidated)</th>
              <th className={thClass}>Onvest Facility Interest</th>
              <th className={thClass}>Onvest Facility Principal Repaid</th>
              <th className={thClass}>Onvest Facility Ending Balance</th>
              <th className={thClass}>Consolidated Ending Cash Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {finalLedger.map((row, i) => (
              <tr key={i} className="hover:bg-surface-sec">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-main border-b border-slate-200 sticky left-0 bg-white shadow-[1px_0_0_0_#e2e8f0]">{row.displayMonth}</td>
                <td className={tdVal}>{formatNum(row.offernetFetchedLeads)}</td>
                <td className={tdVal}>{formatCurrency(row.offernetMediaSpend)}</td>
                <td className={tdVal}>{formatNum(row.offernetDeliveredLeads)}</td>
                <td className={tdVal}>{formatCurrency(row.offernetAccruedRevenue)}</td>
                <td className={tdVal}>{formatCurrency(row.offernetCashReceived)}</td>
                <td className={tdVal}>{formatCurrency(row.offernetAccountsReceivable)}</td>
                <td className={tdVal}>{formatCurrency(row.offernetAccrualPnL)}</td>
                <td className={tdVal}>{formatNum(row.ontactActivations)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactAccruedClientRevenue)}</td>
                <td className={tdVal}>{formatCurrency(row.clientCashInGross)}</td>
                <td className={tdVal}>{formatCurrency(row.reserveHeld)}</td>
                <td className={tdVal}>{formatCurrency(row.reserveReleased)}</td>
                <td className={tdVal}>{formatCurrency(row.clientCashInNet)}</td>
                <td className={tdVal}>{formatCurrency(row.cashPaymentToOffernet)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactVariableOpex)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactSafetyProvision)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactArEop)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactApToOffernetEop)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactFixedOpex)}</td>
                <td className={tdVal}>{formatCurrency(row.ontactAccrualPnL)}</td>
                <td className={tdVal}>{formatCurrency(row.netConsolidatedCashFlow)}</td>
                <td className={tdVal}>{formatCurrency(row.internalCashTransferCheck)}</td>
                <td className={tdVal}>{formatCurrency(row.onvestFacilityOpeningBalance)}</td>
                <td className={tdVal}>{formatCurrency(row.onvestFacilityDraws)}</td>
                <td className={tdVal}>{formatCurrency(row.onvestFacilityInterest)}</td>
                <td className={tdVal}>{formatCurrency(row.onvestFacilityPrincipalRepaid)}</td>
                <td className={tdVal}>{formatCurrency(row.onvestFacilityEndingBalance)}</td>
                <td className={tdVal}>{formatCurrency(row.consolidatedEndingCashBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
