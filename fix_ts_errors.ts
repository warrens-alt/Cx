import fs from 'fs';

// 1. server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');

// Fix typing of query
serverContent = serverContent.replace(
  "const { startDate, endDate, vendor, type, metric, agent } = req.query as { startDate?: string, endDate?: string, vendor?: string, type?: string, metric?: string, agent?: string }",
  "const { startDate, endDate, vendor, type, metric, agent, brand } = req.query as { startDate?: string, endDate?: string, vendor?: string, type?: string, metric?: string, agent?: string, brand?: string }"
);

// Fallback in case it's still missing agent
serverContent = serverContent.replace(
  "const { startDate, endDate, vendor, type, metric } = req.query as { startDate?: string, endDate?: string, vendor?: string, type?: string, metric?: string }",
  "const { startDate, endDate, vendor, type, metric, agent, brand } = req.query as { startDate?: string, endDate?: string, vendor?: string, type?: string, metric?: string, agent?: string, brand?: string }"
);

// If there's duplicate ${agentFilter} ${brandFilter} let's clean it up
serverContent = serverContent.replace(/\$\{agentFilter\} \$\{brandFilter\} \$\{agentFilter\} \$\{brandFilter\}/g, "${agentFilter} ${brandFilter}");
serverContent = serverContent.replace(/\$\{typeFilter\} \$\{agentFilter\} \$\{brandFilter\} \$\{agentFilter\} \$\{brandFilter\}/g, "${typeFilter} ${agentFilter} ${brandFilter}");

fs.writeFileSync('server.ts', serverContent);

// 2. React imports
const files = ['src/pages/RetryStrategy.tsx', 'src/pages/SpeedToLead.tsx'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import React")) {
    content = "import React from 'react';\n" + content;
    fs.writeFileSync(file, content);
  }
}

console.log("Fixed errors");
