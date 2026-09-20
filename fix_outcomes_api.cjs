const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newOutcomes = `export async function getOutcomesStats(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.projectId);
  const { sql, queryParams } = buildWhereClause(params);
  
  const summaryQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      COUNTIF(has_activation = true) as total_activations,
      SUM(total_revenue) as total_revenue
    FROM vw_leads
    \${sql}
  \`;

  const timeseriesQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      CAST(DATE(capture_timestamp) AS STRING) as date,
      COUNTIF(has_activation = true) as activations,
      SUM(total_revenue) as revenue
    FROM vw_leads
    \${sql}
    GROUP BY date
    ORDER BY date ASC
  \`;

  const sourcesQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      source,
      COUNTIF(has_activation = true) as activations,
      SUM(total_revenue) as total_revenue
    FROM vw_leads
    \${sql}
    GROUP BY source
    ORDER BY total_revenue DESC
    LIMIT 20
  \`;
  
  const vendorsQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT
      vendor_name as vendor,
      COUNTIF(has_activation = true) as activations,
      SUM(total_revenue) as total_revenue
    FROM vw_leads
    \${sql}
    GROUP BY vendor
    ORDER BY total_revenue DESC
    LIMIT 20
  \`;

  const [
    [summaryRows],
    [timeseriesRows],
    [sourcesRows],
    [vendorsRows]
  ] = await Promise.all([
    bq.query({ query: summaryQuery, params: queryParams }),
    bq.query({ query: timeseriesQuery, params: queryParams }),
    bq.query({ query: sourcesQuery, params: queryParams }),
    bq.query({ query: vendorsQuery, params: queryParams })
  ]);

  return {
    summary: summaryRows[0] || { total_activations: 0, total_revenue: 0 },
    timeseries: timeseriesRows || [],
    sources: sourcesRows || [],
    vendors: vendorsRows || []
  };
}`;

content = content.replace(/export async function getOutcomesStats\([\s\S]*?return \{\s*summary:[^\}]+\},\s*sources: rows\s*\};\n\}/, newOutcomes);
fs.writeFileSync('server/bigquery/queries.ts', content);
