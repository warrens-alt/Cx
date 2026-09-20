const fs = require('fs');
let queries = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newFunction = `
export async function getAcquisitionStats(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  if (!client.platformInsightsTable) {
    return { data: [], summary: { spend: 0, leads: 0, cpa: 0 } };
  }
  
  const bq = getBigQueryClient(client.projectId);
  
  let clauses = [];
  const queryParams: any = {};
  if (params.startDate) {
    clauses.push(\`CAST(date AS STRING) >= @startDate\`);
    queryParams.startDate = params.startDate;
  }
  if (params.endDate) {
    clauses.push(\`CAST(date AS STRING) <= @endDate\`);
    queryParams.endDate = params.endDate;
  }
  const sql = clauses.length > 0 ? \`WHERE \${clauses.join(' AND ')}\` : '';

  const query = \`
    SELECT 
      CAST(date AS STRING) as date,
      channel,
      SUM(budget) as spend,
      SUM(impressions) as impressions,
      SUM(clicks) as clicks,
      SUM(actions_lead) as leads
    FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.platformInsightsTable}\\\`
    \${sql}
    GROUP BY date, channel
    ORDER BY date DESC
    LIMIT 500
  \`;
  
  const [rows] = await bq.query({ query, params: queryParams });
  
  const summary = rows.reduce((acc: any, row: any) => {
    acc.spend += (Number(row.spend) || 0);
    acc.leads += (Number(row.leads) || 0);
    acc.impressions += (Number(row.impressions) || 0);
    acc.clicks += (Number(row.clicks) || 0);
    return acc;
  }, { spend: 0, leads: 0, impressions: 0, clicks: 0 });
  
  if (summary.leads > 0) summary.cpa = summary.spend / summary.leads;
  
  return { 
    summary,
    timeseries: rows
  };
}
`;

if (!queries.includes('getAcquisitionStats')) {
  queries += newFunction;
  fs.writeFileSync('server/bigquery/queries.ts', queries);
}
