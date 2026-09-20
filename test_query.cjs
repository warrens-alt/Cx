const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

async function test() {
  const bq = new BigQuery({ 
    projectId: 'dashboards-422710',
    credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  });
  
  const query = `
    WITH base_leads AS (
      SELECT 
        lead_id,
        consumer_id,
        IFNULL(offershop_source, 'Unknown') as source,
        IFNULL(offernet_medium, 'Unknown') as medium,
        fetched,
        valid_lead,
        EXTRACT(YEAR FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched)) IN (1900, 1970) as sentinel_capture,
        
        (SELECT transaction_id FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as txn_id,
        (SELECT PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', delivered) FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' AND delivered IS NOT NULL AND delivered != '1970-01-01 00:00:01' LIMIT 1) as hlc_delivered,
        (SELECT PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date) FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' AND first_call_date IS NOT NULL AND first_call_date != '1970-01-01 00:00:01' LIMIT 1) as hlc_first_call,
        (SELECT CAST(total_calls AS INT64) FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as hlc_total_calls,
        (SELECT CAST(rpc AS INT64) > 0 FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as hlc_rpc,
        (SELECT sale IS NOT NULL AND sale NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as hlc_sale,
        (SELECT activated IS NOT NULL AND activated NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as hlc_activation,
        (SELECT CAST(revenue_generated AS FLOAT64) FROM UNNEST(hlc_details) WHERE vendor = 'Hospital - INDo Fix' LIMIT 1) as hlc_revenue
      FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\`
      LIMIT 10
    ),
    vicidial_summary AS (
      SELECT 
        CAST(dialer_lead_id AS STRING) as dialer_lead_id, 
        MIN(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', call_start_date)) as first_call_timestamp,
        SUM(CAST(length_in_sec AS INT64)) as total_duration,
        COUNT(*) as total_calls,
        LOGICAL_OR(CAST(is_rpc AS BOOL) = true) as rpc,
        LOGICAL_OR(CAST(is_sale AS BOOL) = true) as sale
      FROM \`dashboards-422710.lead_ledger.lead_ledger_all_vicidial_insights\`
      WHERE vendor = 'Hospital - INDo Fix'
      GROUP BY dialer_lead_id
    ),
    activations AS (
      SELECT 
        CAST(transaction_id AS STRING) as transaction_id,
        MIN(TIMESTAMP(CAST(date_created AS STRING))) as activation_date,
        MAX(CAST(expected_ontact_revenue AS FLOAT64)) as revenue
      FROM \`dashboards-422710.lead_ledger.tbl_blc_activations\`
      GROUP BY transaction_id
    ),
    vw_lead_lifecycle AS (
      SELECT
        'Hospital - INDo Fix' as client_id,
        CAST(l.lead_id AS STRING) as lead_id,
        PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', l.fetched) as capture_timestamp,
        DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', l.fetched)) as capture_date,
        
        l.source,
        l.medium,
        
        l.valid_lead,
        
        l.hlc_delivered as delivery_timestamp,
        
        COALESCE(v.first_call_timestamp, l.hlc_first_call) as first_call_timestamp,
        COALESCE(v.total_calls, l.hlc_total_calls, 0) as total_calls,
        COALESCE(v.rpc, l.hlc_rpc, false) as rpc,
        COALESCE(v.sale, l.hlc_sale, false) as sale,
        COALESCE(a.activation_date IS NOT NULL, l.hlc_activation, false) as activation,
        COALESCE(a.revenue, l.hlc_revenue, 0) as revenue,
        
        'ZAR' as currency,
        false as duplicate_flag,
        l.sentinel_capture
      FROM base_leads l
      LEFT JOIN vicidial_summary v ON CAST(l.lead_id AS STRING) = v.dialer_lead_id
      LEFT JOIN activations a ON l.txn_id = a.transaction_id
    )
    SELECT * FROM vw_lead_lifecycle LIMIT 5
  `;
  try {
    const [rows] = await bq.query(query);
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
}

test();
