import { getBigQueryClient } from './client';
import { getClientConfig, tableIdentifier } from './config';
import { getBaseSemanticLayer } from './views';
import { buildLeadWhere, boundedInteger, conditionSql, RequestError, type QueryScope, type Scalar } from './filters';
import { comparison, finiteOrNull, maturityValue, overallStatus, validTimestampSql as ts } from './integrity';

const n = (value: unknown) => Number(value) || 0;
const ratio = (a: number, b: number) => b > 0 ? Number((100 * a / b).toFixed(1)) : null;
const yieldPer = (a: number | null, b: number) => a !== null && b > 0 ? Number((a / b).toFixed(2)) : null;
const COUNTS = `COUNT(*) AS leads, COUNTIF(routing_depth > 0) AS routedLeads,
 COUNTIF(routing_depth > 0 AND total_transactions > 0) AS handoffLeads,
 COUNTIF(has_delivery) AS delivered, COUNTIF(has_call) AS called, COUNTIF(has_rpc) AS rpcs,
 COUNTIF(has_sale) AS sales, COUNTIF(has_billable_sale) AS billableSales,
 COUNTIF(has_sale AND NOT has_billable_sale) AS unbilledSales, COUNTIF(has_activation) AS activations,
 SUM(total_revenue) AS revenue, SUM(total_transactions) AS transactions, SUM(total_calls) AS callsTotal`;
