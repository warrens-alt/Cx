const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

async function test() {
  const bq = new BigQuery({ 
    projectId: 'dashboards-422710',
    credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  });
  
  const [schema] = await bq.query(`
    SELECT column_name, data_type 
    FROM \`dashboards-422710.lead_ledger.INFORMATION_SCHEMA.COLUMNS\` 
    WHERE table_name = 'lead_ledger_all_vicidial_insights' 
  `);
  console.log(schema);
}

test().catch(console.error);
