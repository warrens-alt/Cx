import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "const { startDate, endDate, vendor, type, metric } = req.query",
  "const { startDate, endDate, vendor, type, metric, agent } = req.query as { startDate?: string, endDate?: string, vendor?: string, type?: string, metric?: string, agent?: string }"
);

content = content.replace(
  /let typeFilter = '';/,
  `let typeFilter = '';
      if (agent) {
        // Find a way to filter by agent. The query uses table c (offline) and h (calls). 
        // We'll filter on h.agent if agent is provided.
        typeFilter += " AND h.agent = @agent";
        params.agent = agent;
      }`
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts for agent");