function measuredMetrics(row: Record<string, unknown> = {}) {
  const d = Object.fromEntries(['leads', 'routedLeads', 'handoffLeads', 'delivered', 'called', 'rpcs', 'sales', 'billableSales', 'unbilledSales', 'activations', 'revenue', 'transactions', 'callsTotal'].map(k => [k, n(row[k])])) as Record<'leads' | 'routedLeads' | 'handoffLeads' | 'delivered' | 'called' | 'rpcs' | 'sales' | 'billableSales' | 'unbilledSales' | 'activations' | 'revenue' | 'transactions' | 'callsTotal', number>;
  return { ...d, handoffRate: ratio(d.handoffLeads, d.routedLeads), deliveryRate: ratio(d.delivered, d.leads),
    callCoverage: ratio(d.called, d.delivered), rpcRate: ratio(d.rpcs, d.called), saleRate: ratio(d.sales, d.called),
    leadToSaleRate: ratio(d.sales, d.leads), billableSaleRate: ratio(d.billableSales, d.sales), activationRate: ratio(d.activations, d.sales),
    revenuePerLead: yieldPer(d.revenue, d.leads), revenuePerBillableSale: yieldPer(d.revenue, d.billableSales),
    callsPerLead: yieldPer(d.callsTotal, d.leads), callsPerCalledLead: yieldPer(d.callsTotal, d.called) };
}
export async function getOverviewStats(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const base = getBaseSemanticLayer(client), { sql, queryParams } = buildLeadWhere(scope);
  const [[totals], [trend], [sources]] = await Promise.all([
    bq.query({ query: `${base} SELECT ${COUNTS} FROM vw_leads ${sql}`, params: queryParams }),
    bq.query({ query: `${base} SELECT CAST(capture_date AS STRING) AS date, ${COUNTS} FROM vw_leads ${sql} GROUP BY date ORDER BY date`, params: queryParams }),
    bq.query({ query: `${base} SELECT source, ${COUNTS} FROM vw_leads ${sql} GROUP BY source ORDER BY leads DESC`, params: queryParams }),
  ]);
  const data = measuredMetrics(totals[0]);
  const media = await getMediaRows(scope);
  const spend = media.spend;
  return { ...data, spend, cpa: yieldPer(spend, data.leads), cpl: yieldPer(spend, data.leads),
    roas: spend !== null && spend > 0 ? ratio(data.revenue, spend) : null,
    spendStatus: media.reason || 'MEASURED',
    trend: trend.map(r => ({ date: r.date, ...measuredMetrics(r) })),
    sources: sources.map(r => ({ source: r.source, ...measuredMetrics(r) })),
    attentionItems: data.unbilledSales ? [{ id: 'sales_without_recorded_revenue', title: 'Sales without recorded revenue',
      severity: 'warning', magnitude: `${data.unbilledSales} leads`, affected: 'Matched sale evidence without positive attributed revenue',
      reason: 'This can reflect reporting lag, unmatched records or non-billable outcomes. It is not proof of financial loss.',
      actionPath: '/outcomes', actionLabel: 'Review outcome evidence' }] : [],
    dataReadiness: { status: 'NOT_VERIFIED', reason: 'Independent warehouse and deployment validation has not been completed.' },
  };
}
export async function getFunnelStats(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope);
  const [rows] = await bq.query({ query: `${getBaseSemanticLayer(client)} SELECT ${COUNTS}, COUNTIF(valid_lead) AS valid FROM vw_leads ${sql}`, params: queryParams });
  const r = rows[0] || {}, stages = [['Fetched Leads', n(r.leads)], ['Valid Leads', n(r.valid)], ['Delivered Leads', n(r.delivered)], ['Dialled Leads', n(r.called)], ['Right Party Contact', n(r.rpcs)], ['Sales', n(r.sales)], ['Sales with recorded revenue', n(r.billableSales)], ['Activated Leads', n(r.activations)]] as const;
  return stages.map(([stage, count], i) => ({ stage, count, rate: i ? ratio(count, stages[i - 1][1]) : (count ? 100 : null) }));
}
export async function getQualityStats(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope), base = getBaseSemanticLayer(client);
  const [[rows], [grades]] = await Promise.all([
    bq.query({ query: `${base} SELECT ${COUNTS}, COUNTIF(valid_lead IS TRUE) AS passed, COUNTIF(valid_lead IS FALSE) AS failed, COUNTIF(valid_lead IS NULL) AS unknown FROM vw_leads ${sql}`, params: queryParams }),
    bq.query({ query: `${base} SELECT COALESCE(NULLIF(grade, ''), 'Unknown') AS grade, ${COUNTS} FROM vw_leads ${sql} GROUP BY grade ORDER BY leads DESC`, params: queryParams }),
  ]);
  const r = rows[0] || {}, summary = measuredMetrics(r), passed = n(r.passed), failed = n(r.failed), unknown = n(r.unknown);
  const categories = [{ name: 'Valid', value: passed }, { name: 'Invalid', value: failed }, { name: 'Unknown', value: unknown }];
  const byGrade = grades.map(g => ({ grade: g.grade, ...measuredMetrics(g), revPerLead: yieldPer(n(g.revenue), n(g.leads)) }));
  return { total: summary.leads, passed, failed, unknown, grades: categories, vetting: categories,
    passRate: ratio(passed, summary.leads), avgScore: null, fullFunnelSummary: { ...summary, passed, failed, unknown },
    fullFunnelByGrade: byGrade, chart: byGrade.map(g => ({ grade: g.grade, leads: g.leads, rpc: g.rpcs, sale: g.sales })),
    reasons: categories.map(c => ({ reason: c.name, count: c.value, percentage: ratio(c.value, summary.leads) })) };
}
export async function getLeads(scope: QueryScope & { limit?: number; offset?: number }) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope);
  const [rows] = await bq.query({ query: `${getBaseSemanticLayer(client)} SELECT lead_id AS id, capture_timestamp AS captured,
    source, medium AS campaign, CAST(total_calls AS STRING) AS calls,
    CASE WHEN has_activation THEN 'Activated' WHEN has_sale THEN 'Sale' WHEN has_rpc THEN 'Contacted' WHEN has_call THEN 'Called' WHEN has_delivery THEN 'Delivered' ELSE 'Captured' END AS status,
    CAST(total_revenue AS STRING) AS value,
    CASE WHEN valid_lead IS TRUE THEN 'Valid' WHEN valid_lead IS FALSE THEN 'Invalid' ELSE 'Unknown' END AS quality
    FROM vw_leads ${sql} ORDER BY capture_timestamp DESC, lead_id
    LIMIT @limit OFFSET @offset`, params: { ...queryParams, limit: boundedInteger(scope.limit, 100, 1000, 1), offset: boundedInteger(scope.offset, 0, 100000) } });
  return rows;
}
export async function getLeadTimeline(scope: QueryScope & { leadId: string }) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope);
  const [rows] = await bq.query({ query: `${getBaseSemanticLayer(client)}, selected_leads AS (SELECT lead_id FROM vw_leads ${sql})
    SELECT t.* FROM vw_lead_vendor_transactions t JOIN selected_leads s USING (lead_id)
    WHERE CAST(t.lead_id AS STRING) = @leadId ORDER BY capture_timestamp, delivery_timestamp, hlc_record_number`, params: { ...queryParams, leadId: String(scope.leadId) } });
  return rows;
}
export async function getSpeedToLeadStats(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope), base = getBaseSemanticLayer(client);
  const scoped = `${base}, selected_leads AS (SELECT lead_id FROM vw_leads ${sql}), timing AS (
    SELECT t.*, CASE WHEN delivery_timestamp >= capture_timestamp THEN TIMESTAMP_DIFF(delivery_timestamp, capture_timestamp, SECOND) / 60.0 END AS c2d,
      CASE WHEN first_call_timestamp >= delivery_timestamp AND NOT ambiguous_transaction_call_attribution THEN TIMESTAMP_DIFF(first_call_timestamp, delivery_timestamp, SECOND) / 60.0 END AS d2c
    FROM vw_lead_vendor_transactions t JOIN selected_leads USING (lead_id) WHERE delivery_timestamp IS NOT NULL AND NOT duplicate_flag
  )`;
  const [[rows], [buckets]] = await Promise.all([
    bq.query({ query: `${scoped} SELECT COUNT(*) AS delivered, COUNTIF(d2c IS NULL) AS excluded,
      AVG(c2d) AS avg_c2d, APPROX_QUANTILES(c2d, 100) AS q_c2d, AVG(d2c) AS avg_d2c, APPROX_QUANTILES(d2c, 100) AS q_d2c,
      COUNTIF(first_call_timestamp IS NULL) AS uncalled, COUNTIF(ambiguous_transaction_call_attribution) AS ambiguous FROM timing`, params: queryParams }),
    bq.query({ query: `${scoped} SELECT CASE WHEN d2c <= 5 THEN '0–5m' WHEN d2c <= 15 THEN '>5–15m' WHEN d2c <= 60 THEN '>15–60m' ELSE '>1h' END AS bucket,
      COUNT(*) AS leads, COUNTIF(rpc) AS rpcCount, COUNTIF(sale) AS saleCount, COUNTIF(is_billable_sale) AS billableCount,
      COUNTIF(activation) AS actCount, SUM(revenue) AS revenue FROM timing WHERE d2c IS NOT NULL GROUP BY bucket`, params: queryParams }),
  ]);
  const r = rows[0] || {}, duration = (value: unknown) => finiteOrNull(value) === null ? 'N/A' : `${Number(value).toFixed(1)}m`;
  const row = (name: string, avg: unknown, quantiles: any) => ({ name, avg: duration(avg), median: duration(quantiles?.[50]), p75: duration(quantiles?.[75]), p90: duration(quantiles?.[90]), p95: duration(quantiles?.[95]) });
  const order = ['0–5m', '>5–15m', '>15–60m', '>1h'];
  return { grain: 'lead_vendor_transaction', clock: 'elapsed', percentileMethod: 'approximate',
    metrics: [row('Capture to Delivery — delivered transactions', r.avg_c2d, r.q_c2d), row('Delivery to First Observed Call', r.avg_d2c, r.q_d2c)],
    population: { deliveredTransactions: n(r.delivered), excludedFromDialTiming: n(r.excluded), uncalledTransactions: n(r.uncalled), ambiguousTransactions: n(r.ambiguous) },
    buckets: order.map(bucket => { const x = buckets.find(b => b.bucket === bucket) || {}; const count = n(x.leads); return { bucket, leads: count, transactions: count,
      rpcCount: n(x.rpcCount), rpc: ratio(n(x.rpcCount), count), saleCount: n(x.saleCount), sale: ratio(n(x.saleCount), count),
      billableCount: n(x.billableCount), billableRate: ratio(n(x.billableCount), n(x.saleCount)), actCount: n(x.actCount), activation: ratio(n(x.actCount), n(x.saleCount)),
      revenue: n(x.revenue), revPerLead: yieldPer(n(x.revenue), count) }; }) };
}
export async function getCohortStats(scope: QueryScope & { cohortType?: string; metricType?: string }) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const type = scope.cohortType || 'weekly', metric = scope.metricType || 'sale';
  const groupings: Record<string, string> = { daily: 'CAST(capture_date AS STRING)', weekly: "FORMAT_DATE('%G-W%V', capture_date)", monthly: "FORMAT_DATE('%Y-%m', capture_date)" };
  const events: Record<string, string> = { sale: 'sale_timestamp', rpc: 'rpc_timestamp', activation: 'activation_timestamp', call_coverage: 'first_call_timestamp' };
  if (!Object.hasOwn(groupings, type) || (!Object.hasOwn(events, metric) && metric !== 'revenue')) throw new RequestError('Unsupported cohort type or metric');
  const { sql, queryParams } = buildLeadWhere(scope), days = [0, 1, 3, 7, 14, 30];
  const event = events[metric];
  // Revenue has no receipt/event ledger in this model; do not backdate lifetime totals to first call or activation.
  const expressions = days.map(day => metric === 'revenue' ? `CAST(NULL AS FLOAT64) AS d${day}` : `COUNTIF(${event} >= capture_timestamp AND DATE_DIFF(DATE(${event}), capture_date, DAY) <= ${day} AND ${event} <= @observedAt) AS d${day}`).join(',');
  const observedAt = new Date(), cutoff = observedAt.toISOString().slice(0, 10);
  const [rows] = await bq.query({ query: `${getBaseSemanticLayer(client)} SELECT ${groupings[type]} AS cohort,
    CAST(MAX(capture_date) AS STRING) AS cohortEnd, ${COUNTS}, ${expressions} FROM vw_leads ${sql} GROUP BY cohort ORDER BY cohort DESC LIMIT 1000`, params: { ...queryParams, observedAt } });
  return rows.map(r => ({ cohort: r.cohort, size: n(r.leads), ...measuredMetrics(r),
    observedAt: observedAt.toISOString(), revenueMaturationAvailable: false,
    metrics: Object.fromEntries(days.map(day => { const value = maturityValue(r[`d${day}`], r.cohortEnd, cutoff, day); return [`d${day}`, value === null ? null : ratio(value, n(r.leads))]; })) }));
}

