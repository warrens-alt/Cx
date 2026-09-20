const fs = require('fs');
let content = fs.readFileSync('server/bigquery/views.ts', 'utf8');

content = content.replace(
  /'\${client.currency}' as currency,/g,
  `'\${client.currency}' as currency,\n        false as duplicate_flag,`
);

fs.writeFileSync('server/bigquery/views.ts', content);
