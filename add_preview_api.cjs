const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const previewEndpoint = `
  app.get('/api/bq/preview', async (req, res) => {
    try {
      const { projectId, datasetId, tableId } = req.query as { projectId: string, datasetId: string, tableId: string };
      if (!projectId || !datasetId || !tableId) {
        return res.status(400).json({ error: 'Missing projectId, datasetId, or tableId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const query = \`SELECT * FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\` LIMIT 10\`;
      const [rows] = await bq.query({ query });
      
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
`;

if (!code.includes('/api/bq/preview')) {
  code = code.replace("app.get('/api/health',", previewEndpoint.trim() + "\n\n  app.get('/api/health',");
  fs.writeFileSync('server.ts', code);
}
