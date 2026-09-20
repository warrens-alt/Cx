const fs = require('fs');
let content = fs.readFileSync('server/bigquery/discovery.ts', 'utf8');
content = content.replace(/t\.split\('\.'\)\.pop\(\)/g, "String(t).split('.').pop()");
fs.writeFileSync('server/bigquery/discovery.ts', content);
