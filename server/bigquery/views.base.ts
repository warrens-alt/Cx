import type { TenantConfiguration } from './config';
import { validTimestampSql } from './integrity';

export interface SemanticLayerOptions {
  callsRelation?: string;
  activationsRelation?: string;
  transactionVendorPredicate?: string;
  callVendorPredicate?: string;
}

export function getBaseSemanticLayer(client: TenantConfiguration, options: SemanticLayerOptions = {}) {
  const callsRelation = options.callsRelation ?? `\`${client.semanticMappings.tables.calls || 'dashboards-422710.lead_ledger.lead_ledger_all_vicidial_insights'}\``;
  const activationsRelation = options.activationsRelation ?? `\`${client.semanticMappings.tables.activations || 'dashboards-422710.lead_ledger.tbl_blc_activations'}\``;
  const transactionVendorWhere = options.transactionVendorPredicate ? `WHERE ${options.transactionVendorPredicate}` : '';
  const callVendorWhere = options.callVendorPredicate ? `WHERE ${options.callVendorPredicate}` : '';
  const partners = client.semanticMappings.partners || [];
  const rorStructs = partners.map(p => {
    const col = 'ror_' + p.toLowerCase();
    const part = p.toUpperCase();
    return `STRUCT('${part}' as partner, ${validTimestampSql(`l.${col}`)} as ts)`;
  }).join(',\n            ');

  return `
    WITH base_leads AS (
      SELECT 
        l.lead_id,
        l.consumer_id,
        IFNULL(l.offershop_source, 'Unknown') as source,
        IFNULL(l.offernet_medium, 'Unknown') as medium,
        l.fetched,
        l.valid_lead,
        REGEXP_CONTAINS(TRIM(CAST(l.fetched AS STRING)), r'^(1900|1970)(-|$)') as sentinel_capture,
        ${validTimestampSql('l.fetched')} as capture_timestamp,
        DATE(${validTimestampSql('l.fetched')}) as capture_date,
        (LOWER(l.offershop_source) LIKE '%revet%' OR LOWER(l.offershop_source) LIKE '%re-vet%') as is_revetted,
        
        -- Validation & PII (Masked)
        SHA256(l.standardised_idno) as idno_hash,
        SHA256(l.standardised_mobile) as mobile_hash,
        l.valid_idno,
        l.phone_valid,
        
        -- Processing timestamps (not PII)
        ${validTimestampSql('l.standardised_idno')} as standardised_idno_ts,
        ${validTimestampSql('l.standardised_mobile')} as standardised_mobile_ts,
        
        -- Quality & Vetting
        l.offershop_grade as grade,
        CASE 
          WHEN l.offershop_color_vetting LIKE 'Orange,%' THEN 'Orange'
          WHEN l.offershop_color_vetting LIKE 'Charcoal,%' THEN 'Charcoal'
          WHEN l.offershop_color_vetting LIKE 'Blue,%' THEN 'Blue'
          WHEN l.offershop_color_vetting LIKE 'Green,%' THEN 'Green'
          ELSE l.offershop_color_vetting 
        END as vetting,
        ${validTimestampSql('l.hospital_applied_date')} as hospital_applied_date,
        l.hospital_applied,
        CASE 
          WHEN (l.hospital_applied = 'true' AND (l.hospital_applied_date IS NULL OR l.hospital_applied_date LIKE '1900%' OR l.hospital_applied_date = '')) 
            OR (l.hospital_applied = 'false' AND l.hospital_applied_date NOT LIKE '1900%' AND l.hospital_applied_date IS NOT NULL AND l.hospital_applied_date != '') 
          THEN true ELSE false 
        END as hospital_applied_inconsistent,
        
        -- ROR Fields Normalisation (Filtered of sentinels)
        ARRAY(
          SELECT AS STRUCT partner, ts as timestamp
          FROM UNNEST([
            ${rorStructs}
          ])
          WHERE ts IS NOT NULL
        ) as valid_ror_events,
        
        l.hlc_details
      FROM \`${client.semanticMappings.tables.leads}\` l
      ${client.dataSourceMode === 'shared' && client.sharedTenantIdField ? `WHERE l.${client.sharedTenantIdField} = '${client.sharedTenantIdValue}'` : ''}
    ),
    unpacked_transactions AS (
      SELECT 
        l.* EXCEPT(hlc_details),
        idx + 1 as hlc_record_number,
        hlc.vendor as hlc_vendor,
        hlc.transaction_id as hlc_transaction_id,
        hlc.status as hlc_status,
        CASE 
          WHEN LOWER(hlc.status) LIKE '%approv%' OR LOWER(hlc.status) LIKE '%accept%' OR LOWER(hlc.status) LIKE '%success%' THEN 'Approved'
          WHEN LOWER(hlc.status) LIKE '%declin%' OR LOWER(hlc.status) LIKE '%reject%' OR LOWER(hlc.status) LIKE '%fail%' OR LOWER(hlc.status) LIKE '%cancel%' THEN 'Declined'
          WHEN LOWER(hlc.status) LIKE '%duplicat%' OR LOWER(hlc.status) LIKE '%exist%' THEN 'Duplicate'
          WHEN LOWER(hlc.status) LIKE '%pend%' OR LOWER(hlc.status) LIKE '%process%' OR LOWER(hlc.status) LIKE '%wait%' THEN 'Pending'
          WHEN LOWER(hlc.status) LIKE '%vet%' OR LOWER(hlc.status) LIKE '%qual%' OR LOWER(hlc.status) LIKE '%score%' THEN 'Quality/Vetting'
          WHEN LOWER(hlc.status) LIKE '%activat%' THEN 'Activation'
          ELSE 'Other'
        END as normalised_status_family,
        ${validTimestampSql('hlc.attempted_to_deliver')} as attempted_delivery_timestamp,
        ${validTimestampSql('hlc.delivered')} as delivery_timestamp,
        ${validTimestampSql('hlc.expected_first_dial')} as expected_first_dial_timestamp,
        SAFE_CAST(hlc.new_dialer_lead AS INT64) as new_dialer_lead,
        ${validTimestampSql('hlc.first_call_date')} as hlc_first_call,
        ${validTimestampSql('hlc.last_call_date')} as hlc_last_call,
        hlc.last_dialer_status,
        SAFE_CAST(hlc.last_call_length_in_sec AS INT64) as hlc_last_call_duration,
        SAFE_CAST(hlc.total_calls_length_in_sec AS INT64) as hlc_total_call_duration,
        SAFE_CAST(hlc.total_calls AS INT64) as hlc_total_calls,
        SAFE_CAST(hlc.rpc AS INT64) > 0 as hlc_rpc,
        hlc.sale IS NOT NULL AND hlc.sale NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') as hlc_sale_bool,
        ${validTimestampSql('hlc.sale')} as sale_timestamp,
        hlc.activated IS NOT NULL AND hlc.activated NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') as hlc_activation_bool,
        ${validTimestampSql('hlc.activated')} as activation_timestamp,
        SAFE_CAST(hlc.revenue_generated AS NUMERIC) as hlc_revenue_generated
      FROM base_leads l
      LEFT JOIN UNNEST(l.hlc_details) as hlc WITH OFFSET as idx
    ),
    vicidial_summary AS (
      SELECT 
        CAST(dialer_lead_id AS STRING) as dialer_lead_id,
        vendor,
        MIN(${validTimestampSql('call_start_date')}) as first_call_timestamp,
        MAX(${validTimestampSql('call_end_date')}) as last_call_timestamp,
        SUM(SAFE_CAST(length_in_sec AS INT64)) as total_duration,
        COUNT(*) as total_calls,
        LOGICAL_OR(SAFE_CAST(is_rpc AS BOOL) = true) as rpc,
        LOGICAL_OR(SAFE_CAST(is_sale AS BOOL) = true) as sale
      FROM ${callsRelation}
      ${callVendorWhere}
      GROUP BY dialer_lead_id, vendor
    ),
    lead_call_summary AS (
      SELECT
        dialer_lead_id as lead_id,
        MIN(first_call_timestamp) as first_call_timestamp,
        MAX(last_call_timestamp) as last_call_timestamp,
        SUM(total_duration) as total_duration,
        SUM(total_calls) as total_calls,
        LOGICAL_OR(rpc = true) as observed_rpc,
        COUNT(*) as vendor_call_populations
      FROM vicidial_summary
      GROUP BY dialer_lead_id
    ),
    activations AS (
      SELECT 
        CAST(transaction_id AS STRING) as transaction_id,
        MIN(${validTimestampSql('date_created')}) as activation_date,
        MAX(SAFE_CAST(expected_ontact_revenue AS NUMERIC)) as revenue
      FROM ${activationsRelation}
      GROUP BY transaction_id
    ),
    vw_lead_vendor_transactions AS (
      SELECT
        '${client.id}' as client_id,
        t.lead_id,
        t.consumer_id,
        t.hlc_record_number,
        t.hlc_vendor as vendor,
        t.hlc_transaction_id as transaction_id,
        
        t.capture_timestamp,
        t.capture_date,
        t.is_revetted,
        ARRAY_LENGTH(t.valid_ror_events) as routing_depth,
        
        t.source,
        t.medium,
        
        t.valid_lead,
        t.valid_idno,
        t.phone_valid,
        t.grade,
        t.vetting,
        t.hospital_applied_inconsistent,
        t.standardised_idno_ts,
        t.standardised_mobile_ts,
        
        t.attempted_delivery_timestamp,
        t.delivery_timestamp,
        
        -- Sale and contact remain separate evidence. A sale never manufactures an RPC or call event.
        t.sale_timestamp as sale_timestamp,
        COALESCE(v.sale, t.hlc_sale_bool, t.sale_timestamp IS NOT NULL) as sale,
        (COALESCE(v.sale, t.hlc_sale_bool, t.sale_timestamp IS NOT NULL) AND COALESCE(a.revenue, t.hlc_revenue_generated, 0) > 0) as is_billable_sale,
        v.rpc as rpc,
        v.rpc as observed_rpc,
        t.hlc_rpc as legacy_rpc_flag,
        CASE WHEN v.dialer_lead_id IS NOT NULL THEN 'OBSERVED' WHEN t.hlc_rpc THEN 'LEGACY_FLAG_ONLY' ELSE 'UNKNOWN' END as contact_evidence_status,
        
        COALESCE(v.first_call_timestamp, t.hlc_first_call) as first_call_timestamp,
        COALESCE(v.last_call_timestamp, t.hlc_last_call) as last_call_timestamp,
        t.last_dialer_status as latest_dialer_status,
        t.normalised_status_family,
        v.total_calls as total_calls,
        v.total_duration as total_call_duration_seconds,
        t.hlc_total_calls as legacy_total_calls_counter,
        t.hlc_total_call_duration as legacy_total_call_duration_counter,
        
        COALESCE(a.activation_date, t.activation_timestamp) as activation_timestamp,
        (a.activation_date IS NOT NULL OR t.activation_timestamp IS NOT NULL) as activation,
        
        COALESCE(a.revenue, t.hlc_revenue_generated, 0) as revenue,
        
        '${client.currency}' as currency,
        false as duplicate_flag,
        t.sentinel_capture
      FROM unpacked_transactions t
      LEFT JOIN vicidial_summary v ON CAST(t.lead_id AS STRING) = v.dialer_lead_id AND t.hlc_vendor = v.vendor
      LEFT JOIN activations a ON t.hlc_transaction_id = a.transaction_id
      ${transactionVendorWhere}
    ),
    lead_rollup AS (
      SELECT
        client_id,
        lead_id,
        MAX(consumer_id) as consumer_id,
        MAX(capture_timestamp) as capture_timestamp,
        MAX(capture_date) as capture_date,
        MAX(source) as source,
        MAX(medium) as medium,
        MAX(CASE WHEN hlc_record_number = 1 THEN vendor END) as vendor,
        LOGICAL_OR(is_revetted) as is_revetted,
        MAX(routing_depth) as routing_depth,
        LOGICAL_OR(CAST(valid_lead AS BOOL) = true) as valid_lead,
        LOGICAL_OR(CAST(valid_idno AS BOOL) = true) as valid_idno,
        LOGICAL_OR(CAST(phone_valid AS BOOL) = true) as phone_valid,
        MAX(grade) as grade,
        MAX(vetting) as vetting,
        LOGICAL_OR(hospital_applied_inconsistent) as hospital_applied_inconsistent,
        
        COUNT(DISTINCT vendor) as vendor_count,
        COUNT(DISTINCT transaction_id) as total_transactions,
        
        LOGICAL_OR(delivery_timestamp IS NOT NULL) as has_delivery,
        LOGICAL_OR(first_call_timestamp IS NOT NULL) as has_call,
        LOGICAL_OR(rpc = true) as has_rpc,
        LOGICAL_OR(legacy_rpc_flag = true) as has_legacy_rpc_flag,
        LOGICAL_OR(contact_evidence_status = 'UNKNOWN') as contact_unknown,
        LOGICAL_OR(sale) as has_sale,
        LOGICAL_OR(is_billable_sale) as has_billable_sale,
        LOGICAL_OR(activation) as has_activation,
        
        MIN(delivery_timestamp) as delivery_timestamp,
        MIN(sale_timestamp) as sale_timestamp,
        MIN(activation_timestamp) as activation_timestamp,
        MIN(first_call_timestamp) as first_call_timestamp,
        MAX(last_call_timestamp) as last_call_timestamp,
        SUM(revenue) as total_revenue,
        MAX(CASE WHEN hlc_record_number = 1 THEN vendor END) as hlc_1_vendor,
        MAX(CASE WHEN hlc_record_number = 1 THEN transaction_id END) as hlc_1_transaction_id,
        MAX(CASE WHEN hlc_record_number = 1 THEN latest_dialer_status END) as hlc_1_status,
        MAX(CASE WHEN hlc_record_number = 1 THEN attempted_delivery_timestamp END) as hlc_1_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 1 THEN delivery_timestamp END) as hlc_1_delivered,
        MAX(CASE WHEN hlc_record_number = 1 THEN first_call_timestamp END) as hlc_1_first_call_date,
        MAX(CASE WHEN hlc_record_number = 1 THEN last_call_timestamp END) as hlc_1_last_call_date,
        MAX(CASE WHEN hlc_record_number = 1 THEN latest_dialer_status END) as hlc_1_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 1 THEN legacy_total_call_duration_counter END) as hlc_1_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 1 THEN legacy_total_calls_counter END) as hlc_1_total_calls,
        MAX(CASE WHEN hlc_record_number = 1 THEN legacy_rpc_flag END) as hlc_1_rpc,
        MAX(CASE WHEN hlc_record_number = 1 THEN sale END) as hlc_1_sale,
        MAX(CASE WHEN hlc_record_number = 1 THEN activation END) as hlc_1_activated,
        MAX(CASE WHEN hlc_record_number = 1 THEN revenue END) as hlc_1_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 1 THEN currency END) as hlc_1_currency,
        MAX(CASE WHEN hlc_record_number = 2 THEN vendor END) as hlc_2_vendor,
        MAX(CASE WHEN hlc_record_number = 2 THEN transaction_id END) as hlc_2_transaction_id,
        MAX(CASE WHEN hlc_record_number = 2 THEN latest_dialer_status END) as hlc_2_status,
        MAX(CASE WHEN hlc_record_number = 2 THEN attempted_delivery_timestamp END) as hlc_2_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 2 THEN delivery_timestamp END) as hlc_2_delivered,
        MAX(CASE WHEN hlc_record_number = 2 THEN first_call_timestamp END) as hlc_2_first_call_date,
        MAX(CASE WHEN hlc_record_number = 2 THEN last_call_timestamp END) as hlc_2_last_call_date,
        MAX(CASE WHEN hlc_record_number = 2 THEN latest_dialer_status END) as hlc_2_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 2 THEN legacy_total_call_duration_counter END) as hlc_2_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 2 THEN legacy_total_calls_counter END) as hlc_2_total_calls,
        MAX(CASE WHEN hlc_record_number = 2 THEN legacy_rpc_flag END) as hlc_2_rpc,
        MAX(CASE WHEN hlc_record_number = 2 THEN sale END) as hlc_2_sale,
        MAX(CASE WHEN hlc_record_number = 2 THEN activation END) as hlc_2_activated,
        MAX(CASE WHEN hlc_record_number = 2 THEN revenue END) as hlc_2_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 2 THEN currency END) as hlc_2_currency,
        MAX(CASE WHEN hlc_record_number = 3 THEN vendor END) as hlc_3_vendor,
        MAX(CASE WHEN hlc_record_number = 3 THEN transaction_id END) as hlc_3_transaction_id,
        MAX(CASE WHEN hlc_record_number = 3 THEN latest_dialer_status END) as hlc_3_status,
        MAX(CASE WHEN hlc_record_number = 3 THEN attempted_delivery_timestamp END) as hlc_3_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 3 THEN delivery_timestamp END) as hlc_3_delivered,
        MAX(CASE WHEN hlc_record_number = 3 THEN first_call_timestamp END) as hlc_3_first_call_date,
        MAX(CASE WHEN hlc_record_number = 3 THEN last_call_timestamp END) as hlc_3_last_call_date,
        MAX(CASE WHEN hlc_record_number = 3 THEN latest_dialer_status END) as hlc_3_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 3 THEN legacy_total_call_duration_counter END) as hlc_3_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 3 THEN legacy_total_calls_counter END) as hlc_3_total_calls,
        MAX(CASE WHEN hlc_record_number = 3 THEN legacy_rpc_flag END) as hlc_3_rpc,
        MAX(CASE WHEN hlc_record_number = 3 THEN sale END) as hlc_3_sale,
        MAX(CASE WHEN hlc_record_number = 3 THEN activation END) as hlc_3_activated,
        MAX(CASE WHEN hlc_record_number = 3 THEN revenue END) as hlc_3_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 3 THEN currency END) as hlc_3_currency,
        MAX(CASE WHEN hlc_record_number = 4 THEN vendor END) as hlc_4_vendor,
        MAX(CASE WHEN hlc_record_number = 4 THEN transaction_id END) as hlc_4_transaction_id,
        MAX(CASE WHEN hlc_record_number = 4 THEN latest_dialer_status END) as hlc_4_status,
        MAX(CASE WHEN hlc_record_number = 4 THEN attempted_delivery_timestamp END) as hlc_4_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 4 THEN delivery_timestamp END) as hlc_4_delivered,
        MAX(CASE WHEN hlc_record_number = 4 THEN first_call_timestamp END) as hlc_4_first_call_date,
        MAX(CASE WHEN hlc_record_number = 4 THEN last_call_timestamp END) as hlc_4_last_call_date,
        MAX(CASE WHEN hlc_record_number = 4 THEN latest_dialer_status END) as hlc_4_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 4 THEN legacy_total_call_duration_counter END) as hlc_4_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 4 THEN legacy_total_calls_counter END) as hlc_4_total_calls,
        MAX(CASE WHEN hlc_record_number = 4 THEN legacy_rpc_flag END) as hlc_4_rpc,
        MAX(CASE WHEN hlc_record_number = 4 THEN sale END) as hlc_4_sale,
        MAX(CASE WHEN hlc_record_number = 4 THEN activation END) as hlc_4_activated,
        MAX(CASE WHEN hlc_record_number = 4 THEN revenue END) as hlc_4_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 4 THEN currency END) as hlc_4_currency,
        MAX(CASE WHEN hlc_record_number = 5 THEN vendor END) as hlc_5_vendor,
        MAX(CASE WHEN hlc_record_number = 5 THEN transaction_id END) as hlc_5_transaction_id,
        MAX(CASE WHEN hlc_record_number = 5 THEN latest_dialer_status END) as hlc_5_status,
        MAX(CASE WHEN hlc_record_number = 5 THEN attempted_delivery_timestamp END) as hlc_5_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 5 THEN delivery_timestamp END) as hlc_5_delivered,
        MAX(CASE WHEN hlc_record_number = 5 THEN first_call_timestamp END) as hlc_5_first_call_date,
        MAX(CASE WHEN hlc_record_number = 5 THEN last_call_timestamp END) as hlc_5_last_call_date,
        MAX(CASE WHEN hlc_record_number = 5 THEN latest_dialer_status END) as hlc_5_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 5 THEN legacy_total_call_duration_counter END) as hlc_5_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 5 THEN legacy_total_calls_counter END) as hlc_5_total_calls,
        MAX(CASE WHEN hlc_record_number = 5 THEN legacy_rpc_flag END) as hlc_5_rpc,
        MAX(CASE WHEN hlc_record_number = 5 THEN sale END) as hlc_5_sale,
        MAX(CASE WHEN hlc_record_number = 5 THEN activation END) as hlc_5_activated,
        MAX(CASE WHEN hlc_record_number = 5 THEN revenue END) as hlc_5_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 5 THEN currency END) as hlc_5_currency,
        MAX(CASE WHEN hlc_record_number = 6 THEN vendor END) as hlc_6_vendor,
        MAX(CASE WHEN hlc_record_number = 6 THEN transaction_id END) as hlc_6_transaction_id,
        MAX(CASE WHEN hlc_record_number = 6 THEN latest_dialer_status END) as hlc_6_status,
        MAX(CASE WHEN hlc_record_number = 6 THEN attempted_delivery_timestamp END) as hlc_6_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 6 THEN delivery_timestamp END) as hlc_6_delivered,
        MAX(CASE WHEN hlc_record_number = 6 THEN first_call_timestamp END) as hlc_6_first_call_date,
        MAX(CASE WHEN hlc_record_number = 6 THEN last_call_timestamp END) as hlc_6_last_call_date,
        MAX(CASE WHEN hlc_record_number = 6 THEN latest_dialer_status END) as hlc_6_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 6 THEN legacy_total_call_duration_counter END) as hlc_6_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 6 THEN legacy_total_calls_counter END) as hlc_6_total_calls,
        MAX(CASE WHEN hlc_record_number = 6 THEN legacy_rpc_flag END) as hlc_6_rpc,
        MAX(CASE WHEN hlc_record_number = 6 THEN sale END) as hlc_6_sale,
        MAX(CASE WHEN hlc_record_number = 6 THEN activation END) as hlc_6_activated,
        MAX(CASE WHEN hlc_record_number = 6 THEN revenue END) as hlc_6_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 6 THEN currency END) as hlc_6_currency,
        MAX(CASE WHEN hlc_record_number = 7 THEN vendor END) as hlc_7_vendor,
        MAX(CASE WHEN hlc_record_number = 7 THEN transaction_id END) as hlc_7_transaction_id,
        MAX(CASE WHEN hlc_record_number = 7 THEN latest_dialer_status END) as hlc_7_status,
        MAX(CASE WHEN hlc_record_number = 7 THEN attempted_delivery_timestamp END) as hlc_7_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 7 THEN delivery_timestamp END) as hlc_7_delivered,
        MAX(CASE WHEN hlc_record_number = 7 THEN first_call_timestamp END) as hlc_7_first_call_date,
        MAX(CASE WHEN hlc_record_number = 7 THEN last_call_timestamp END) as hlc_7_last_call_date,
        MAX(CASE WHEN hlc_record_number = 7 THEN latest_dialer_status END) as hlc_7_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 7 THEN legacy_total_call_duration_counter END) as hlc_7_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 7 THEN legacy_total_calls_counter END) as hlc_7_total_calls,
        MAX(CASE WHEN hlc_record_number = 7 THEN legacy_rpc_flag END) as hlc_7_rpc,
        MAX(CASE WHEN hlc_record_number = 7 THEN sale END) as hlc_7_sale,
        MAX(CASE WHEN hlc_record_number = 7 THEN activation END) as hlc_7_activated,
        MAX(CASE WHEN hlc_record_number = 7 THEN revenue END) as hlc_7_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 7 THEN currency END) as hlc_7_currency,
        MAX(CASE WHEN hlc_record_number = 8 THEN vendor END) as hlc_8_vendor,
        MAX(CASE WHEN hlc_record_number = 8 THEN transaction_id END) as hlc_8_transaction_id,
        MAX(CASE WHEN hlc_record_number = 8 THEN latest_dialer_status END) as hlc_8_status,
        MAX(CASE WHEN hlc_record_number = 8 THEN attempted_delivery_timestamp END) as hlc_8_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 8 THEN delivery_timestamp END) as hlc_8_delivered,
        MAX(CASE WHEN hlc_record_number = 8 THEN first_call_timestamp END) as hlc_8_first_call_date,
        MAX(CASE WHEN hlc_record_number = 8 THEN last_call_timestamp END) as hlc_8_last_call_date,
        MAX(CASE WHEN hlc_record_number = 8 THEN latest_dialer_status END) as hlc_8_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 8 THEN legacy_total_call_duration_counter END) as hlc_8_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 8 THEN legacy_total_calls_counter END) as hlc_8_total_calls,
        MAX(CASE WHEN hlc_record_number = 8 THEN legacy_rpc_flag END) as hlc_8_rpc,
        MAX(CASE WHEN hlc_record_number = 8 THEN sale END) as hlc_8_sale,
        MAX(CASE WHEN hlc_record_number = 8 THEN activation END) as hlc_8_activated,
        MAX(CASE WHEN hlc_record_number = 8 THEN revenue END) as hlc_8_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 8 THEN currency END) as hlc_8_currency,
        MAX(CASE WHEN hlc_record_number = 9 THEN vendor END) as hlc_9_vendor,
        MAX(CASE WHEN hlc_record_number = 9 THEN transaction_id END) as hlc_9_transaction_id,
        MAX(CASE WHEN hlc_record_number = 9 THEN latest_dialer_status END) as hlc_9_status,
        MAX(CASE WHEN hlc_record_number = 9 THEN attempted_delivery_timestamp END) as hlc_9_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 9 THEN delivery_timestamp END) as hlc_9_delivered,
        MAX(CASE WHEN hlc_record_number = 9 THEN first_call_timestamp END) as hlc_9_first_call_date,
        MAX(CASE WHEN hlc_record_number = 9 THEN last_call_timestamp END) as hlc_9_last_call_date,
        MAX(CASE WHEN hlc_record_number = 9 THEN latest_dialer_status END) as hlc_9_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 9 THEN legacy_total_call_duration_counter END) as hlc_9_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 9 THEN legacy_total_calls_counter END) as hlc_9_total_calls,
        MAX(CASE WHEN hlc_record_number = 9 THEN legacy_rpc_flag END) as hlc_9_rpc,
        MAX(CASE WHEN hlc_record_number = 9 THEN sale END) as hlc_9_sale,
        MAX(CASE WHEN hlc_record_number = 9 THEN activation END) as hlc_9_activated,
        MAX(CASE WHEN hlc_record_number = 9 THEN revenue END) as hlc_9_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 9 THEN currency END) as hlc_9_currency,
        MAX(CASE WHEN hlc_record_number = 10 THEN vendor END) as hlc_10_vendor,
        MAX(CASE WHEN hlc_record_number = 10 THEN transaction_id END) as hlc_10_transaction_id,
        MAX(CASE WHEN hlc_record_number = 10 THEN latest_dialer_status END) as hlc_10_status,
        MAX(CASE WHEN hlc_record_number = 10 THEN attempted_delivery_timestamp END) as hlc_10_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = 10 THEN delivery_timestamp END) as hlc_10_delivered,
        MAX(CASE WHEN hlc_record_number = 10 THEN first_call_timestamp END) as hlc_10_first_call_date,
        MAX(CASE WHEN hlc_record_number = 10 THEN last_call_timestamp END) as hlc_10_last_call_date,
        MAX(CASE WHEN hlc_record_number = 10 THEN latest_dialer_status END) as hlc_10_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = 10 THEN legacy_total_call_duration_counter END) as hlc_10_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = 10 THEN legacy_total_calls_counter END) as hlc_10_total_calls,
        MAX(CASE WHEN hlc_record_number = 10 THEN legacy_rpc_flag END) as hlc_10_rpc,
        MAX(CASE WHEN hlc_record_number = 10 THEN sale END) as hlc_10_sale,
        MAX(CASE WHEN hlc_record_number = 10 THEN activation END) as hlc_10_activated,
        MAX(CASE WHEN hlc_record_number = 10 THEN revenue END) as hlc_10_revenue_generated,
        MAX(CASE WHEN hlc_record_number = 10 THEN currency END) as hlc_10_currency,
        LOGICAL_OR(sentinel_capture) as sentinel_capture,
        false as duplicate_flag
      FROM vw_lead_vendor_transactions
      GROUP BY client_id, lead_id
    ),
    vw_leads AS (
      SELECT
        lr.* EXCEPT(first_call_timestamp, last_call_timestamp, has_call, has_rpc, contact_unknown),
        (c.total_calls IS NOT NULL AND c.total_calls > 0) OR lr.has_call as has_call,
        c.observed_rpc as has_rpc,
        c.total_calls IS NULL as contact_unknown,
        c.total_calls as total_calls,
        c.total_duration as total_call_duration_seconds,
        COALESCE(c.first_call_timestamp, lr.first_call_timestamp) as first_call_timestamp,
        COALESCE(c.last_call_timestamp, lr.last_call_timestamp) as last_call_timestamp,
        lr.total_transactions as transaction_count,
        lr.has_delivery as delivered,
        ((c.total_calls IS NOT NULL AND c.total_calls > 0) OR lr.has_call) as called,
        c.observed_rpc as rpc,
        lr.has_sale as sale,
        lr.has_activation as activation,
        lr.total_revenue as revenue,
        lr.has_billable_sale as is_billable,
        c.total_duration as talk_time_sec,
        c.vendor_call_populations
      FROM lead_rollup lr
      LEFT JOIN lead_call_summary c ON CAST(lr.lead_id AS STRING) = c.lead_id
    ),
    vw_ror_events AS (
      SELECT 
        l.lead_id,
        l.consumer_id,
        l.capture_timestamp,
        l.capture_date,
        r.partner,
        r.timestamp as ror_timestamp,
        ROW_NUMBER() OVER(PARTITION BY l.lead_id ORDER BY r.timestamp ASC, r.partner ASC) as route_sequence,
        LAG(r.partner) OVER(PARTITION BY l.lead_id ORDER BY r.timestamp ASC, r.partner ASC) as previous_partner,
        LEAD(r.partner) OVER(PARTITION BY l.lead_id ORDER BY r.timestamp ASC, r.partner ASC) as next_partner,
        TIMESTAMP_DIFF(
          r.timestamp,
          LAG(r.timestamp) OVER(PARTITION BY l.lead_id ORDER BY r.timestamp ASC, r.partner ASC),
          SECOND
        ) as time_from_previous_route_sec
      FROM base_leads l,
      UNNEST(l.valid_ror_events) as r
    ),
    vw_consumers AS (
      SELECT 
        consumer_id,
        MIN(capture_timestamp) as first_lead_date,
        MAX(capture_timestamp) as latest_lead_date,
        COUNT(DISTINCT lead_id) as lead_count,
        COUNT(DISTINCT source) as unique_source_count,
        COUNT(DISTINCT vendor) as unique_vendor_count,
        COUNT(DISTINCT transaction_id) as transaction_count,
        MAX(routing_depth) as max_routing_depth,
        COUNT(DISTINCT CASE WHEN is_revetted THEN lead_id END) as revetted_lead_count,
        LOGICAL_OR(delivery_timestamp IS NOT NULL) as has_delivery,
        LOGICAL_OR(first_call_timestamp IS NOT NULL) as has_call,
        LOGICAL_OR(rpc) as has_rpc,
        LOGICAL_OR(sale) as has_sale,
        LOGICAL_OR(is_billable_sale) as has_billable_sale,
        LOGICAL_OR(activation) as has_activation,
        SUM(revenue) as total_revenue
      FROM vw_lead_vendor_transactions
      WHERE consumer_id > 0
      GROUP BY consumer_id
    ),
    vw_commercial_events AS (
      SELECT 
        lead_id,
        consumer_id,
        vendor,
        transaction_id,
        sale_timestamp,
        activation_timestamp,
        is_billable_sale,
        revenue,
        currency,
        latest_dialer_status,
        normalised_status_family,
        source,
        medium,
        capture_timestamp
      FROM vw_lead_vendor_transactions
      WHERE sale = true OR revenue > 0 OR activation = true
    )
  `;
}
