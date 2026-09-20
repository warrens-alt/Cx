import { useClient } from '../lib/ClientContext';
import React, { useState, useEffect } from 'react';
import { Calculator, Save, DollarSign, Percent, Clock } from 'lucide-react';
import { Assumptions, loadAssumptions, saveAssumptions } from '../lib/assumptions';

export default function AssumptionsPage() {
  const { clientConfig } = useClient();
  const currencyPrefix = clientConfig?.currency === 'ZAR' ? 'R ' : clientConfig?.currency === 'GBP' ? '£' : '$';
  const [data, setData] = useState<Assumptions>(loadAssumptions());

  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateField = (field: keyof Assumptions, value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveAssumptions(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const endToEndActivationRate = (data.fetchedToDeliveredRate / 100) * (data.deliveredToActivationRate / 100) * 100;
  const onvestFacilityCouponMonthly = data.onvestFacilityCouponAnnual / 12;

  const maxAllowableCac = data.clientRevenuePerActivation;
  const maxRatePerDeliveredLead = maxAllowableCac * (data.deliveredToActivationRate / 100);
  const maxCplPerFetchedLead = maxRatePerDeliveredLead * (data.fetchedToDeliveredRate / 100);

  const formatCurrency = (val: number) => `R ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-page-title">Assumptions & Scenario Controls</h1>
          <p className="text-text-sec mt-1">Configure pricing, lag times, and facility limits.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all">
              ✓ Assumptions saved
            </span>
          )}
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="enterprise-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-text-sec" />
                Revenue & Cost Controls
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Client Revenue per Activation" value={data.clientRevenuePerActivation} onChange={v => updateField('clientRevenuePerActivation', v)} prefix={currencyPrefix} />
              <InputField label="Offernet Fee per Delivered Lead" value={data.offernetFeePerDeliveredLead} onChange={v => updateField('offernetFeePerDeliveredLead', v)} prefix={currencyPrefix} />
              <InputField label="Ontact Variable Ops Cost per Activation" value={data.ontactVariableOpsCostPerActivation} onChange={v => updateField('ontactVariableOpsCostPerActivation', v)} prefix={currencyPrefix} />
              <InputField label="Ontact Safety Provision per Activation" value={data.ontactSafetyProvisionPerActivation} onChange={v => updateField('ontactSafetyProvisionPerActivation', v)} prefix={currencyPrefix} />
              <InputField label="Planned Media CPL per Fetched Lead" value={data.plannedMediaCplPerFetchedLead} onChange={v => updateField('plannedMediaCplPerFetchedLead', v)} prefix={currencyPrefix} />
              <InputField label="Offernet Fee per Activation" value={data.offernetFeePerActivation} onChange={v => updateField('offernetFeePerActivation', v)} prefix={currencyPrefix} />
              <InputField label="Ontact Fixed Opex per Month" value={data.ontactFixedOpexPerMonth} onChange={v => updateField('ontactFixedOpexPerMonth', v)} prefix={currencyPrefix} />
            </div>
          </div>

          <div className="enterprise-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main flex items-center gap-2">
                <Percent className="w-4 h-4 text-text-sec" />
                Conversion Rates
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Fetched → Delivered Rate" value={data.fetchedToDeliveredRate} onChange={v => updateField('fetchedToDeliveredRate', v)} suffix="%" />
              <InputField label="Delivered → Activation Rate" value={data.deliveredToActivationRate} onChange={v => updateField('deliveredToActivationRate', v)} suffix="%" />
              <InputField label="Client Payment Reserve" value={data.clientPaymentReservePercent} onChange={v => updateField('clientPaymentReservePercent', v)} suffix="%" />
              <InputField label="VAT Rate" value={data.vatRate} onChange={v => updateField('vatRate', v)} suffix="%" />
            </div>
          </div>

          <div className="enterprise-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-sec" />
                Timing & Lags
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Client Activation Lag" value={data.clientActivationLagMonths} onChange={v => updateField('clientActivationLagMonths', v)} suffix="Months" />
              <InputField label="Ontact → Offernet Payment Lag" value={data.ontactToOffernetPaymentLagMonths} onChange={v => updateField('ontactToOffernetPaymentLagMonths', v)} suffix="Months" />
              <InputField label="Reserve Release Lag" value={data.reserveReleaseLagMonths} onChange={v => updateField('reserveReleaseLagMonths', v)} suffix="Months" />
            </div>
          </div>
          
          <div className="enterprise-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-surface-sec">
              <h2 className="font-semibold text-text-main flex items-center gap-2">
                <Calculator className="w-4 h-4 text-text-sec" />
                Onvest Facility
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <InputField label="RCF Funds Consolidated Cash Requirement" value={data.rcfFundsConsolidatedCashRequirement} onChange={v => updateField('rcfFundsConsolidatedCashRequirement', v)} prefix={currencyPrefix} />
               <InputField label="Revolving Credit Facility Limit" value={data.onvestRevolvingCreditFacilityLimit} onChange={v => updateField('onvestRevolvingCreditFacilityLimit', v)} prefix={currencyPrefix} />
               <InputField label="Facility Coupon Annual" value={data.onvestFacilityCouponAnnual} onChange={v => updateField('onvestFacilityCouponAnnual', v)} suffix="%" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg sticky top-6">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              Calculated Metrics
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm text-text-mute mb-1">End-to-End Activation Rate</p>
                <p className="text-2xl font-bold">{formatPercent(endToEndActivationRate)}</p>
              </div>
              
              <div className="pt-6 border-t border-slate-800">
                <p className="text-sm text-text-mute mb-1">Max Allowable CAC</p>
                <p className="text-2xl font-bold">{formatCurrency(maxAllowableCac)}</p>
              </div>
              
              <div>
                <p className="text-sm text-text-mute mb-1">Max Rate per Delivered Lead</p>
                <p className="text-xl font-bold text-indigo-300">{formatCurrency(maxRatePerDeliveredLead)}</p>
              </div>
              
              <div>
                <p className="text-sm text-text-mute mb-1">Max CPL per Fetched Lead</p>
                <p className="text-xl font-bold text-indigo-300">{formatCurrency(maxCplPerFetchedLead)}</p>
              </div>
              
              <div className="pt-6 border-t border-slate-800">
                <p className="text-sm text-text-mute mb-1">Onvest Facility Coupon (Monthly)</p>
                <p className="text-xl font-bold text-slate-300">{formatPercent(onvestFacilityCouponMonthly)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  prefix, 
  suffix 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-text-mute text-sm font-medium">{prefix}</span>
          </div>
        )}
        <input
          type="number"
          className={`block w-full rounded-lg border border-slate-200 bg-surface-sec text-text-main focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all sm:text-sm p-2.5 outline-none
            ${prefix ? 'pl-8' : 'pl-3'} 
            ${suffix ? 'pr-12' : 'pr-3'}
          `}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-text-mute text-sm font-medium">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
}
