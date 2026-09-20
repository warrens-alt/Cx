const fs = require('fs');
let content = fs.readFileSync('server/bigquery/semantic_engine.ts', 'utf8');

content = content.replace(
  'FROM vw_lead_lifecycle',
  'FROM vw_leads'
);

content = content.replace(
  `leads: "COUNT(lead_id)",`,
  `leads: "COUNT(DISTINCT lead_id)",`
);

content = content.replace(
  `revenue: "SUM(revenue)",`,
  `revenue: "SUM(total_revenue)",`
);

content = content.replace(
  `revenue_per_lead: "SUM(revenue) / NULLIF(COUNT(lead_id), 0)",`,
  `revenue_per_lead: "SUM(total_revenue) / NULLIF(COUNT(DISTINCT lead_id), 0)",`
);

content = content.replace(
  `calls_per_lead: "SUM(total_calls) / NULLIF(COUNT(lead_id), 0)"`,
  `calls_per_lead: "SUM(total_calls) / NULLIF(COUNT(DISTINCT lead_id), 0)"`
);

fs.writeFileSync('server/bigquery/semantic_engine.ts', content);
