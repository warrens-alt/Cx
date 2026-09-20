const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// There are a few direct references to `rpc = true`, `sale = true`, `activation = true` in queries.ts

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

content = content.replace(
  /COUNTIF\(sale = true AND/g,
  'COUNTIF(has_sale = true AND'
);

content = content.replace(
  /WHEN sale = true THEN/g,
  'WHEN has_sale = true THEN'
);

content = content.replace(
  /delivery_timestamp IS NULL AND rpc = true/g,
  'has_delivery = false AND has_rpc = true'
);

content = content.replace(
  /SUM\(IFNULL\(revenue, 0\)\)/g,
  'SUM(IFNULL(total_revenue, 0))'
);

content = content.replace(
  /IFNULL\(CAST\(revenue AS STRING\), '\$0'\) as value/g,
  `IFNULL(CAST(total_revenue AS STRING), '$0') as value`
);

content = content.replace(
  /rpc,\n\s*sale\n\s*FROM vw_leads/g,
  'has_rpc as rpc,\n        has_sale as sale\n      FROM vw_leads'
);

content = content.replace(
  /delivery_timestamp IS NOT NULL\n\s*AND first_call_timestamp IS NOT NULL/g,
  'has_delivery = true\n        AND has_call = true'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
