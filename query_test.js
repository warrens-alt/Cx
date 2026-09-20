const { BigQuery } = require('@google-cloud/bigquery');
async function run() {
  const bq = new BigQuery({ projectId: 'dashboards-422710', credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
  const query = `
    SELECT
      COUNT(fetched) as fetched_count,
      COUNT(standardised_idno) as std_idno,
      COUNT(standardised_mobile) as std_mobile,
      COUNT(validate_idno) as val_idno,
      COUNT(validate_mobile) as val_mobile
    FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\`
  `;
  const [rows] = await bq.query({ query });
  console.log(rows);
}
run().catch(console.error);
