const fs = require('fs');

let queriesTs = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newQuery = `
export async function getHlcVendorCoverage(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildWhereClause(params);
  
  const query = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      vendor,
      COUNT(transaction_id) as total_transactions,
      COUNT(attempted_delivery_timestamp) / NULLIF(COUNT(transaction_id), 0) as coverage_delivery,
      COUNT(first_call_timestamp) / NULLIF(COUNT(transaction_id), 0) as coverage_first_call,
      COUNT(last_call_timestamp) / NULLIF(COUNT(transaction_id), 0) as coverage_last_call,
      COUNT(latest_dialer_status) / NULLIF(COUNT(transaction_id), 0) as coverage_disposition,
      SUM(IF(total_calls > 0, 1, 0)) / NULLIF(COUNT(transaction_id), 0) as coverage_total_calls,
      SUM(IF(rpc, 1, 0)) / NULLIF(COUNT(transaction_id), 0) as coverage_rpc,
      SUM(IF(sale, 1, 0)) / NULLIF(COUNT(transaction_id), 0) as coverage_sale,
      SUM(IF(activation, 1, 0)) / NULLIF(COUNT(transaction_id), 0) as coverage_activation,
      SUM(IF(revenue > 0, 1, 0)) / NULLIF(COUNT(transaction_id), 0) as coverage_revenue,
      COUNT(hlc_status) / NULLIF(COUNT(transaction_id), 0) as coverage_status
    FROM vw_lead_vendor_transactions
    \${sql ? \`WHERE \${sql}\` : ''}
    GROUP BY vendor
    ORDER BY total_transactions DESC
  \`;

  const [rows] = await bq.query({ query, params: queryParams });
  return rows;
}
`;

queriesTs += newQuery;
fs.writeFileSync('server/bigquery/queries.ts', queriesTs);
