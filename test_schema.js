const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'dashboards-422710',
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}')
});

async function run() {
  const [metadata] = await bigquery.dataset('lead_ledger').table('clustered_lead_ledger').getMetadata();
  console.log(JSON.stringify(metadata.schema.fields.map(f => ({ name: f.name, type: f.type, fields: f.fields?.map(sub => sub.name) })), null, 2));
}
run();
