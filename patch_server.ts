import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const importGoogleAuth = "import { GoogleAuth } from 'google-auth-library';\n";

if (!content.includes('GoogleAuth')) {
  content = content.replace("import { BigQuery } from '@google-cloud/bigquery';", "import { BigQuery } from '@google-cloud/bigquery';\n" + importGoogleAuth);
}

const projectsEndpoint = `  app.get('/api/bq/projects', async (req, res) => {
    try {
      const credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}');
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/bigquery']
      });
      const client = await auth.getClient();
      const response = await client.request({
        url: 'https://bigquery.googleapis.com/bigquery/v2/projects'
      });
      const projects = response.data.projects || [];
      return res.json({ 
        success: true, 
        data: projects.map((p: any) => ({ 
          id: p.projectReference.projectId, 
          name: p.friendlyName || p.projectReference.projectId 
        })) 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });`;

content = content.replace(/  app\.get\('\/api\/bq\/projects', async \(req, res\) => \{[\s\S]*?\}\);/, projectsEndpoint);

fs.writeFileSync('server.ts', content);
