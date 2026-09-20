const fs = require('fs');

// 1. Fix config.ts
let config = fs.readFileSync('server/bigquery/config.ts', 'utf8');
config = config.replace(/clientId: 'default'/, "clientId: 'Hospital - INDo Fix'");
fs.writeFileSync('server/bigquery/config.ts', config);

// 2. Fix client.ts
let client = fs.readFileSync('server/bigquery/client.ts', 'utf8');
client = client.replace(/SELECT MAX\(capture_timestamp\)/, "SELECT MAX(fetched)");
fs.writeFileSync('server/bigquery/client.ts', client);

// 3. Fix views.ts
let views = fs.readFileSync('server/bigquery/views.ts', 'utf8');
views = views.replace(/WITH vw_lead_lifecycle AS \([\s\S]*?\)[\s]*`;/m, `WITH vw_lead_lifecycle AS (
      SELECT
        '\${client.clientId}' as client_id,
        lead_id,
        PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched) as capture_timestamp,
        DATE(PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched)) as capture_date,
        
        IFNULL(offershop_source, 'Unknown') as source,
        IFNULL(offernet_medium, 'Unknown') as medium,
        
        valid_lead,
        
        (SELECT PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', delivered) FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' AND delivered IS NOT NULL AND delivered != '1970-01-01 00:00:01' LIMIT 1) as delivery_timestamp,
        (SELECT PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date) FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' AND first_call_date IS NOT NULL AND first_call_date != '1970-01-01 00:00:01' LIMIT 1) as first_call_timestamp,
        
        (SELECT total_calls FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' LIMIT 1) as total_calls,
        
        (SELECT rpc > 0 FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' LIMIT 1) as rpc,
        (SELECT sale IS NOT NULL AND sale NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' LIMIT 1) as sale,
        (SELECT activated IS NOT NULL AND activated NOT IN ('1900-01-01 00:00:01', '1970-01-01 00:00:01', '') FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' LIMIT 1) as activation,
        
        (SELECT revenue_generated FROM UNNEST(hlc_details) WHERE vendor = '\${client.clientId}' LIMIT 1) as revenue,
        '\${client.currency}' as currency,
        
        false as duplicate_flag,
        
        EXTRACT(YEAR FROM PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched)) IN (1900, 1970) as sentinel_capture
      FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.leadLedgerTable}\\\`
    )
  \`;`);
fs.writeFileSync('server/bigquery/views.ts', views);
