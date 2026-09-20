const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const imports = `
import { Resource } from '@google-cloud/resource-manager';
const resource = new Resource({ credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
`;

if (!code.includes('@google-cloud/resource-manager')) {
  code = code.replace("import { BigQuery } from '@google-cloud/bigquery';", "import { BigQuery } from '@google-cloud/bigquery';\n" + imports.trim());
}

const endpoints = `
  app.get('/api/bq/projects', async (req, res) => {
    try {
      const [projects] = await resource.getProjects();
      res.json({ success: true, data: projects.map(p => ({ id: p.id, name: p.metadata.name })) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/datasets', async (req, res) => {
    try {
      const { projectId } = req.query as { projectId: string };
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const [datasets] = await bq.getDatasets();
      res.json({ success: true, data: datasets.map(d => ({ id: d.id })) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/tables', async (req, res) => {
    try {
      const { projectId, datasetId } = req.query as { projectId: string, datasetId: string };
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const dataset = bq.dataset(datasetId);
      const [tables] = await dataset.getTables();
      res.json({ success: true, data: tables.map(t => ({ id: t.id })) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
`;

if (!code.includes('/api/bq/projects')) {
  code = code.replace("app.get('/api/health',", endpoints.trim() + "\n\n  app.get('/api/health',");
}

fs.writeFileSync('server.ts', code);
