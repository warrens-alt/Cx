const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function test() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT 
      SUM((SELECT COUNTIF(h.last_dialer_status IN ('Right Party Contact', 'RPC')) FROM UNNEST(c.hlc_details) h)) as RPC
    FROM \`${PROJECT_ID}.${DATASET}.clustered_lead_ledger\` c
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
test().catch(console.error);
