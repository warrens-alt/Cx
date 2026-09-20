const fs = require('fs');
let queries = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

queries = queries.replace(
  /\\\$\{sql \? sql \+ ' AND' : 'WHERE'\}/,
  "${sql ? sql + ' AND' : 'WHERE'}"
);

fs.writeFileSync('server/bigquery/queries.ts', queries);
