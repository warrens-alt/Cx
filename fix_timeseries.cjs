const fs = require('fs');
let queries = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

queries = queries.replace(/COUNT\(lead_id\) as current/g, "COUNT(lead_id) as current_val");
queries = queries.replace(/current: Number\(r\.current\) \|\| 0/g, "current: Number(r.current_val) || 0");

fs.writeFileSync('server/bigquery/queries.ts', queries);
