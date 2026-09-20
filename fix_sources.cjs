const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /COUNTIF\(has_has_rpc = true\)/g,
  'COUNTIF(has_rpc = true)'
);
content = content.replace(
  /delivery_timestamp IS NOT NULL/g,
  'has_delivery = true'
);
content = content.replace(
  /first_call_timestamp IS NOT NULL/g,
  'has_call = true'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
