const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bq = new BigQuery({ 
  projectId: 'dashboards-422710',
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
});

bq.query("SELECT column_name, data_type FROM \`dashboards-422710.lead_ledger.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = 'clustered_lead_ledger'").then(([rows]) => {
  console.log(rows);
}).catch(console.error);
