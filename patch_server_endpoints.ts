import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const newEndpoints = `
  app.get('/api/bq/projects', async (req, res) => {
    try {
      const credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}');
      const projectId = credentials.project_id;
      if (projectId) {
         return res.json({ success: true, data: [{ id: projectId, name: projectId }] });
      } else {
         return res.json({ success: true, data: [] });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/datasets', async (req, res) => {
    try {
      const { projectId } = req.query as { projectId: string };
      if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const [datasets] = await bq.getDatasets();
      
      res.json({ success: true, data: datasets.map(d => ({ id: d.id })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/tables', async (req, res) => {
    try {
      const { projectId, datasetId } = req.query as { projectId: string, datasetId: string };
      if (!projectId || !datasetId) {
        return res.status(400).json({ error: 'Missing projectId or datasetId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const dataset = bq.dataset(datasetId);
      const [tables] = await dataset.getTables();
      
      res.json({ success: true, data: tables.map(t => ({ id: t.id })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/preview',`;

content = content.replace("  app.get('/api/bq/preview',", newEndpoints);

fs.writeFileSync('server.ts', content);
