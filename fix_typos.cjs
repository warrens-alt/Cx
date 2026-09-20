const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /COUNTIF\(has_has_activation = true\)/g,
  'COUNTIF(has_activation = true)'
);

content = content.replace(
  /COUNTIF\(has_has_rpc = true\)/g,
  'COUNTIF(has_rpc = true)'
);

fs.writeFileSync('server/bigquery/queries.ts', content);
