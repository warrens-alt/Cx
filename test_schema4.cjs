const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bq = new BigQuery({ 
  projectId: 'dashboards-422710',
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
});

bq.query("SELECT hlc_details FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\` WHERE ARRAY_LENGTH(hlc_details) > 0 LIMIT 1").then(([rows]) => {
  console.log(JSON.stringify(rows[0], null, 2));
}).catch(console.error);
