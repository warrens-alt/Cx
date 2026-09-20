const fs = require('fs');
let queries = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newFunction = `
export async function getOutcomesStats(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.projectId);
  const { sql, queryParams } = buildWhereClause(params);
  
  const query = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      COUNTIF(activation = true) as total_activations,
      SUM(revenue) as total_revenue,
      source
    FROM vw_lead_lifecycle
    \${sql}
    GROUP BY source
    ORDER BY total_revenue DESC
  \`;
  
  const [rows] = await bq.query({ query, params: queryParams });
  
  let total_activations = 0;
  let total_revenue = 0;
  
  rows.forEach((r: any) => {
    total_activations += Number(r.total_activations);
    total_revenue += Number(r.total_revenue);
  });
  
  return { 
    summary: { total_activations, total_revenue },
    sources: rows
  };
}
`;

if (!queries.includes('getOutcomesStats')) {
  queries += newFunction;
  fs.writeFileSync('server/bigquery/queries.ts', queries);
}
