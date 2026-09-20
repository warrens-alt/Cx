const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');
content = content.replace(/current_val_val/g, 'current');
fs.writeFileSync('server/bigquery/queries.ts', content);
