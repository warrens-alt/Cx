const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bq = new BigQuery({ 
  projectId: 'dashboards-422710',
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
});

bq.query("SELECT DISTINCT v.vendor FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\`, UNNEST(hlc_details) as v LIMIT 10").then(([rows]) => {
  console.log(rows.map(r => r.vendor));
}).catch(console.error);
