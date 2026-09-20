import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "metric?: string, agent?: string }",
  "metric?: string, agent?: string, brand?: string }"
);

content = content.replace(
  `      let typeFilter = '';
      let agentFilter = '';
      if (agent) {
        agentFilter = " AND h.agent = @agent";
        params.agent = agent;
      }`,
  `      let typeFilter = '';
      let agentFilter = '';
      let brandFilter = '';
      if (agent) {
        agentFilter = " AND h.agent = @agent";
        params.agent = agent;
      }
      if (brand) {
        if (brand === 'MTN') {
            brandFilter = " AND c.vertical = 'MTN'";
        } else if (brand === 'MONDO') {
            brandFilter = " AND c.vertical = 'MONDO'";
        } else if (brand === 'BLC') {
            brandFilter = " AND c.vertical = 'BLC'";
        }
      }`
);

// Add brandFilter to the query
content = content.replace(
  /\$\{agentFilter\}/g,
  "${agentFilter} ${brandFilter}"
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts for brand");
