import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace("`SELECT * FROM \\`\\${projectId}.\\${datasetId}.\\${tableId}\\` LIMIT 50`;", "`SELECT * FROM \\`${projectId}.${datasetId}.${tableId}\\` LIMIT 50`;");
fs.writeFileSync('server.ts', content);
