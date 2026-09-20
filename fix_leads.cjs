const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /activation = true/g,
  'has_activation = true'
);

content = content.replace(
  /rpc = true/g,
  'has_rpc = true'
);

content = content.replace(
  /SELECT\s+lead_id as id,\s+capture_timestamp as captured/g,
  `SELECT\n      lead_id as id,\n      capture_timestamp as captured`
);

fs.writeFileSync('server/bigquery/queries.ts', content);
