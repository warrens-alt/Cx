const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function getCols() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT column_name, data_type 
    FROM \`${PROJECT_ID}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\` 
    WHERE table_name = 'clustered_lead_ledger'
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
getCols().catch(console.error);
