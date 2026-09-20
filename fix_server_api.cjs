const fs = require('fs');

let file = fs.readFileSync('server/api.ts', 'utf8');
file = file.replace(
  "function getStandardParams(req: any) {\n  const { clientId = 'default', startDate, endDate, source, medium } = req.query;\n  return { clientId, startDate, endDate, source, medium };\n}",
  `function getStandardParams(req: any) {
  const { clientId = 'default', startDate, endDate, filters } = req.query;
  let parsedFilters = {};
  if (filters) {
    try { parsedFilters = JSON.parse(filters); } catch(e) {}
  }
  // also map old source/medium if present as fallback
  if (req.query.source && !parsedFilters.source) parsedFilters.source = { operator: 'in', values: req.query.source.split(',') };
  if (req.query.vendor && !parsedFilters.vendor) parsedFilters.vendor = { operator: 'in', values: req.query.vendor.split(',') };

  return { clientId, startDate, endDate, filters: parsedFilters };
}`
);

fs.writeFileSync('server/api.ts', file);
