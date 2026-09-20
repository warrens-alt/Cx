import { getBigQueryClient } from './client';
import { getClientConfig } from './config';
import { getBaseSemanticLayer } from './views';

export const getAllowedDimensions = (timezone: string): Record<string, string> => ({

  date: "CAST(capture_date AS STRING)",
  week: "FORMAT_DATE('%Y-W%W', capture_date)",
  month: "FORMAT_DATE('%Y-%m', capture_date)",
  source: "IFNULL(source, 'Unknown')",
  vendor: "IFNULL(vendor, 'Unknown')",
  medium: "IFNULL(medium, 'Unknown')",
  campaign: "IFNULL(medium, 'Unknown')", // alias if needed
  hour: `CAST(EXTRACT(HOUR FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING)`,
  weekday: `CAST(EXTRACT(DAYOFWEEK FROM DATETIME(capture_timestamp, '${timezone}')) AS STRING)`,
  calls_bucket: `
    CASE 
      WHEN total_calls = 0 OR total_calls IS NULL THEN '0'
      WHEN total_calls = 1 THEN '1'
      WHEN total_calls = 2 THEN '2'
      WHEN total_calls = 3 THEN '3'
      WHEN total_calls = 4 THEN '4'
      WHEN total_calls = 5 THEN '5'
      WHEN total_calls BETWEEN 6 AND 10 THEN '6-10'
      ELSE '11+'
    END
  `,
  response_bucket: `
    CASE
      WHEN first_call_timestamp IS NULL THEN 'Uncalled'
      WHEN TIMESTAMP_DIFF(first_call_timestamp, capture_timestamp, MINUTE) <= 5 THEN '< 5m'
      WHEN TIMESTAMP_DIFF(first_call_timestamp, capture_timestamp, MINUTE) <= 15 THEN '5-15m'
      WHEN TIMESTAMP_DIFF(first_call_timestamp, capture_timestamp, MINUTE) <= 60 THEN '15-60m'
      WHEN TIMESTAMP_DIFF(first_call_timestamp, capture_timestamp, HOUR) <= 4 THEN '1-4h'
      WHEN TIMESTAMP_DIFF(first_call_timestamp, capture_timestamp, HOUR) <= 24 THEN '4-24h'
      ELSE '24h+'
    END
  `

});

export const ALLOWED_METRICS: Record<string, string> = {
  leads: "COUNT(DISTINCT lead_id)",
  delivered: "COUNTIF(has_delivery = true)",
  called: "COUNTIF(has_call = true)",
  rpcs: "COUNTIF(has_rpc = true)",
  sales: "COUNTIF(has_sale = true)",
  billable_sales: "COUNTIF(has_billable_sale = true)",
  activations: "COUNTIF(has_activation = true)",
  revenue: "SUM(total_revenue)",
  delivery_rate: "SAFE_DIVIDE(COUNTIF(has_delivery = true), COUNT(DISTINCT lead_id))",
  dial_rate: "SAFE_DIVIDE(COUNTIF(has_call = true), COUNT(DISTINCT lead_id))",
  call_coverage: "SAFE_DIVIDE(COUNTIF(has_call = true), COUNTIF(has_delivery = true))",
  rpc_rate: "SAFE_DIVIDE(COUNTIF(has_rpc = true), COUNTIF(has_call = true))",
  sale_rate: "SAFE_DIVIDE(COUNTIF(has_sale = true), COUNTIF(has_call = true))",
  lead_to_sale_rate: "SAFE_DIVIDE(COUNTIF(has_sale = true), COUNT(DISTINCT lead_id))",
  billable_sale_rate: "SAFE_DIVIDE(COUNTIF(has_billable_sale = true), COUNTIF(has_sale = true))",
  activation_rate: "SAFE_DIVIDE(COUNTIF(has_activation = true), COUNTIF(has_sale = true))",
  revenue_per_lead: "SAFE_DIVIDE(SUM(total_revenue), COUNT(DISTINCT lead_id))",
  revenue_per_sale: "SAFE_DIVIDE(SUM(total_revenue), COUNTIF(has_sale = true))",
  calls_per_lead: "SAFE_DIVIDE(SUM(total_calls), COUNT(DISTINCT lead_id))"
};

