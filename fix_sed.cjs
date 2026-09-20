const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// The code currently has:
//     trend,
//     sources
//      deliveredChange: delivered - (Number((({} as any)).delivered) || 0), 

// Replace `sources\n` (with any whitespace) to `sources,\n`
content = content.replace(/sources\s+deliveredChange/g, 'sources,\n    deliveredChange');

fs.writeFileSync('server/bigquery/queries.ts', content);
