const fs = require('fs');
let content = fs.readFileSync('server/bigquery/registry.ts', 'utf8');

// remove all ROR specific parameters
content = content.replace(/,\s*\{\s*canonicalParameter:\s*'ROR [A-Z ]+',[^}]+\}/g, '');
fs.writeFileSync('server/bigquery/registry.ts', content);
