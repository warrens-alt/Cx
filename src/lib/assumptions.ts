export interface Assumptions {
  clientRevenuePerActivation: number;
  offernetFeePerDeliveredLead: number;
  clientActivationLagMonths: number;
  ontactToOffernetPaymentLagMonths: number;
  ontactVariableOpsCostPerActivation: number;
  ontactSafetyProvisionPerActivation: number;
  plannedMediaCplPerFetchedLead: number;
  fetchedToDeliveredRate: number;
  deliveredToActivationRate: number;
  clientPaymentReservePercent: number;
  reserveReleaseLagMonths: number;
  ontactFixedOpexPerMonth: number;
  vatRate: number;
  offernetFeePerActivation: number;
  rcfFundsConsolidatedCashRequirement: number;
  onvestRevolvingCreditFacilityLimit: number;
  onvestFacilityCouponAnnual: number;
}

export const defaultAssumptions: Assumptions = {
  clientRevenuePerActivation: 100.00,
  offernetFeePerDeliveredLead: 50.00,
  clientActivationLagMonths: 2,
  ontactToOffernetPaymentLagMonths: 0,
  ontactVariableOpsCostPerActivation: 0,
  ontactSafetyProvisionPerActivation: 0,
  plannedMediaCplPerFetchedLead: 0,
  fetchedToDeliveredRate: 21.88,
  deliveredToActivationRate: 0.90,
  clientPaymentReservePercent: 0,
  reserveReleaseLagMonths: 0,
  ontactFixedOpexPerMonth: 137784.35,
  vatRate: 0,
  offernetFeePerActivation: 0,
  rcfFundsConsolidatedCashRequirement: 100.00,
  onvestRevolvingCreditFacilityLimit: 500000.00,
  onvestFacilityCouponAnnual: 0,
};

export const loadAssumptions = (): Assumptions => {
  const saved = localStorage.getItem('assumptions');
  if (saved) {
    try {
      return { ...defaultAssumptions, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
  }
  return defaultAssumptions;
};

export const saveAssumptions = (assumptions: Assumptions) => {
  localStorage.setItem('assumptions', JSON.stringify(assumptions));
};
