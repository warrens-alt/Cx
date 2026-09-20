const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /COUNTIF\(has_delivery = false AND has_has_rpc = true\)/g,
  'COUNTIF(has_delivery = false AND has_rpc = true)'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
