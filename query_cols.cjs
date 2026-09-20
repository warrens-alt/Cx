const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function getCols() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });
  const query = `
    SELECT * 
    FROM \`${PROJECT_ID}.${DATASET}.flat_lead_ledger\` 
    LIMIT 1
  `;
  const [rows] = await bigquery.query(query);
  console.log(Object.keys(rows[0]));
}

getCols().catch(console.error);
