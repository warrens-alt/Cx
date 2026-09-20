import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "typeFilter = ",
  "typeFilter += " // Wait, there are many typeFilter =
);

// Better to add another variable `agentFilter`
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
      if (agent) {
        agentFilter = " AND h.agent = @agent";
        params.agent = agent;
      }`
);

// Add agentFilter to the query
content = content.replace(
  /\${typeFilter}/g,
  "${typeFilter} ${agentFilter}"
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts for agent properly");
