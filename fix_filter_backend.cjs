const fs = require('fs');
let code = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

code = code.replace(/if \(params\.medium\) \{[\s\S]*?queryParams\.medium = params\.medium;\n  \}/m, 
`if (params.vendor) {
    clauses.push(\`medium = @vendor\`);
    queryParams.vendor = params.vendor;
  }`);

code = code.replace(/const mediumQuery = \`[\s\S]*?SELECT DISTINCT medium FROM vw_lead_lifecycle WHERE medium IS NOT NULL[\s\S]*?\`;/m, 
`const mediumQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT DISTINCT medium as vendor FROM vw_lead_lifecycle WHERE medium IS NOT NULL
  \`;`);

code = code.replace(/mediums: mediumRows\.map\(r => r\.medium\)\.filter\(Boolean\)/m, 
`vendors: mediumRows.map(r => r.vendor).filter(Boolean)`);

fs.writeFileSync('server/bigquery/queries.ts', code);
