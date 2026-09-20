const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bq = new BigQuery({ 
  projectId: 'dashboards-422710',
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
});

bq.query("SELECT * FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\` LIMIT 1").then(([rows]) => {
  console.log(Object.keys(rows[0] || {}));
}).catch(console.error);
