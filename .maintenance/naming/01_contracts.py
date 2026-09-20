from pathlib import Path
import re,json
R=Path.cwd()
def write(p,s): (R/p).parent.mkdir(parents=True,exist_ok=True);(R/p).write_text(s)
def edit(p,fn): f=R/p;f.write_text(fn(f.read_text()))
write('contracts/naming.ts', '''/** Display vocabulary only. Source columns, API IDs and vendor identity values are never renamed. */
export const NAMING_VERSION = 'cx.naming.1.0.0';
export const BRAND = { name: 'ConversionX', description: 'Lead & Revenue Analytics' } as const;
export const PAGE_TITLES: Readonly<Record<string, string>> = {
  '/reports': 'Evidence Reports', '/overview': 'Executive Overview (Legacy)', '/insights': 'Performance Changes',
  '/explore': 'Data Explorer', '/routing': 'Lead Routing', '/call-performance': 'Call Performance',
  '/speed-to-lead': 'Delivery & First-Dial Timing', '/acquisition': 'Acquisition & Media',
  '/outcomes': 'Sales, Activations & Recorded Revenue', '/sources': 'Lead Sources',
  '/lead-performance': 'Lead Funnel', '/quality': 'Lead Validation & Vetting',
  '/consumers': 'Consumer Re-entry', '/revetting': 'Re-vetting', '/cohorts': 'Lead Cohorts',
  '/explorer': 'Lead Records', '/data-trust': 'Data Checks', '/data-quality': 'Data Quality & Timestamps',
  '/data-coverage': 'Source Field Mappings', '/audit': 'Source Record Exports',
  '/validation': 'Reconciliation Status', '/admin': 'Configuration',
};
export const REPORT_COPY = {
  fetched_leads: { label: 'Fetched Leads', numeratorLabel: 'Distinct Lead Submissions', denominatorLabel: null },
  delivered_episodes: { label: 'Lead Deliveries', numeratorLabel: 'Successful Delivery Episodes', denominatorLabel: null },
  call_attempts: { label: 'Call Attempts', numeratorLabel: 'Observed Dialler Events', denominatorLabel: null },
  called_episodes: { label: 'Dialled Lead Deliveries', numeratorLabel: 'Delivered Episodes with a Subsequent Call', denominatorLabel: null },
  call_coverage: { label: 'Delivery-to-Dial Rate', numeratorLabel: 'Delivered Episodes with a Subsequent Call', denominatorLabel: 'Successful Delivery Episodes' },
  sale_events: { label: 'Sales (Recorded Events)', numeratorLabel: 'Distinct Sale Events', denominatorLabel: null },
  activation_events: { label: 'Activations (Recorded Events)', numeratorLabel: 'Distinct Activation Events', denominatorLabel: null },
  sale_activation_rate: { label: 'Sale-to-Activation Rate', numeratorLabel: 'Sales with at Least One Activation', denominatorLabel: 'Distinct Sale Events' },
  expected_value: { label: 'Expected Value', numeratorLabel: 'Signed Expected-Value Changes', denominatorLabel: null },
  approved_value: { label: 'Approved Value', numeratorLabel: 'Signed Approved-Value Changes', denominatorLabel: null },
  invoiced_value: { label: 'Invoiced Amount', numeratorLabel: 'Signed Invoice Changes', denominatorLabel: null },
  collected_value: { label: 'Collected Amount', numeratorLabel: 'Signed Collection Changes', denominatorLabel: null },
} as const;
export const LEGACY_LABELS = {
  leads: 'Fetched Leads', valid: 'Valid Leads (Recorded Flag)', delivered: 'Delivered Leads', called: 'Dialled Leads',
  rpcs: 'Leads with RPC', sales: 'Leads with Sales', billable_sales: 'Leads with Sales and Recorded Revenue',
  activations: 'Leads with Activations', revenue: 'Recorded Revenue',
  delivery_rate: 'Fetched-to-Delivered Lead Rate', dial_rate: 'Fetched-to-Dialled Lead Rate',
  call_coverage: 'Dialled / Delivered Leads', rpc_rate: 'RPC / Dialled Leads',
  sale_rate: 'Sales / Dialled Leads', lead_to_sale_rate: 'Sales / Fetched Leads',
  billable_sale_rate: 'Revenue-Matched Sales / Sales', activation_rate: 'Activations / Sales (Lead Counts)',
  activation_revenue_rate: 'Activations / Revenue-Matched Sales (Lead Counts)',
  revenue_per_lead: 'Recorded Revenue per Fetched Lead', revenue_per_sale: 'Recorded Revenue per Lead with a Sale',
  calls_per_lead: 'Call Attempts per Fetched Lead', calls_per_called_lead: 'Call Attempts per Dialled Lead',
  total_calls: 'Recorded Call Attempts', one_call_leads: 'Leads with One Call Attempt', repeat_call_leads: 'Leads with Repeat Call Attempts',
  one_call_rate: 'One-Call Lead Share', repeat_call_rate: 'Repeat-Call Lead Share',
} as const;
export const DIMENSION_LABELS = { date: 'Capture Date', week: 'Capture Week', month: 'Capture Month',
  source: 'Lead Source', medium: 'Traffic Medium', vendor: 'Vendor', hour: 'Capture Hour', weekday: 'Capture Weekday',
  calls_bucket: 'Call-Attempt Band' } as const;
export const FIELD_LABELS: Readonly<Record<string, string>> = {
  entity_key: 'Record Key', lead_key: 'Lead Key', source_record_id: 'Source Record ID', batch_id: 'Ingestion Batch ID',
  captured_at: 'Capture Timestamp (UTC)', event_at: 'Event Timestamp (UTC)', source: 'Lead Source', medium: 'Traffic Medium', vendor: 'Vendor',
};
''')
write('contracts/legacyMetrics.ts', '''import { LEGACY_LABELS as L } from './naming';
/** A description of the existing lead-grain queries, not certification of those queries. */
export interface LegacyMetricDefinition {
  id: string; canonicalName: string; reportValue: string; metric: string; definition: string;
  numerator: string; denominator: string; numeratorLabel: string; denominatorLabel: string | null;
  source: string; grain: string; unit: 'records' | 'percent' | 'currency' | 'calls_per_lead';
  waterfallMetricFormula: string; costMetric?: string; costMetricFormula?: string;
  itemNo?: number; formattedItemNo?: string; channel?: string; revenueMetric?: string;
  costOfRevenueMetric?: string; costOfRevenueMetricFormula?: string;
  mappingStatus: 'LEGACY_UNVERIFIED' | 'UNAVAILABLE';
}
function metric(id: string, label: string, numerator: string, numeratorLabel: string,
  denominator = 'N/A', denominatorLabel: string | null = null,
  unit: LegacyMetricDefinition['unit'] = 'records', definition = ''): LegacyMetricDefinition {
  return { id, canonicalName: label, reportValue: label, metric: label, numerator, denominator, numeratorLabel, denominatorLabel,
    source: 'vw_leads', grain: 'lead', unit, mappingStatus: 'LEGACY_UNVERIFIED',
    waterfallMetricFormula: denominatorLabel ? `${numeratorLabel} / ${denominatorLabel}${unit === 'percent' ? ' × 100' : ''}` : 'Not applicable: this is a count or amount.',
    definition: definition || `${numeratorLabel}${denominatorLabel ? ' / ' + denominatorLabel : ''}. Legacy source flags are not independently verified.` };
}
const lead = 'COUNT(DISTINCT lead_id)', dial = 'COUNTIF(has_call = true)', sale = 'COUNTIF(has_sale = true)';
const core = {
  total_leads: metric('total_leads', L.leads, lead, L.leads),
  valid_leads: metric('valid_leads', L.valid, 'COUNTIF(valid_lead = true)', L.valid),
  delivered_leads: metric('delivered_leads', L.delivered, 'COUNTIF(has_delivery = true)', L.delivered),
  called_leads: metric('called_leads', L.called, dial, L.called),
  rpcs: metric('rpcs', L.rpcs, 'COUNTIF(has_rpc = true)', L.rpcs, 'N/A', null, 'records', 'Lead-level RPC flags, including any source-model inferences. Not a count of answered calls or independently verified contacts.'),
  sales: metric('sales', L.sales, sale, L.sales),
  sales_with_revenue: metric('sales_with_revenue', L.billable_sales, 'COUNTIF(has_billable_sale = true)', L.billable_sales, 'N/A', null, 'records', 'Leads with a sale and positive matched recorded revenue. This does not establish sale delivery, contractual billability, invoicing or collection.'),
  activations: metric('activations', L.activations, 'COUNTIF(has_activation = true)', L.activations),
  revenue: metric('revenue', L.revenue, 'SUM(IFNULL(total_revenue, 0))', L.revenue, 'N/A', null, 'currency', 'Expected or recorded revenue from the legacy source model; not verified approved, invoiced or collected value.'),
  delivery_rate: metric('delivery_rate', L.delivery_rate, 'COUNTIF(has_delivery = true)', L.delivered, lead, L.leads, 'percent'),
  dial_rate: metric('dial_rate', L.dial_rate, dial, L.called, lead, L.leads, 'percent'),
  call_coverage: metric('call_coverage', L.call_coverage, dial, L.called, 'COUNTIF(has_delivery = true)', L.delivered, 'percent', 'Ratio of dialled lead flags to delivered lead flags. Unlike v2 delivery coverage, this legacy ratio does not independently enforce a common episode population.'),
  rpc_rate: metric('rpc_rate', L.rpc_rate, 'COUNTIF(has_rpc = true)', L.rpcs, dial, L.called, 'percent'),
  sale_rate: metric('sale_rate', L.sale_rate, sale, L.sales, dial, L.called, 'percent'),
  lead_to_sale_rate: metric('lead_to_sale_rate', L.lead_to_sale_rate, sale, L.sales, lead, L.leads, 'percent'),
  billable_sale_rate: metric('billable_sale_rate', L.billable_sale_rate, 'COUNTIF(has_billable_sale = true)', L.billable_sales, sale, L.sales, 'percent'),
  activation_rate: metric('activation_rate', L.activation_rate, 'COUNTIF(has_activation = true)', L.activations, sale, L.sales, 'percent'),
  revenue_per_lead: metric('revenue_per_lead', L.revenue_per_lead, 'SUM(IFNULL(total_revenue, 0))', L.revenue, lead, L.leads, 'currency'),
  revenue_per_sale: metric('revenue_per_sale', L.revenue_per_sale, 'SUM(IFNULL(total_revenue, 0))', L.revenue, sale, L.sales, 'currency'),
  total_calls: metric('total_calls', L.total_calls, 'SUM(IFNULL(total_calls, 0))', L.total_calls),
  calls_per_lead: metric('calls_per_lead', L.calls_per_lead, 'SUM(IFNULL(total_calls, 0))', L.total_calls, lead, L.leads, 'calls_per_lead'),
  calls_per_called_lead: metric('calls_per_called_lead', L.calls_per_called_lead, 'SUM(IFNULL(total_calls, 0))', L.total_calls, dial, L.called, 'calls_per_lead'),
  one_call_leads: metric('one_call_leads', L.one_call_leads, 'COUNTIF(total_calls = 1)', L.one_call_leads),
  repeat_call_leads: metric('repeat_call_leads', L.repeat_call_leads, 'COUNTIF(total_calls > 1)', L.repeat_call_leads),
};
function unavailable(id: string, label: string, reason: string): LegacyMetricDefinition {
  return { ...metric(id, label, 'CAST(NULL AS INT64)', label, 'N/A', null, 'records', reason),
    mappingStatus: 'UNAVAILABLE', source: 'No validated source mapping', waterfallMetricFormula: 'Unavailable: no validated mapping.' };
}
export const LEGACY_METRICS: Record<string, LegacyMetricDefinition> = {
  ...core,
  fetched_leads: core.total_leads, dialed_leads: core.called_leads, dialled_leads: core.called_leads, lead_dial_rate: core.call_coverage,
  standardised_leads: unavailable('standardised_leads','Standardised Leads','Requires a standardisation event; a validity flag is not evidence of standardisation.'),
  qualified_leads: unavailable('qualified_leads','Qualified Leads','Requires an approved qualification rule; valid data is not necessarily a qualified lead.'),
  answered_calls: unavailable('answered_calls','Answered Calls','Requires observed answer dispositions at call-event grain; RPC or positive duration alone is not an answer-event mapping.'),
  answer_rate: unavailable('answer_rate','Call Answer Rate','Requires answered call attempts / all eligible call attempts. No validated answer-event mapping is available.'),
  delivered_sales: unavailable('delivered_sales','Delivered Sales','Requires an observed sale-delivery event. Positive revenue is not evidence of sale delivery.'),
  sales_payment_collected: unavailable('sales_payment_collected','Sales Payment Collections','Requires observed payment transactions; positive expected revenue is not payment evidence.'),
  premium_collections: unavailable('premium_collections','Premium Collections','Requires premium payment records; recorded lead revenue is not a premium collection.'),
  lifetime_value: unavailable('lifetime_value','Customer Lifetime Value','Requires a defined customer lifetime, retention and value model; revenue per lead is not lifetime value.'),
  duplicate_leads: unavailable('duplicate_leads','Duplicate Leads','Requires a validated duplicate classification; failed validation is not necessarily duplication.'),
  duplicate_rate: unavailable('duplicate_rate','Duplicate Lead Rate','Requires duplicate leads / evaluated leads; unavailable does not mean zero.'),
};
/** These expression strings are unchanged from the existing dynamic query engine. */
export const EXPLORER_EXPRESSIONS: Record<string, string> = {
  leads: 'COUNT(*)', delivered: 'COUNTIF(has_delivery)', called: 'COUNTIF(has_call)', rpcs: 'COUNTIF(has_rpc)',
  sales: 'COUNTIF(has_sale)', billable_sales: 'COUNTIF(has_billable_sale)', activations: 'COUNTIF(has_activation)', revenue: 'SUM(total_revenue)',
  delivery_rate: '100 * SAFE_DIVIDE(COUNTIF(has_delivery), COUNT(*))', dial_rate: '100 * SAFE_DIVIDE(COUNTIF(has_call), COUNT(*))',
  call_coverage: '100 * SAFE_DIVIDE(COUNTIF(has_call), COUNTIF(has_delivery))', rpc_rate: '100 * SAFE_DIVIDE(COUNTIF(has_rpc), COUNTIF(has_call))',
  sale_rate: '100 * SAFE_DIVIDE(COUNTIF(has_sale), COUNTIF(has_call))', lead_to_sale_rate: '100 * SAFE_DIVIDE(COUNTIF(has_sale), COUNT(*))',
  billable_sale_rate: '100 * SAFE_DIVIDE(COUNTIF(has_billable_sale), COUNTIF(has_sale))', activation_rate: '100 * SAFE_DIVIDE(COUNTIF(has_activation), COUNTIF(has_sale))',
  revenue_per_lead: 'SAFE_DIVIDE(SUM(total_revenue), COUNT(*))', revenue_per_sale: 'SAFE_DIVIDE(SUM(total_revenue), COUNTIF(has_sale))', calls_per_lead: 'SAFE_DIVIDE(SUM(total_calls), COUNT(*))',
};
const keys: Record<string,string> = { leads:'total_leads', delivered:'delivered_leads', called:'called_leads', billable_sales:'sales_with_revenue' };
export const EXPLORER_METRICS = Object.keys(EXPLORER_EXPRESSIONS).map(id => {
  const m = LEGACY_METRICS[keys[id] || id];
  return { id, label: m.canonicalName + (m.unit === 'percent' ? ' (%)' : ''), unit: m.unit,
    additive: m.denominator === 'N/A', definition: m.definition, formula: m.waterfallMetricFormula };
});
export function formatExplorerValue(value: unknown, id: string, currency = 'ZAR'): string {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Unavailable';
  const m = EXPLORER_METRICS.find(x => x.id === id);
  const number = Number(value).toLocaleString('en-ZA', { maximumFractionDigits: m?.unit === 'records' ? 0 : 2 });
  return `${m?.unit === 'currency' ? currency + ' ' : ''}${number}${m?.unit === 'percent' ? '%' : ''}`;
}
''')
write('src/lib/metrics.ts', '''/** Runtime legacy descriptions share one source with the server; journey taxonomy is reference-only. */
export { LEGACY_METRICS as METRICS } from '../../contracts/legacyMetrics';
export type { LegacyMetricDefinition as MetricDefinition } from '../../contracts/legacyMetrics';
export { MASTER_TAXONOMY, TAXONOMY_BY_ITEM_NO, getTaxonomyItem } from './taxonomy';
export type { MetricTaxonomyItem } from './taxonomy';
''')
write('server/bigquery/metrics.ts', "export { LEGACY_METRICS as METRIC_DEFINITIONS } from '../../contracts/legacyMetrics';\n")
s=(R/'src/lib/taxonomy.ts').read_text()
s=s.replace('Deduplicatin','Deduplication').replace('Dialed','Dialled').replace('dialed','dialled').replace('Internal DeDuped Leads','Internally Deduplicated Leads').replace('Sales payment collected','Sales Payment Collections').replace('Life Time','Lifetime').replace('Right party','Right-Party').replace('Right Party','Right-Party').replace('Premium Collection rate','Premium Collection Rate')
s="/** Journey reference catalogue, not a runtime metric mapping or evidence of availability. Item numbers are preserved. */\n"+s
write('contracts/taxonomy.ts',s)
write('src/lib/taxonomy.ts', "export * from '../../contracts/taxonomy';\n")
write('server/bigquery/taxonomy.ts', "export * from '../../contracts/taxonomy';\n")
p='contracts/reporting.ts';s=(R/p).read_text();s="import { REPORT_COPY } from './naming';\n"+s
s=s.replace("'cx.metrics.2.0.0'","'cx.metrics.2.0.1'")
s=s.replace('id: string; label: string; grain: string; definition: string;', 'id: string; label: string; grain: string; definition: string;\n  numeratorLabel: string; denominatorLabel: string | null; formula: string;')
s=s.replace('export const METRICS: readonly MetricDefinition[] = [','const metricDefinitions = [')
pos=s.index('export const METRIC_BY_ID')
s=s[:pos]+'''export const METRICS: readonly MetricDefinition[] = metricDefinitions.map(m => {
  const copy = REPORT_COPY[m.id as keyof typeof REPORT_COPY];
  return { ...m, ...copy, formula: copy.denominatorLabel
    ? `${copy.numeratorLabel} / ${copy.denominatorLabel} × 100`
    : m.aggregation === 'decimal_sum' ? `Sum of ${copy.numeratorLabel.toLowerCase()} in the selected currency` : `Count of ${copy.numeratorLabel.toLowerCase()}` } as MetricDefinition;
});
'''+s[pos:]
write(p,s)
p='server/bigquery/semantic_engine.ts';s=(R/p).read_text();a=s.index('export const ALLOWED_METRICS:');b=s.index('export const getAllowedDimensions',a)
s=s[:a]+"import { EXPLORER_EXPRESSIONS, EXPLORER_METRICS } from '../../contracts/legacyMetrics';\nexport const ALLOWED_METRICS = EXPLORER_EXPRESSIONS;\n"+s[b:]
s=s.replace('metadata: { metric: input.metric,', 'metadata: { metricDefinition: EXPLORER_METRICS.find(m => m.id === input.metric), metric: input.metric,')
write(p,s)
p='server/reporting/service.ts';s=(R/p).read_text();s=s.replace('sourceBatchIds: release.sourceBatchIds, totals, groups,', 'sourceBatchIds: release.sourceBatchIds, metricDefinitions: request.metrics.map(id => METRIC_BY_ID[id]), totals, groups,')
s=s.replace('metricId: metric, group, rows:', 'metricId: metric, metricDefinition: METRIC_BY_ID[metric], group, rows:')
write(p,s)
edit('contracts/reporting.ts',lambda s:s.replace('generatedAt: string; validation:', 'metricDefinitions: MetricDefinition[]; generatedAt: string; validation:'))
edit('scripts/engine-stamp.cjs',lambda s:s.replace("['contracts/reporting.ts',","['contracts/reporting.ts','contracts/naming.ts',"))
for p in ['package.json','package-lock.json']:
 edit(p,lambda s:s.replace('"name": "react-example"','"name": "conversionx"'))
