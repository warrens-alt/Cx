const fs = require('fs');
let content = fs.readFileSync('server/api.ts', 'utf8');

if(!content.includes("getAllClients")) {
  content = content.replace(/import \{ getClientConfig, validateEnvironment \} from '\.\/bigquery\/config';/, `import { getClientConfig, getAllClients, validateEnvironment } from './bigquery/config';`);
}

const clientsEndpoint = `analyticsRouter.get('/clients', (req, res) => {
  try {
    const clients = getAllClients().map(c => ({
      id: c.id,
      name: c.name,
      currency: c.currency,
      timezone: c.timezone,
      capabilities: c.capabilities
    }));
    res.json({ success: true, data: clients });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});
`;

content = content.replace(/analyticsRouter\.get\('\/discovery',/, clientsEndpoint + `\nanalyticsRouter.get('/discovery',`);

fs.writeFileSync('server/api.ts', content);
