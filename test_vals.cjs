const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function test() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT 
      delivered, rpc, sale, activated, COUNT(*) as c
    FROM \`${PROJECT_ID}.${DATASET}.clustered_lead_ledger\`
    CROSS JOIN UNNEST(hlc_details) as h
    GROUP BY delivered, rpc, sale, activated
    LIMIT 20
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
test().catch(console.error);
