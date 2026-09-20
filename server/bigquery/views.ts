import { configuredRelation } from './sourceSql';
import type { TenantConfiguration } from './config';
import { getBaseSemanticLayer as originalLayer } from './views.base';
import { vendorScope } from '../analyticsContext';
import { validTimestampSql } from './integrity';

function replaceOnce(sql: string, from: string, to: string): string {
  if (sql.split(from).length !== 2) throw new Error('Semantic source changed; review the versioned integrity transformation');
  return sql.replace(from, to);
}
/** Targeted corrections around the retained base model; never infer observed call dates from a sale. */
export function getBaseSemanticLayer(client: TenantConfiguration): string {
  if (client.dataSourceMode === 'shared') throw new Error('Shared-table tenant isolation has not been verified');
  let sql = originalLayer(client);
  // Replace legacy fallback text with the tenant-owned source or an explicit empty relation.
  for (const role of ['calls','activations'] as const) {
    const previous = client.semanticMappings.tables[role] || (role === 'calls' ? 'dashboards-422710.lead_ledger.lead_ledger_all_vicidial_insights' : 'dashboards-422710.lead_ledger.tbl_blc_activations');
    sql = replaceOnce(sql, 'FROM `' + previous + '`', 'FROM ' + configuredRelation(client, role));
  }
  sql = replaceOnce(sql, '(t.hlc_vendor = v.vendor OR t.hlc_vendor IS NULL)', 't.hlc_vendor = v.vendor');
  sql = sql.replace(/PARSE_TIMESTAMP\('%Y-%m-%d %H:%M:%S', ([a-zA-Z_][a-zA-Z0-9_.]*)\)/g, (_match, column) => validTimestampSql(column));
  sql = replaceOnce(sql,
    'COALESCE(a.activation_date IS NOT NULL, t.hlc_activation_bool, t.activation_timestamp IS NOT NULL) as activation',
    '(a.activation_date IS NOT NULL OR t.activation_timestamp IS NOT NULL) as activation');
  sql = replaceOnce(sql,
    'COALESCE(v.first_call_timestamp, t.hlc_first_call, CASE WHEN COALESCE(v.sale, t.hlc_sale_bool, t.sale_timestamp IS NOT NULL) THEN COALESCE(t.sale_timestamp, t.delivery_timestamp, t.capture_timestamp) END) as first_call_timestamp',
    'COALESCE(v.first_call_timestamp, t.hlc_first_call) as first_call_timestamp');
  sql = replaceOnce(sql,
    'COALESCE(v.last_call_timestamp, t.hlc_last_call, CASE WHEN COALESCE(v.sale, t.hlc_sale_bool, t.sale_timestamp IS NOT NULL) THEN COALESCE(t.sale_timestamp, t.delivery_timestamp, t.capture_timestamp) END) as last_call_timestamp',
    'COALESCE(v.last_call_timestamp, t.hlc_last_call) as last_call_timestamp');
  sql = replaceOnce(sql,
    'GREATEST(COALESCE(v.total_calls, t.hlc_total_calls, 0), CASE WHEN COALESCE(v.sale, t.hlc_sale_bool, t.sale_timestamp IS NOT NULL) THEN 1 ELSE 0 END) as total_calls',
    'COALESCE(v.total_calls, t.hlc_total_calls, 0) as total_calls');
  sql = replaceOnce(sql,
    'COALESCE(t.sale_timestamp, CASE WHEN COALESCE(v.sale, t.hlc_sale_bool) THEN COALESCE(v.last_call_timestamp, t.delivery_timestamp, t.capture_timestamp) END) as sale_timestamp',
    't.sale_timestamp as sale_timestamp');
  sql = replaceOnce(sql, 'MAX(delivery_timestamp) as delivery_timestamp,',
    'MIN(delivery_timestamp) as delivery_timestamp, MIN(sale_timestamp) as sale_timestamp, MIN(activation_timestamp) as activation_timestamp,');
  // The vendor restriction must happen before lead-level aggregation, not only after it.
  const vendor = vendorScope('t.hlc_vendor');
  if (vendor.sql) sql = replaceOnce(sql,
    'LEFT JOIN activations a ON t.hlc_transaction_id = a.transaction_id',
    `LEFT JOIN activations a ON t.hlc_transaction_id = a.transaction_id WHERE ${vendor.sql}`);
  sql = replaceOnce(sql, 'vw_leads AS (', 'lead_rollup AS (');
  sql = replaceOnce(sql, 'vw_ror_events AS (',
    `vw_leads AS (SELECT *, total_transactions AS transaction_count, has_delivery AS delivered, has_call AS called,
      has_rpc AS rpc, has_sale AS sale, has_activation AS activation, total_revenue AS revenue,
      has_billable_sale AS is_billable, total_call_duration_seconds AS talk_time_sec FROM lead_rollup),
    vw_ror_events AS (`);
  return sql;
}
