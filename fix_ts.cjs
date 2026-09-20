const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const { startDate, endDate } = req\.query;/g, "const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };");

fs.writeFileSync('server.ts', code);