/** Return only independently measured comparisons. No semantic-to-semantic substitutes. */
export async function getReconciliationValidation(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope);
  const [semanticRows] = await bq.query({ query: `${getBaseSemanticLayer(client)} SELECT ${COUNTS} FROM vw_leads ${sql}`, params: queryParams });
  const semantic = semanticRows[0] || {};
  const rawClauses: string[] = [], rawParams: Record<string, Scalar> = {};
  if (scope.startDate) { rawClauses.push(`DATE(${ts('l.fetched')}) >= @startDate`); rawParams.startDate = scope.startDate; }
  if (scope.endDate) { rawClauses.push(`DATE(${ts('l.fetched')}) <= @endDate`); rawParams.endDate = scope.endDate; }
  const rawFields: Record<string, string> = { source: "IFNULL(l.offershop_source, 'Unknown')", medium: "IFNULL(l.offernet_medium, 'Unknown')", grade: 'l.offershop_grade', vetting: "SPLIT(l.offershop_color_vetting, ',')[SAFE_OFFSET(0)]", lead_id: 'CAST(l.lead_id AS STRING)', consumer_id: 'l.consumer_id' };
  let rawSupported = true;
  Object.entries(scope.filters || {}).forEach(([key, filter], i) => {
    if (key === 'vendor') rawClauses.push(`EXISTS (SELECT 1 FROM UNNEST(l.hlc_details) h WHERE ${conditionSql('h.vendor', filter, `raw_${i}`, rawParams)})`);
    else if (Object.hasOwn(rawFields, key)) rawClauses.push(conditionSql(rawFields[key], filter, `raw_${i}`, rawParams));
    else rawSupported = false;
  });
  let rawLeads: number | null = null;
  if (rawSupported) {
    try { const [rows] = await bq.query({ query: `SELECT COUNT(DISTINCT l.lead_id) AS leads FROM ${tableIdentifier(client.semanticMappings.tables.leads)} l ${rawClauses.length ? `WHERE ${rawClauses.join(' AND ')}` : ''}`, params: rawParams }); rawLeads = finiteOrNull(rows[0]?.leads); }
    catch { /* Missing evidence remains unavailable, never replaced by a semantic result. */ }
  }
  const metrics = [
    { metric: 'Unique Leads', rawBigQuery: rawLeads, semanticModel: finiteOrNull(semantic.leads), grain: 'Distinct lead_id under identical supported filters' },
    ...['callsTotal', 'sales', 'activations', 'revenue'].map(key => ({ metric: key, rawBigQuery: null, semanticModel: finiteOrNull(semantic[key]), grain: 'Independent source reconciliation pending' })),
  ].map(item => ({ ...item, ...comparison(item.rawBigQuery, item.semanticModel), apiPayload: null, uiRendered: null,
    explanation: 'API and rendered UI were not independently measured. Zero raw results are retained.' }));
  return { reconciledAt: new Date().toISOString(), overallStatus: overallStatus([...metrics.map(m => m.status), 'NOT_VERIFIED']),
    chain: 'Independent raw-to-semantic checks; API/UI validation not yet measured', metrics };
}

