const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';
const DATASET = 'lead_ledger';

async function test() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT 
      COUNT(*) as fetched,
      COUNTIF(valid_idno = 'true') as valid_id,
      COUNTIF(phone_valid = 'true') as valid_phone,
      SUM(IFNULL((SELECT SUM(revenue_generated) FROM UNNEST(hlc_details)), 0)) as total_revenue
    FROM \`${PROJECT_ID}.${DATASET}.clustered_lead_ledger\`
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
test().catch(console.error);
