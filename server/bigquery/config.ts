export interface TenantConfiguration {
  id: string;
  name: string;
  active: boolean;
  currency: string;
  timezone: string;
  
  bigQueryProject: string;
  bigQueryDatasets: string[];
  
  dataSourceMode: 'separate' | 'shared';
  sharedTenantIdField?: string;
  sharedTenantIdValue?: string;
  
  capabilities: {
    marketing: boolean;
    leads: boolean;
    calls: boolean;
    sales: boolean;
    activation: boolean;
    revenue: boolean;
  };
  
  semanticMappings: {
    tables: {
      leads: string;
      marketing?: string;
      calls?: string;
      timeToDial?: string;
      activations?: string;
    };
    fields: Record<string, string>;
    partners?: string[];
  };
  
  branding?: {
    logoUrl?: string;
    accentColor?: string;
  };
}

const TENANTS: Record<string, TenantConfiguration> = {
  'default_tenant': {
    id: 'default_tenant',
    name: 'Primary Tenant',
    active: true,
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    bigQueryProject: 'dashboards-422710',
    bigQueryDatasets: ['lead_ledger'],
    dataSourceMode: 'separate',
    capabilities: {
      marketing: true,
      leads: true,
      calls: true,
      sales: true,
      activation: true,
      revenue: true
    },
    semanticMappings: {
      tables: {
        leads: 'dashboards-422710.lead_ledger.clustered_lead_ledger',
        marketing: 'dashboards-422710.lead_ledger.lead_ledger_platform_insights',
        calls: 'dashboards-422710.lead_ledger.lead_ledger_all_vicidial_insights',
        timeToDial: 'dashboards-422710.lead_ledger.lead_ledger_all_vicidial_insights_time_to_dial',
        activations: 'dashboards-422710.lead_ledger.tbl_blc_activations'
      },
      fields: {},
      partners: [
        'blc', 'mtn', 'mondo', 'realpromotions', 'bizvoip', 
        'debtrescue', 'naga', 'bmi_loans_african_bank', 'urbanrewards', 
        'dischem', 'getsavvi', 'rewardsco', 'oneplan_pet', 
        'oneplan_medical', 'affiliate'
      ]
    }
  }
};

export const ROR_PARTNER_TO_VENDOR_MAP: Record<string, string> = {
  'BLC': 'Ontact - BLC',
  'MTN': 'MTN',
  'MONDO': 'Mondo',
  'REALPROMOTIONS': 'Real Promotions',
  'BIZVOIP': 'Ontact - Vodacom (BizVoip)',
  'DEBTRESCUE': 'Debt Rescue',
  'NAGA': 'Naga',
  'BMI_LOANS_AFRICAN_BANK': 'African Bank',
  'AFRICAN_BANK': 'African Bank',
  'URBANREWARDS': 'Urban Rewards',
  'DISCHEM': 'Dis-Chem',
  'GETSAVVI': 'GetSavvi',
  'REWARDSCO': 'RewardsCo - Motor Warranty',
  'ONEPLAN_PET': 'One Plan - Pet',
  'ONEPLAN_MEDICAL': 'One Plan - Health',
  'AFFILIATE': 'Affiliate'
};

export function getClientConfig(clientId: string): TenantConfiguration {
  const tenant = TENANTS[clientId] || Object.values(TENANTS)[0];
  if (!tenant.active) {
    throw new Error(`Tenant ${clientId} is inactive.`);
  }
  return tenant;
}

export function getAllClients(): TenantConfiguration[] {
  return Object.values(TENANTS).filter(c => c.active);
}

export function validateEnvironment() {
  if (process.env.NODE_ENV === 'production' && process.env.USE_MOCK_DATA === 'true') {
    console.error("CRITICAL ERROR: USE_MOCK_DATA is true in production.");
    process.exit(1);
  }
}
