const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

async function query() {
  const bq = new BigQuery({ 
    projectId: 'dashboards-422710',
    credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  });

  const [schema] = await bq.query(`
    SELECT column_name, data_type 
    FROM \`dashboards-422710.lead_ledger.INFORMATION_SCHEMA.COLUMNS\` 
    WHERE table_name = 'clustered_lead_ledger' 
    AND column_name = 'hlc_details'
  `);
  console.log(schema[0].data_type);
}

query().catch(console.error);
