const fs = require('fs');

let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /export async function getCallPerformanceStats\(params: BaseQueryParams\) \{\n\s*const client = getClientConfig\(params.clientId\);\n\s*const bq = getBigQueryClient\(client\.bigQueryProject\);\n\s*const \{ sql, queryParams \} = buildWhereClause\(params, 'vw_lead_lifecycle'\);/g,
  "export async function getCallPerformanceStats(params: BaseQueryParams) {\n  const client = getClientConfig(params.clientId);\n  const bq = getBigQueryClient(client.bigQueryProject);\n  const { sql, queryParams } = buildWhereClause(params, 'vw_lead_vendor_transactions');"
);

content = content.replace(
  /export async function getHlcVendorCoverage\(params: BaseQueryParams\) \{\n\s*const client = getClientConfig\(params.clientId\);\n\s*const bq = getBigQueryClient\(client\.bigQueryProject\);\n\s*const \{ sql, queryParams \} = buildWhereClause\(params, 'vw_lead_lifecycle'\);/g,
  "export async function getHlcVendorCoverage(params: BaseQueryParams) {\n  const client = getClientConfig(params.clientId);\n  const bq = getBigQueryClient(client.bigQueryProject);\n  const { sql, queryParams } = buildWhereClause(params, 'vw_lead_vendor_transactions');"
);

content = content.replace(
  /export async function getSpeedToLeadStats\(params: BaseQueryParams\) \{\n\s*const client = getClientConfig\(params.clientId\);\n\s*const bq = getBigQueryClient\(client\.bigQueryProject\);\n\s*const \{ sql, queryParams \} = buildWhereClause\(params, 'vw_lead_lifecycle'\);/g,
  "export async function getSpeedToLeadStats(params: BaseQueryParams) {\n  const client = getClientConfig(params.clientId);\n  const bq = getBigQueryClient(client.bigQueryProject);\n  const { sql, queryParams } = buildWhereClause(params, 'vw_lead_vendor_transactions');"
);

fs.writeFileSync('server/bigquery/queries.ts', content);
