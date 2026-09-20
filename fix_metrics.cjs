const fs = require('fs');
let content = fs.readFileSync('server/bigquery/metrics.ts', 'utf8');

content = content.replace(
  /COUNT\(lead_id\)/g,
  'COUNT(DISTINCT lead_id)'
);

content = content.replace(
  /SUM\(IFNULL\(revenue, 0\)\)/g,
  'SUM(IFNULL(total_revenue, 0))'
);

// has_delivery, has_call, has_rpc, has_sale, has_activation in vw_leads.
content = content.replace(
  /COUNTIF\(delivery_timestamp IS NOT NULL\)/g,
  'COUNTIF(has_delivery = true)'
);

content = content.replace(
  /COUNTIF\(first_call_timestamp IS NOT NULL\)/g,
  'COUNTIF(has_call = true)'
);

content = content.replace(
  /COUNTIF\(rpc = true\)/g,
  'COUNTIF(has_rpc = true)'
);

content = content.replace(
  /COUNTIF\(sale = true\)/g,
  'COUNTIF(has_sale = true)'
);

content = content.replace(
  /COUNTIF\(activation = true\)/g,
  'COUNTIF(has_activation = true)'
);

fs.writeFileSync('server/bigquery/metrics.ts', content);
