const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "const query = `SELECT * FROM `${projectId}.${datasetId}.${tableId}` LIMIT 50`;",
  "const query = `SELECT * FROM \\`${projectId}.${datasetId}.${tableId}\\` LIMIT 50`;"
);
fs.writeFileSync('server.ts', content);
