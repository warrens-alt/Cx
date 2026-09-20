const fs = require('fs');
let code = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const replacement = `
  const [rows] = await bq.query({ query, params: queryParams });
  const data = rows[0] || {};
  
  // Calculate previous period if dates are provided
  let prevData = {};
  if (params.startDate && params.endDate) {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const duration = end.getTime() - start.getTime();
    
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - duration);
    
    const prevParams = { ...params, startDate: prevStart.toISOString().split('T')[0], endDate: prevEnd.toISOString().split('T')[0] };
    const { sql: prevSql, queryParams: prevQueryParams } = buildWhereClause(prevParams);
    
    const prevQuery = \`
      \${getBaseSemanticLayer(client)}
      SELECT
        \${METRIC_DEFINITIONS.total_leads.numerator} as leads,
        \${METRIC_DEFINITIONS.delivered_leads.numerator} as delivered,
        \${METRIC_DEFINITIONS.called_leads.numerator} as called,
        \${METRIC_DEFINITIONS.rpcs.numerator} as rpcs,
        \${METRIC_DEFINITIONS.sales.numerator} as sales,
        \${METRIC_DEFINITIONS.activations.numerator} as activations,
        \${METRIC_DEFINITIONS.revenue.numerator} as revenue
      FROM vw_lead_lifecycle
      \${prevSql}
    \`;
    
    try {
      const [prevRows] = await bq.query({ query: prevQuery, params: prevQueryParams });
      prevData = prevRows[0] || {};
    } catch (e) {
      console.error("Failed to fetch previous period", e);
    }
  }

  const leads = Number(data.leads) || 0;
  const delivered = Number(data.delivered) || 0;
`;

code = code.replace(/const \[rows\] = await bq\.query\(\{ query, params: queryParams \}\);\n  const data = rows\[0\] \|\| \{\};\n\n  const leads = Number\(data\.leads\) \|\| 0;\n  const delivered = Number\(data\.delivered\) \|\| 0;/m, replacement);

const returnReplacement = `
    spend, cpa: leads > 0 ? Number((spend / leads).toFixed(2)) : 0, roas: spend > 0 ? Number(((revenue / spend) * 100).toFixed(1)) : 0, 
    leadsChange: leads - (Number(prevData.leads) || 0), 
    deliveredChange: delivered - (Number(prevData.delivered) || 0), 
    calledChange: called - (Number(prevData.called) || 0), 
    rpcsChange: rpcs - (Number(prevData.rpcs) || 0), 
    salesChange: sales - (Number(prevData.sales) || 0), 
    activationsChange: activations - (Number(prevData.activations) || 0), 
    revenueChange: revenue - (Number(prevData.revenue) || 0)
  };`;
  
code = code.replace(/spend, cpa: leads > 0[\s\S]*?revenueChange: 0 \/\/ Mocked for now to avoid overly complex double-fetch without standard library\n  \};/m, returnReplacement);

fs.writeFileSync('server/bigquery/queries.ts', code);
