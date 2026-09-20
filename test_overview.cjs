const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function test() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT 
      SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as Delivered_Leads,
      SUM((SELECT SUM(h.rpc) FROM UNNEST(c.hlc_details) h)) as RPC,
      SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as Sales,
      SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as Activations
    FROM \`${PROJECT_ID}.${DATASET}.clustered_lead_ledger\` c
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
test().catch(console.error);
