import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  `      let typeFilter = '';
      if (agent) {
        // Find a way to filter by agent. The query uses table c (offline) and h (calls). 
        // We'll filter on h.agent if agent is provided.
        typeFilter += " AND h.agent = @agent";
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

// We also need to make sure we don't duplicate `agentFilter` if I already replaced it. Wait, the `agentFilter` isn't in the file right now.
// Add agentFilter and brandFilter to the query:
content = content.replace(
  /\$\{typeFilter\}/g,
  "${typeFilter} ${agentFilter} ${brandFilter}"
);

fs.writeFileSync('server.ts', content);