async function getMediaRows(scope: QueryScope): Promise<{ rows: any[]; spend: number | null; reason: string | null }> {
  const client = getClientConfig(scope.clientId);
  if (!client.semanticMappings.tables.marketing) return { rows: [], spend: null, reason: 'Marketing source is unavailable' };
  const field = process.env.BIGQUERY_MEDIA_SPEND_FIELD;
  if (!field || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) return { rows: [], spend: null, reason: 'An actual-spend field has not been verified; budget is not assumed to be spend' };
  // The current mapping contains no verified vendor/source media-cost allocation key.
  if (Object.keys(scope.filters || {}).length) return { rows: [], spend: null, reason: 'Media costs cannot yet be attributed to the selected filters' };
  const params: Record<string, string> = {}, conditions: string[] = [];
  if (scope.startDate) { conditions.push('SAFE_CAST(date AS DATE) >= @startDate'); params.startDate = scope.startDate; }
  if (scope.endDate) { conditions.push('SAFE_CAST(date AS DATE) <= @endDate'); params.endDate = scope.endDate; }
  try {
    const [rows] = await getBigQueryClient(client.bigQueryProject).query({ query: `SELECT CAST(SAFE_CAST(date AS DATE) AS STRING) AS date, channel,
      SUM(SAFE_CAST(${field} AS FLOAT64)) AS spend, SUM(SAFE_CAST(impressions AS INT64)) AS impressions,
      SUM(SAFE_CAST(clicks AS INT64)) AS clicks, SUM(SAFE_CAST(actions_lead AS INT64)) AS leads
      FROM ${tableIdentifier(client.semanticMappings.tables.marketing)} ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      GROUP BY date, channel ORDER BY date`, params });
    const measured = rows.map(r => finiteOrNull(r.spend));
    return { rows, spend: measured.length && measured.every(v => v !== null) ? measured.reduce<number>((sum, v) => sum + v!, 0) : null, reason: !measured.length ? 'No media records in the selected period' : measured.some(v => v === null) ? 'One or more spend values are unavailable' : null };
  } catch { return { rows: [], spend: null, reason: 'The media query failed; cost is unavailable, not zero' }; }
}
export async function getAcquisitionStats(scope: QueryScope) {
  const client = getClientConfig(scope.clientId), bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildLeadWhere(scope);
  const [[rows], media] = await Promise.all([
    bq.query({ query: `${getBaseSemanticLayer(client)} SELECT ${COUNTS} FROM vw_leads ${sql}`, params: queryParams }), getMediaRows(scope),
  ]);
  const m = measuredMetrics(rows[0]), spend = media.spend;
  const summary = { ...m, fetchedLeads: m.leads, spend,
    impressions: media.rows.length ? media.rows.reduce((s, r) => s + n(r.impressions), 0) : null,
    clicks: media.rows.length ? media.rows.reduce((s, r) => s + n(r.clicks), 0) : null,
    cplFetched: yieldPer(spend, m.leads), cplDelivered: yieldPer(spend, m.delivered), cplDialed: yieldPer(spend, m.called),
    cpRpc: yieldPer(spend, m.rpcs), cpSale: yieldPer(spend, m.sales), cpsDelivered: yieldPer(spend, m.billableSales), cpsActivated: yieldPer(spend, m.activations),
    roas: spend !== null && spend > 0 ? ratio(m.revenue, spend) : null };
  const channels = new Map<string, any>();
  for (const r of media.rows) { const key = String(r.channel || 'Unknown'); const c = channels.get(key) || { channel: key, spend: 0, impressions: 0, clicks: 0, leads: 0 }; for (const k of ['spend', 'impressions', 'clicks', 'leads']) c[k] += n(r[k]); channels.set(key, c); }
  return { summary, timeseries: media.rows, channels: [...channels.values()], campaigns: [], campaignGrainAvailable: false, unavailableReason: media.reason };
}
