const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// Inside getOverviewStats, after calculating all the scalar metrics, let's fetch trend and sources:
const replaceStr = `
  const rpcs = Number(data.rpcs) || 0;
  const sales = Number(data.sales) || 0;
  const activations = Number(data.activations) || 0;
  const revenue = Number(data.revenue) || 0;
  const duplicates = Number(data.duplicates) || 0;
  const callsTotal = Number(data.calls_total) || 0;
  
  let spend = 0;
  if (client.platformInsightsTable) {
    let spendSql = '';
    const spendParams = {};
    if (params.startDate) { spendSql += \` CAST(date AS STRING) >= @startDate \`; spendParams['startDate'] = params.startDate; }
    if (params.endDate) { spendSql += (spendSql ? ' AND ' : '') + \` CAST(date AS STRING) <= @endDate \`; spendParams['endDate'] = params.endDate; }
    if (spendSql) spendSql = 'WHERE ' + spendSql;
    
    const spendQuery = \`SELECT SUM(budget) as spend FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.platformInsightsTable}\\\` \${spendSql}\`;
    const [spendRows] = await bq.query({ query: spendQuery, params: spendParams });
    spend = Number(spendRows[0]?.spend) || 0;
  }
  
  // FETCH TREND (Daily)
  const trendQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT 
      CAST(capture_date AS STRING) as date,
      COUNT(lead_id) as leads,
      COUNTIF(has_delivery = true) as delivered,
      COUNTIF(has_call = true) as called,
      COUNTIF(has_sale = true) as sales,
      SUM(total_revenue) as revenue
    FROM vw_leads
    \${sql}
    GROUP BY date
    ORDER BY date ASC
  \`;
  const [trendRows] = await bq.query({ query: trendQuery, params: queryParams });
  const trend = trendRows.map(r => ({
    date: r.date,
    current: Number(r.leads) || 0, // Fallback placeholder, we map later if needed, but let's provide all
    leads: Number(r.leads) || 0,
    delivered: Number(r.delivered) || 0,
    called: Number(r.called) || 0,
    sales: Number(r.sales) || 0,
    revenue: Number(r.revenue) || 0
  }));

  // FETCH SOURCES
  const sourcesQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT 
      source,
      COUNT(lead_id) as leads,
      SUM(total_revenue) as revenue
    FROM vw_leads
    \${sql}
    GROUP BY source
    ORDER BY leads DESC
    LIMIT 10
  \`;
  const [sourcesRows] = await bq.query({ query: sourcesQuery, params: queryParams });
  const sources = sourcesRows.map(r => ({
    source: r.source || 'Unknown',
    leads: Number(r.leads) || 0,
    revenue: Number(r.revenue) || 0
  }));
`;

content = content.replace(
  /const rpcs = Number\(data.rpcs\) \|\| 0;[\s\S]*?spend = Number\(spendRows\[0\]\?\.spend\) \|\| 0;\n  \}/g,
  replaceStr
);

const replaceReturnStr = `
    spend, cpa: leads > 0 ? Number((spend / leads).toFixed(2)) : 0, roas: spend > 0 ? Number(((revenue / spend) * 100).toFixed(1)) : 0, 
    leadsChange: leads - (Number((({} as any)).leads) || 0), 
    trend,
    sources
`;

content = content.replace(
  /spend, cpa: leads > 0 \? Number\(\(spend \/ leads\)\.toFixed\(2\)\) : 0, roas: spend > 0 \? Number\(\(\(revenue \/ spend\) \* 100\)\.toFixed\(1\)\) : 0, \n    leadsChange: leads - \(Number\(\(\({} as any\)\)\.leads\) \|\| 0\),/g,
  replaceReturnStr
);

fs.writeFileSync('server/bigquery/queries.ts', content);
