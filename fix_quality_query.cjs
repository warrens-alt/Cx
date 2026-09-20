const fs = require('fs');
let queries = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const regex = /export async function getDataHealthStats[\s\S]*?return rows\[0\] \|\| null;\n\}/m;
const replacement = `export async function getDataHealthStats(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.projectId);
  const { sql, queryParams } = buildWhereClause(params);
  
  const query = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      COUNT(lead_id) as total_leads,
      COUNTIF(sentinel_capture = true) as sentinel_captures,
      COUNTIF(delivery_timestamp IS NULL AND rpc = true) as missing_delivery_with_rpc,
      COUNTIF(first_call_timestamp IS NULL AND total_calls > 0) as missing_call_timestamp_with_calls,
      MAX(capture_timestamp) as latest_capture,
      MAX(delivery_timestamp) as latest_delivery,
      MAX(first_call_timestamp) as latest_call,
      MAX(CASE WHEN sale = true THEN capture_timestamp ELSE NULL END) as latest_sale
    FROM vw_lead_lifecycle
    \${sql}
  \`;
  const [rows] = await bq.query({ query, params: queryParams });
  const row = rows[0] || {};
  const total = Number(row.total_leads) || 0;
  
  const issues = [];
  if (row.sentinel_captures > 0) {
    issues.push({
      issue: 'Sentinel Capture Timestamps (1900/1970)',
      severity: 'Critical',
      affected: Number(row.sentinel_captures),
      percentage: total > 0 ? ((Number(row.sentinel_captures) / total) * 100).toFixed(2) : 0,
      lastSeen: row.latest_capture ? String(row.latest_capture).substring(0,10) : 'Unknown'
    });
  }
  if (row.missing_delivery_with_rpc > 0) {
    issues.push({
      issue: 'RPC flagged but missing Delivery Timestamp',
      severity: 'Warning',
      affected: Number(row.missing_delivery_with_rpc),
      percentage: total > 0 ? ((Number(row.missing_delivery_with_rpc) / total) * 100).toFixed(2) : 0,
      lastSeen: row.latest_capture ? String(row.latest_capture).substring(0,10) : 'Unknown'
    });
  }
  if (row.missing_call_timestamp_with_calls > 0) {
    issues.push({
      issue: 'Calls > 0 but missing First Call Timestamp',
      severity: 'Warning',
      affected: Number(row.missing_call_timestamp_with_calls),
      percentage: total > 0 ? ((Number(row.missing_call_timestamp_with_calls) / total) * 100).toFixed(2) : 0,
      lastSeen: row.latest_capture ? String(row.latest_capture).substring(0,10) : 'Unknown'
    });
  }
  
  // If no issues, provide a clean slate record
  if (issues.length === 0) {
     issues.push({
      issue: 'No anomalies detected',
      severity: 'Info',
      affected: 0,
      percentage: 0,
      lastSeen: 'N/A'
    });
  }

  return {
    freshness: {
      latestCapture: row.latest_capture ? new Date(row.latest_capture.value || row.latest_capture).toLocaleString() : 'N/A',
      latestDelivery: row.latest_delivery ? new Date(row.latest_delivery.value || row.latest_delivery).toLocaleString() : 'N/A',
      latestCall: row.latest_call ? new Date(row.latest_call.value || row.latest_call).toLocaleString() : 'N/A',
      latestSale: row.latest_sale ? new Date(row.latest_sale.value || row.latest_sale).toLocaleString() : 'N/A'
    },
    issues
  };
}`;
queries = queries.replace(regex, replacement);
fs.writeFileSync('server/bigquery/queries.ts', queries);
