import * as legacy from './queries';
import { getBigQueryClient } from './client';
import { getClientConfig } from './config';
import { getBaseSemanticLayer } from './views';
import { buildLeadWhere, RequestError, type QueryScope } from './filters';
import { maturityValue } from './integrity';

export async function getOverviewStats(scope: QueryScope) {
  const data = await legacy.getOverviewStats(scope);
  return { ...data, reportedMediaBudget: data.spend, spend: null, cpa: null, roas: null,
    spendStatus: 'NOT_VERIFIED', spendReason: 'The budget field is not yet confirmed as incurred and allocated spend.',
    activationRate: data.sales > 0 ? 100 * data.activations / data.sales : null,
    attentionItems: data.attentionItems.map(item => item.id === 'unbilled_sales' ? { ...item, title: 'Sales without matched revenue', severity: 'warning',
      magnitude: `${data.unbilledSales} sales lack positive matched revenue`, reason: 'This may reflect missing reporting, timing differences, or non-billable outcomes. It is not proof of lost revenue.' } : item),
    dataReadiness: Object.fromEntries(Object.keys(data.dataReadiness).map(key => [key, 'NOT_VERIFIED'])) };
}
export async function getQualityStats(scope: QueryScope) {
  const data = await legacy.getQualityStats(scope);
  return { ...data, avgScore: null, grades: [{ name: 'Passed validation', value: data.passed }, { name: 'Failed validation', value: data.failed }],
    vetting: [{ name: 'Passed validation', value: data.passed }, { name: 'Failed validation', value: data.failed }],
    reasons: [{ reason: 'Failed validation; cause not classified', count: data.failed, percentage: data.total ? 100 * data.failed / data.total : null }] };
}
export function validationUnavailable() {
  return { overallStatus: 'NOT_VERIFIED', reconciledAt: null, chain: 'Independent raw/API/UI reconciliation has not run.',
    metrics: ['Unique Leads', 'Delivered Leads', 'Called Leads', 'RPC', 'Sales', 'Activations', 'Recorded Revenue'].map(metric => ({
      metric, rawBigQuery: null, semanticModel: null, apiPayload: null, uiRendered: null, status: 'NOT_VERIFIED', grain: 'Not independently checked',
      discrepancy: 'No independent measurements are available. Semantic values are not copied into other layers.', explanation: 'Live reconciliation remains a release requirement.' })) };
}
export async function getCohortStats(scope: QueryScope & { cohortType?: string; metricType?: string }) {
  const client = getClientConfig(scope.clientId), { sql, queryParams } = buildLeadWhere(scope);
  const cohortType = scope.cohortType || 'weekly', metricType = scope.metricType || 'sale';
  const groups: Record<string, string> = { daily: 'CAST(capture_date AS STRING)', weekly: "FORMAT_DATE('%G-W%V', capture_date)", monthly: "FORMAT_DATE('%Y-%m', capture_date)" };
  const events: Record<string, [string, string]> = { sale: ['has_sale', 'sale_timestamp'], activation: ['has_activation', 'activation_timestamp'], call_coverage: ['has_call', 'first_call_timestamp'] };
  if (!Object.hasOwn(groups, cohortType) || !Object.hasOwn(events, metricType)) throw new RequestError('Cohort metric requires an observed event timestamp. Supported: sale, activation, call_coverage.', 422);
  const [flag, event] = events[metricType];
  const cutoff = new Date().toISOString().slice(0, 10);
  const days = [0, 1, 3, 7, 14, 30];
  const maturation = days.map(day => `COUNTIF(${flag} AND ${event} >= capture_timestamp AND DATE(${event}) <= @cutoff AND DATE_DIFF(DATE(${event}), capture_date, DAY) <= ${day}) AS m_d${day}`).join(', ');
  const query = `${getBaseSemanticLayer(client)} SELECT ${groups[cohortType]} AS cohort, CAST(MAX(capture_date) AS STRING) AS cohort_end,
    COUNT(*) AS size, COUNTIF(has_delivery) AS delivered, COUNTIF(has_call) AS called, COUNTIF(has_rpc) AS rpcs, COUNTIF(has_sale) AS sales,
    COUNTIF(has_billable_sale) AS billable_sales, COUNTIF(has_activation) AS activations, SUM(total_revenue) AS revenue,
    COUNTIF(${flag} AND ${event} IS NULL) AS missing_event_timestamps, ${maturation}
    FROM vw_leads ${sql} GROUP BY cohort ORDER BY cohort DESC LIMIT 1000`;
  const [rows] = await getBigQueryClient(client.bigQueryProject).query({ query, params: { ...queryParams, cutoff } });
  return rows.map((r: any) => {
    const size = Number(r.size), sales = Number(r.sales), called = Number(r.called), billableSales = Number(r.billable_sales), revenue = Number(r.revenue) || 0;
    const rate = (n: unknown, d: number) => d > 0 ? 100 * Number(n) / d : null;
    return { cohort: r.cohort, size, delivered: Number(r.delivered), called, rpcs: Number(r.rpcs), sales, billableSales, activations: Number(r.activations), revenue,
      deliveryRate: rate(r.delivered, size), callRate: rate(called, size), callCoverage: rate(called, Number(r.delivered)), rpcRate: rate(r.rpcs, called),
      saleRate: rate(sales, called), leadToSaleRate: rate(sales, size), billableSaleRate: rate(billableSales, sales), activationRate: rate(r.activations, sales), revPerLead: size ? revenue / size : null,
      missingEventTimestamps: Number(r.missing_event_timestamps), observationCutoff: cutoff,
      metrics: Object.fromEntries(days.map(day => [`d${day}`, maturityValue(rate(r[`m_d${day}`], size), r.cohort_end, cutoff, day)])) };
  });
}

export async function getLeadTimeline(scope: QueryScope & { leadId: string }) {
  const client = getClientConfig(scope.clientId), { sql, queryParams } = buildLeadWhere(scope);
  const query = `${getBaseSemanticLayer(client)}, selected_leads AS (SELECT lead_id FROM vw_leads ${sql})
    SELECT t.capture_timestamp, t.delivery_timestamp, t.first_call_timestamp, t.sale_timestamp, t.activation_timestamp,
      t.vendor, t.transaction_id, t.rpc, t.sale, t.activation, t.total_calls, t.latest_dialer_status
    FROM vw_lead_vendor_transactions t JOIN selected_leads USING(lead_id)
    WHERE CAST(t.lead_id AS STRING) = @leadId ORDER BY t.capture_timestamp, t.delivery_timestamp`;
  const [rows] = await getBigQueryClient(client.bigQueryProject).query({ query, params: { ...queryParams, leadId: scope.leadId } });
  return rows;
}
