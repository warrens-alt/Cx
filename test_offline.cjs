const { BigQuery } = require('@google-cloud/bigquery');
const PROJECT_ID = 'dashboards-422710';

async function test() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  const bigquery = new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });

  const query = `
    SELECT 
      SUM(Amount_Spent) as total_spend,
      SUM(Fetched_Leads) as total_fetched
    FROM \`${PROJECT_ID}.vibe_coding_data.tbl_vibe_code_warren_stear_ontact_ofline_data\`
  `;
  const [rows] = await bigquery.query(query);
  console.log(JSON.stringify(rows, null, 2));
}
test().catch(console.error);
