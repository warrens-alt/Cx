const fs = require('fs');

let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const oldCode = `        f.values.forEach((v:any, idx:number) => {
          queryParams[\`\${paramName}_\${idx}\`] = v;
        })\`);
        f.values.forEach((v:any, idx:number) => {
          queryParams[\`\${paramName}_\${idx}\`] = v;
        });`;

const newCode = `        f.values.forEach((v:any, idx:number) => {
          queryParams[\`\${paramName}_\${idx}\`] = v;
        });`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('server/bigquery/queries.ts', content);
