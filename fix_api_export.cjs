const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf8');

if (!content.includes('exportData')) {
  content = `import { exportData } from './bigquery/export';\n` + content;
  
  const exportRoute = `
analyticsRouter.get('/export', async (req, res) => {
  try {
    const params: any = {
      clientId: req.query.clientId || 'default',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      grain: req.query.grain || 'lead',
      format: req.query.format || 'csv',
      metrics: req.query.metrics ? (req.query.metrics as string).split(',') : undefined,
      segment: req.query.segment,
      chartBucket: req.query.chartBucket
    };
    
    // Add extra params from query to filters if they exist (for drilling down into charts)
    if (params.segment && params.chartBucket) {
       if(!params.filters) params.filters = {};
       params.filters[params.segment] = { operator: 'in', values: [params.chartBucket] };
    }
    
    const result = await exportData(params);
    
    if (params.format === 'json') {
      res.json({ success: true, data: result });
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', \`attachment; filename="export-\${params.clientId}-\${params.grain}.csv"\`);
      res.send(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
`;
  
  content = content.replace(/analyticsRouter\.get\('\/health'/, exportRoute + `\nanalyticsRouter.get('/health'`);
  fs.writeFileSync('server/api.ts', content);
}
