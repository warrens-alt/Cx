const { BigQuery } = require('@google-cloud/bigquery');
async function run() {
  const bq = new BigQuery({ projectId: 'dashboards-422710', credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
  const [metadata] = await bq.dataset('lead_ledger').table('clustered_lead_ledger').getMetadata();
  console.log(JSON.stringify(metadata.schema.fields.filter(f => f.name === 'hlc_details'), null, 2));
}
run().catch(console.error);
