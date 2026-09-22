import { getBigQueryClient } from './client';
import { getClientConfig } from './config';
import { getBaseSemanticLayer } from './views';
import { buildLeadWhere, validateScope, RequestError, type QueryScope } from './filters';
import { EXPLORER_EXPRESSIONS, EXPLORER_METRICS } from '../../contracts/legacyMetrics';
import { compareExactDecimal, divideExactDecimal, exactDecimal, exactPercent, subtractExactDecimals } from '../../contracts/exactDecimal';
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
function requiredDecimal(value: unknown, field: string): string {
  const exact = exactDecimal(value);
  if (exact === null) throw new Error(`BigQuery returned a non-decimal ${field}.`);
  return exact;
}
const absoluteDecimal = (value: string): string => value.startsWith('-') ? value.slice(1) : value;
export async function executeDynamicQuery(input: DynamicScope) {
  const scope = validateScope(input), { client, dimensions } = expressions({ ...input, clientId: scope.clientId });
  const { sql, queryParams } = buildLeadWhere(scope);
  const dim2 = input.secondaryDimension ? `, ${dimensions[input.secondaryDimension]} AS dim2` : '';
  const metricExpression = ALLOWED_METRICS[input.metric];
  const temporal = ['date', 'week', 'month', 'hour', 'weekday'].includes(input.dimension);
  const query = `${getBaseSemanticLayer(client)} SELECT ${dimensions[input.dimension]} AS dim1${dim2}, CAST(${metricExpression} AS STRING) AS value,
    CAST(COUNT(*) AS STRING) AS sample_size, CAST(COUNTIF(has_delivery) AS STRING) AS delivered, CAST(COUNTIF(has_call) AS STRING) AS called, CAST(COUNTIF(has_rpc) AS STRING) AS rpcs,
    CAST(COUNTIF(has_sale) AS STRING) AS sales, CAST(COUNTIF(has_billable_sale) AS STRING) AS billable_sales, CAST(COUNTIF(has_activation) AS STRING) AS activations,
    CAST(COALESCE(SUM(total_revenue), 0) AS STRING) AS revenue
    FROM vw_leads ${sql} GROUP BY 1${input.secondaryDimension ? ', 2' : ''} ORDER BY ${temporal ? 'dim1' : `${metricExpression} DESC, dim1`} LIMIT 1001`;
  const started = Date.now(), [rows] = await getBigQueryClient(client.bigQueryProject).query({ query, params: queryParams });
  return { data: rows.slice(0, 1000).map((r: any) => {
    const leads = requiredDecimal(r.sample_size, 'sample count');
    const delivered = requiredDecimal(r.delivered, 'delivered count');
    const called = requiredDecimal(r.called, 'called count');
    const rpcs = requiredDecimal(r.rpcs, 'RPC count');
    const sales = requiredDecimal(r.sales, 'sale count');
    const billableSales = requiredDecimal(r.billable_sales, 'sale-with-revenue count');
    const activations = requiredDecimal(r.activations, 'activation count');
    const revenue = requiredDecimal(r.revenue, 'recorded revenue');
    return { dim1: r.dim1, dim2: r.dim2, value: exactDecimal(r.value), sampleSize: leads,
      fullFunnel: { leads, delivered, called, rpcs, sales, billableSales, activations, revenue,
        deliveryRate: exactPercent(delivered, leads, 6), callRate: exactPercent(called, leads, 6), rpcRate: exactPercent(rpcs, called, 6),
        saleRate: exactPercent(sales, called, 6), leadToSaleRate: exactPercent(sales, leads, 6), billableSaleRate: exactPercent(billableSales, sales, 6),
        activationRate: exactPercent(activations, sales, 6), revPerLead: divideExactDecimal(revenue, leads, 6) } };
  }), metadata: { metricDefinition: EXPLORER_METRICS.find(m => m.id === input.metric), metric: input.metric, dimension: input.dimension, secondaryDimension: input.secondaryDimension,
    durationMs: Date.now() - started, truncated: rows.length > 1000, rateUnit: 'percent', numericEncoding: 'exact-decimal-string', appliedFilters: scope.filters } };
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
  const query = (where: string) => `${base} SELECT ${dimensions[input.dimension]} AS segment, CAST(${ALLOWED_METRICS[input.metric]} AS STRING) AS val, CAST(COUNT(*) AS STRING) AS volume FROM vw_leads ${where} GROUP BY 1`;
  const [[currentRows], [previousRows]] = await Promise.all([bq.query({ query: query(currentWhere.sql), params: currentWhere.queryParams }), bq.query({ query: query(previousWhere.sql), params: previousWhere.queryParams })]);
  const current = new Map<string, any>(currentRows.map(r => [String(r.segment), r])), prior = new Map<string, any>(previousRows.map(r => [String(r.segment), r]));
  const additive = ['leads', 'delivered', 'called', 'rpcs', 'sales', 'billable_sales', 'activations', 'revenue'].includes(input.metric);
  const data = [...new Set([...current.keys(), ...prior.keys()])].map(segment => {
    const c = current.get(segment), p = prior.get(segment);
    const cv = c ? exactDecimal(c.val) : additive ? '0' : null;
    const pv = p ? exactDecimal(p.val) : additive ? '0' : null;
    if (c && cv === null) throw new Error('BigQuery returned a non-decimal current comparison value.');
    if (p && pv === null) throw new Error('BigQuery returned a non-decimal previous comparison value.');
    const change = cv !== null && pv !== null ? subtractExactDecimals(cv, pv) : null;
    return { segment, current: cv, previous: pv, change, pctChange: change !== null && pv !== null ? exactPercent(change, absoluteDecimal(pv), 6) : null,
      currentVolume: c ? requiredDecimal(c.volume, 'current comparison volume') : '0', previousVolume: p ? requiredDecimal(p.volume, 'previous comparison volume') : '0' };
  }).sort((a, b) => compareExactDecimal(absoluteDecimal(b.change ?? '0'), absoluteDecimal(a.change ?? '0')));
  return { data, metadata: { metricDefinition: EXPLORER_METRICS.find(m => m.id === input.metric), metric: input.metric, dimension: input.dimension, daysCompared: previous.days,
    currentPeriod: { startDate, endDate }, previousPeriod: previous, appliedFilters: scope.filters,
    numericEncoding: 'exact-decimal-string', interpretation: 'Observed differences, not evidence of causation; capture cohorts may differ in outcome maturity.' } };
}
