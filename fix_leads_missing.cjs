const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(
  /delivery_timestamp IS NOT NULL THEN 'Delivered'/g,
  `has_delivery = true THEN 'Delivered'`
);

content = content.replace(
  /first_call_timestamp IS NOT NULL THEN 'Called'/g,
  `has_call = true THEN 'Called'`
);

fs.writeFileSync('server/bigquery/queries.ts', content);
