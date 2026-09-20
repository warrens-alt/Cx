import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// replace SAFE.PARSE_TIMESTAMP with SAFE_CAST
content = content.replace(/SAFE\.PARSE_TIMESTAMP\('%Y-%m-%d %H:%M:%S', (\w+)\)/g, 'SAFE_CAST($1 AS TIMESTAMP)');
fs.writeFileSync('server.ts', content);
console.log("Patched server.ts SAFE.PARSE_TIMESTAMP");
