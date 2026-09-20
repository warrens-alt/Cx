const fs = require('fs');
let content = fs.readFileSync('server/bigquery/views.ts', 'utf8');

content = content.replace(
  /SUM\(revenue\) as total_revenue/g,
  `SUM(revenue) as total_revenue,\n        false as duplicate_flag`
);

fs.writeFileSync('server/bigquery/views.ts', content);
