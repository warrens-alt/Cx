const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newFunction = `export async function getLeadTimeline(params: BaseQueryParams & { leadId: string }) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.projectId);
  const { sql, queryParams } = buildWhereClause(params);
  
  const query = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      capture_timestamp,
      delivery_timestamp,
      first_call_timestamp,
      sale_timestamp,
      activation_timestamp,
      vendor,
      transaction_id,
      rpc,
      sale,
      activation,
      total_calls,
      latest_dialer_status
    FROM vw_lead_vendor_transactions
    WHERE lead_id = @leadId
    ORDER BY capture_timestamp ASC, delivery_timestamp ASC
  \`;

  const [rows] = await bq.query({ query, params: { leadId: params.leadId } });
  
  return rows;
}
`;

content += '\n' + newFunction;
fs.writeFileSync('server/bigquery/queries.ts', content);
