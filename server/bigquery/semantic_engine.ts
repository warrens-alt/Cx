import { getBigQueryClient } from './client';
import { getClientConfig } from './config';
import { getBaseSemanticLayer } from './views';
import { buildLeadWhere, validateScope, RequestError, type QueryScope } from './filters';
import { finiteOrNull } from './integrity';
import { EXPLORER_EXPRESSIONS, EXPLORER_METRICS } from '../../contracts/legacyMetrics';
export const ALLOWED_METRICS = EXPLORER_EXPRESSIONS;
export const getAllowedDimensions = (timezone: string): Record<string, string> => {
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  return { date: 'CAST(capture_date AS STRING)', week: "FORMAT_DATE('%G-W%V', capture_date)", month: "FORMAT_DATE('%Y-%m', capture_date)",
    source: "IFNULL(source, 'Unknown')", medium: "IFNULL(medium, 'Unknown')", grade: "IFNULL(grade, 'Unknown')", vetting: "IFNULL(vetting, 'Unknown')",
    hour: `LPAD(CAST(EXTRACT(HOUR FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING), 2, '0')`,
    weekday: `CAST(EXTRACT(DAYOFWEEK FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING)`,
    calls_bucket: "CASE WHEN total_calls IS NULL OR total_calls = 0 THEN '0' WHEN total_calls <= 5 THEN CAST(total_calls AS STRING) WHEN total_calls <= 10 THEN '6-10' ELSE '11+' END" };
};
interface DynamicScope extends QueryScope { metric: string; dimension: string; secondaryDimension?: string; }
function expressions(input: DynamicScope) {
  const client = getClientConfig(input.clientId), dimensions = getAllowedDimensions(client.timezone);
  if (!Object.hasOwn(ALLOWED_METRICS, input.metric)) throw new RequestError('Unsupported metric');
  if (!Object.hasOwn(dimensions, input.dimension) || (input.secondaryDimension && !Object.hasOwn(dimensions, input.secondaryDimension))) throw new RequestError('Unsupported dimension. Use the vendor transaction report for vendor breakdowns.', 422);
  return { client, dimensions };
}
export async function executeDynamicQuery(input: DynamicScope) {
  const scope = validateScope(input), { client, dimensions } = expressions({ ...input, clientId: scope.clientId });
  const { sql, queryParams } = buildLeadWhere(scope);
  const dim2 = input.secondaryDimension ? `, ${dimensions[input.secondaryDimension]} AS dim2` : '';
  const query = `${getBaseSemanticLayer(client)} SELECT ${dimensions[input.dimension]} AS dim1${dim2}, ${ALLOWED_METRICS[input.metric]} AS value,
    COUNT(*) AS sample_size, COUNTIF(has_delivery) AS delivered, COUNTIF(has_call) AS called, COUNTIF(has_rpc) AS rpcs,
    COUNTIF(has_sale) AS sales, COUNTIF(has_billable_sale) AS billable_sales, COUNTIF(has_activation) AS activations, SUM(total_revenue) AS revenue
    FROM vw_leads ${sql} GROUP BY 1${input.secondaryDimension ? ', 2' : ''} ORDER BY ${['date', 'week', 'month', 'hour', 'weekday'].includes(input.dimension) ? 'dim1' : 'value DESC, dim1'} LIMIT 1001`;
  const started = Date.now(), [rows] = await getBigQueryClient(client.bigQueryProject).query({ query, params: queryParams });
  const pct = (a: number, b: number) => b > 0 ? 100 * a / b : null;
  return { data: rows.slice(0, 1000).map((r: any) => {
    const l = Number(r.sample_size), c = Number(r.called), s = Number(r.sales), b = Number(r.billable_sales), rev = Number(r.revenue) || 0;
    return { dim1: r.dim1, dim2: r.dim2, value: finiteOrNull(r.value), sampleSize: l,
      fullFunnel: { leads: l, delivered: Number(r.delivered), called: c, rpcs: Number(r.rpcs), sales: s, billableSales: b, activations: Number(r.activations), revenue: rev,
        deliveryRate: pct(Number(r.delivered), l), callRate: pct(c, l), rpcRate: pct(Number(r.rpcs), c), saleRate: pct(s, c), leadToSaleRate: pct(s, l), billableSaleRate: pct(b, s), activationRate: pct(Number(r.activations), s), revPerLead: l > 0 ? rev / l : null } };
  }), metadata: { metricDefinition: EXPLORER_METRICS.find(m => m.id === input.metric), metric: input.metric, dimension: input.dimension, secondaryDimension: input.secondaryDimension, durationMs: Date.now() - started, truncated: rows.length > 1000, rateUnit: 'percent', appliedFilters: scope.filters } };
}
export function previousPeriod(startDate: string, endDate: string) {
  const scope = validateScope({ startDate, endDate });
  if (!scope.startDate || !scope.endDate) throw new RequestError('Both dates are required');
  const start = Date.parse(scope.startDate), days = Math.floor((Date.parse(scope.endDate) - start) / 86400000) + 1;
  return { days, startDate: new Date(start - days * 86400000).toISOString().slice(0, 10), endDate: new Date(start - 86400000).toISOString().slice(0, 10) };
}
export async function generateDriverInsights(input: DynamicScope) {
  const endDate = input.endDate || new Date().toISOString().slice(0, 10);
  const startDate = input.startDate || new Date(Date.parse(endDate) - 29 * 86400000).toISOString().slice(0, 10);
  const scope = validateScope({ ...input, startDate, endDate }), { client, dimensions } = expressions({ ...input, clientId: scope.clientId });
  const previous = previousPeriod(startDate, endDate), currentWhere = buildLeadWhere(scope), previousWhere = buildLeadWhere({ ...scope, startDate: previous.startDate, endDate: previous.endDate });
  const base = getBaseSemanticLayer(client), bq = getBigQueryClient(client.bigQueryProject);
  const query = (where: string) => `${base} SELECT ${dimensions[input.dimension]} AS segment, ${ALLOWED_METRICS[input.metric]} AS val, COUNT(*) AS volume FROM vw_leads ${where} GROUP BY 1`;
  const [[currentRows], [previousRows]] = await Promise.all([bq.query({ query: query(currentWhere.sql), params: currentWhere.queryParams }), bq.query({ query: query(previousWhere.sql), params: previousWhere.queryParams })]);
  const current = new Map<string, any>(currentRows.map(r => [String(r.segment), r])), prior = new Map<string, any>(previousRows.map(r => [String(r.segment), r]));
  const additive = ['leads', 'delivered', 'called', 'rpcs', 'sales', 'billable_sales', 'activations', 'revenue'].includes(input.metric);
  const data = [...new Set([...current.keys(), ...prior.keys()])].map(segment => {
    const c = current.get(segment), p = prior.get(segment), cv = c ? finiteOrNull(c.val) : additive ? 0 : null, pv = p ? finiteOrNull(p.val) : additive ? 0 : null;
    const change = cv !== null && pv !== null ? cv - pv : null;
    return { segment, current: cv, previous: pv, change, pctChange: change !== null && pv !== null && pv !== 0 ? 100 * change / Math.abs(pv) : null,
      currentVolume: Number(c?.volume) || 0, previousVolume: Number(p?.volume) || 0 };
  }).sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0));
  return { data, metadata: { metricDefinition: EXPLORER_METRICS.find(m => m.id === input.metric), metric: input.metric, dimension: input.dimension, daysCompared: previous.days,
    currentPeriod: { startDate, endDate }, previousPeriod: previous, appliedFilters: scope.filters,
    interpretation: 'Observed differences, not evidence of causation; capture cohorts may differ in outcome maturity.' } };
}
