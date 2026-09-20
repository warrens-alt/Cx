const fs = require('fs');

const viewsCode = `import { ClientDataSource } from './config';
import { SOURCE_OF_TRUTH_REGISTRY } from './registry';

export function getBaseSemanticLayer(client: ClientDataSource) {
  return \`
    WITH base_leads AS (
      SELECT 
        l.lead_id,
        l.consumer_id,
        IFNULL(l.offershop_source, 'Unknown') as source,
        IFNULL(l.offernet_medium, 'Unknown') as medium,
        l.fetched,
        l.valid_lead,
        EXTRACT(YEAR FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', l.fetched)) IN (1900, 1970) as sentinel_capture,
        
        -- Validation & PII (Masked)
        SHA256(l.standardised_idno) as idno_hash,
        SHA256(l.standardised_mobile) as mobile_hash,
        l.valid_idno,
        l.phone_valid,
        
        -- Quality & Vetting
        l.offershop_grade as grade,
        l.offershop_color_vetting as vetting,
        l.hospital_applied,
        
        -- ROR Fields Normalisation (Arrays for scalable event extraction)
        [
          STRUCT('AFFILIATE' as partner, l.ror_affiliate as timestamp),
          STRUCT('BIZVOIP' as partner, l.ror_bizvoip as timestamp),
          STRUCT('BLC' as partner, l.ror_blc as timestamp),
          STRUCT('MTN' as partner, l.ror_mtn as timestamp),
          STRUCT('REWARDSCO' as partner, l.ror_rewardsco as timestamp)
        ] as ror_events,
        
        -- Extract vendor-specific HLC fields for fallbacks and joining
        hlc.vendor as vendor,
        hlc.transaction_id as txn_id,
        CASE WHEN hlc.delivered IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01') THEN NULL ELSE PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', hlc.delivered) END as hlc_delivered,
        CASE WHEN hlc.first_call_date IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01') THEN NULL ELSE PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', hlc.first_call_date) END as hlc_first_call,
        CAST(hlc.total_calls AS INT64) as hlc_total_calls,
        CAST(hlc.rpc AS INT64) > 0 as hlc_rpc,
        hlc.sale IS NOT NULL AND hlc.sale NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') as hlc_sale,
        hlc.activated IS NOT NULL AND hlc.activated NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') as hlc_activation,
        CAST(hlc.revenue_generated AS FLOAT64) as hlc_revenue
      FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.leadLedgerTable}\\\` l
      LEFT JOIN UNNEST(l.hlc_details) as hlc
    ),
    vicidial_summary AS (
      SELECT 
        CAST(dialer_lead_id AS STRING) as dialer_lead_id,
        vendor,
        MIN(
          CASE WHEN call_start_date IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') THEN NULL 
          ELSE PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', call_start_date) END
        ) as first_call_timestamp,
        MAX(
          CASE WHEN call_end_date IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') THEN NULL 
          ELSE PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', call_end_date) END
        ) as last_call_timestamp,
        SUM(CAST(length_in_sec AS INT64)) as total_duration,
        COUNT(*) as total_calls,
        LOGICAL_OR(CAST(is_rpc AS BOOL) = true) as rpc,
        LOGICAL_OR(CAST(is_sale AS BOOL) = true) as sale
      FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.vicidialInsightsTable || 'lead_ledger_all_vicidial_insights'}\\\`
      GROUP BY dialer_lead_id, vendor
    ),
    activations AS (
      SELECT 
        CAST(transaction_id AS STRING) as transaction_id,
        MIN(TIMESTAMP(CAST(date_created AS STRING))) as activation_date,
        MAX(CAST(expected_ontact_revenue AS FLOAT64)) as revenue
      FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.activationsTable || 'tbl_blc_activations'}\\\`
      GROUP BY transaction_id
    ),
    vw_lead_lifecycle AS (
      SELECT
        '\${client.clientId}' as client_id,
        l.vendor,
        CAST(l.lead_id AS STRING) as lead_id,
        PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', l.fetched) as capture_timestamp,
        DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', l.fetched)) as capture_date,
        
        l.source,
        l.medium,
        
        l.valid_lead,
        l.valid_idno,
        l.phone_valid,
        l.grade,
        l.vetting,
        
        l.hlc_delivered as delivery_timestamp,
        
        -- Source of Truth Precedence implementations
        COALESCE(v.first_call_timestamp, l.hlc_first_call) as first_call_timestamp,
        COALESCE(v.total_calls, l.hlc_total_calls, 0) as total_calls,
        COALESCE(v.rpc, l.hlc_rpc, false) as rpc,
        COALESCE(v.sale, l.hlc_sale, false) as sale,
        COALESCE(a.activation_date IS NOT NULL, l.hlc_activation, false) as activation,
        COALESCE(a.revenue, l.hlc_revenue, 0) as revenue,
        
        '\${client.currency}' as currency,
        false as duplicate_flag,
        l.sentinel_capture
      FROM base_leads l
      LEFT JOIN vicidial_summary v ON CAST(l.lead_id AS STRING) = v.dialer_lead_id AND (l.vendor = v.vendor OR l.vendor IS NULL)
      LEFT JOIN activations a ON l.txn_id = a.transaction_id
    )
  \`;
}
`;

fs.writeFileSync('server/bigquery/views.ts', viewsCode);