export async function executeDynamicQuery({
  clientId,
  metric,
  dimension,
  secondaryDimension,
  startDate,
  endDate,
  filters = {}
}: {
  clientId: string;
  metric: string;
  dimension: string;
  secondaryDimension?: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, string>;
}) {
  if (!ALLOWED_METRICS[metric]) throw new Error(`Invalid metric: ${metric}`);
  const client = getClientConfig(clientId);
  if (!getAllowedDimensions(client.timezone)[dimension]) throw new Error(`Invalid dimension: ${dimension}`);
  if (secondaryDimension && !getAllowedDimensions(client.timezone)[secondaryDimension]) throw new Error(`Invalid secondary dimension: ${secondaryDimension}`);
  const bq = getBigQueryClient(client.bigQueryProject);

  let clauses = [];
  const queryParams: any = {};

  if (startDate) {
    clauses.push(`capture_date >= @startDate`);
    queryParams.startDate = startDate;
  }
  if (endDate) {
    clauses.push(`capture_date <= @endDate`);
    queryParams.endDate = endDate;
  }
  
  if (filters.source) {
    clauses.push(`source = @sourceFilter`);
    queryParams.sourceFilter = filters.source;
  }
  if (filters.vendor) {
    clauses.push(`vendor = @vendorFilter`);
    queryParams.vendorFilter = filters.vendor;
  }
  if (filters.medium) {
    clauses.push(`medium = @mediumFilter`);
    queryParams.mediumFilter = filters.medium;
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const dimSql = getAllowedDimensions(client.timezone)[dimension];
  const metricSql = ALLOWED_METRICS[metric];
  
  let selectSql = `${dimSql} as dim1, ${metricSql} as value`;
  let groupBySql = `1`;
  
  if (secondaryDimension) {
    selectSql = `${dimSql} as dim1, ${getAllowedDimensions(client.timezone)[secondaryDimension]} as dim2, ${metricSql} as value`;
    groupBySql = `1, 2`;
  }

  const query = `
    ${getBaseSemanticLayer(client)}
    SELECT
      ${selectSql},
      COUNT(lead_id) as sample_size,
      COUNT(DISTINCT lead_id) as full_leads,
      COUNTIF(has_delivery = true) as full_delivered,
      COUNTIF(has_call = true) as full_called,
      COUNTIF(has_rpc = true) as full_rpcs,
      COUNTIF(has_sale = true) as full_sales,
      COUNTIF(has_billable_sale = true) as full_billable_sales,
      COUNTIF(has_activation = true) as full_activations,
      SUM(IFNULL(total_revenue, 0)) as full_revenue
    FROM vw_leads
    ${whereSql}
    GROUP BY ${groupBySql}
    ORDER BY value DESC
    LIMIT 100
  `;

  const startTime = Date.now();
  const [job] = await bq.createQueryJob({ query, params: queryParams });
  const [rows] = await job.getQueryResults();
  const metadata = job.metadata.statistics;

  return {
    success: true,
    data: rows.map((r: any) => {
      const fl = Number(r.full_leads) || 0;
      const fdel = Number(r.full_delivered) || 0;
      const fcall = Number(r.full_called) || 0;
      const frpc = Number(r.full_rpcs) || 0;
      const fsale = Number(r.full_sales) || 0;
      const fbill = Number(r.full_billable_sales) || 0;
      const fact = Number(r.full_activations) || 0;
      const frev = Number(r.full_revenue) || 0;

      return {
        dim1: r.dim1,
        dim2: r.dim2,
        value: Number(r.value) || 0,
        sampleSize: Number(r.sample_size) || 0,
        fullFunnel: {
          leads: fl,
          delivered: fdel,
          called: fcall,
          rpcs: frpc,
          sales: fsale,
          billableSales: fbill,
          activations: fact,
          revenue: frev,
          deliveryRate: fl > 0 ? Number(((fdel / fl) * 100).toFixed(1)) : 0,
          callRate: fl > 0 ? Number(((fcall / fl) * 100).toFixed(1)) : 0,
          rpcRate: fcall > 0 ? Number(((frpc / fcall) * 100).toFixed(1)) : 0,
          saleRate: fcall > 0 ? Number(((fsale / fcall) * 100).toFixed(1)) : 0,
          leadToSaleRate: fl > 0 ? Number(((fsale / fl) * 100).toFixed(1)) : 0,
          billableSaleRate: fsale > 0 ? Number(((fbill / fsale) * 100).toFixed(1)) : 0,
          activationRate: fsale > 0 ? Number(((fact / fsale) * 100).toFixed(1)) : 0,
          revPerLead: fl > 0 ? Number((frev / fl).toFixed(2)) : 0
        }
      };
    }),
    metadata: {
      durationMs: Date.now() - startTime,
      bytesBilled: metadata?.query?.totalBytesBilled || 0,
      metric,
      dimension,
      secondaryDimension
    }
  };
}

// Generates deterministic driver insights by comparing two periods
export async function generateDriverInsights({
  clientId,
  metric = 'activations',
  dimension = 'source',
  startDate,
  endDate,
  filters = {}
}: {
  clientId: string;
  metric?: string;
  dimension?: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, string>;
}) {
  const allowedMetricKey = ALLOWED_METRICS[metric] ? metric : 'activations';
  const client = getClientConfig(clientId);
  const bq = getBigQueryClient(client.bigQueryProject);

  const dimExpr = getAllowedDimensions(client.timezone)[dimension] || "IFNULL(source, 'Unknown')";
  const metricSql = ALLOWED_METRICS[allowedMetricKey];

  const now = new Date();
  const effectiveEnd = endDate || now.toISOString().split('T')[0];
  const effectiveStart = startDate || new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

  const diffQuery = `
    SELECT TIMESTAMP_DIFF(TIMESTAMP(@endDate), TIMESTAMP(@startDate), DAY) as days
  `;
  const [[diff]] = await bq.query({ query: diffQuery, params: { startDate: effectiveStart, endDate: effectiveEnd } });
  const days = Math.max(1, (Number(diff?.days) || 0) + 1);

  const query = `
    ${getBaseSemanticLayer(client)},
    current_period AS (
      SELECT
        ${dimExpr} as segment,
        ${metricSql} as val,
        COUNT(DISTINCT lead_id) as volume
      FROM vw_leads
      WHERE capture_date >= @startDate AND capture_date <= @endDate
      GROUP BY 1
    ),
    previous_period AS (
      SELECT
        ${dimExpr} as segment,
        ${metricSql} as val,
        COUNT(DISTINCT lead_id) as volume
      FROM vw_leads
      WHERE capture_date >= DATE_SUB(CAST(@startDate AS DATE), INTERVAL @days DAY)
        AND capture_date < DATE_SUB(CAST(@endDate AS DATE), INTERVAL @days - 1 DAY)
      GROUP BY 1
    )
    SELECT
      COALESCE(c.segment, p.segment, 'Unknown') as segment,
      c.val as current_val,
      p.val as previous_val,
      (IFNULL(c.val, 0) - IFNULL(p.val, 0)) as absolute_change,
      SAFE_DIVIDE((IFNULL(c.val, 0) - IFNULL(p.val, 0)), NULLIF(p.val, 0)) * 100 as pct_change,
      c.volume as current_volume,
      p.volume as previous_volume
    FROM current_period c
    FULL OUTER JOIN previous_period p ON c.segment = p.segment
    ORDER BY ABS(IFNULL(c.val, 0) - IFNULL(p.val, 0)) DESC
    LIMIT 15
  `;

  const [rows] = await bq.query({ 
    query, 
    params: { startDate: effectiveStart, endDate: effectiveEnd, days } 
  });

  return {
    success: true,
    metric: allowedMetricKey,
    dimension,
    daysCompared: days,
    data: rows.map((r: any) => ({
      segment: String(r.segment || 'Unknown'),
      current: Number(r.current_val) || 0,
      previous: Number(r.previous_val) || 0,
      change: Number(r.absolute_change) || 0,
      pctChange: r.pct_change != null ? Number(Number(r.pct_change).toFixed(1)) : 0,
      currentVolume: Number(r.current_volume) || 0,
      previousVolume: Number(r.previous_volume) || 0
    }))
  };
}
