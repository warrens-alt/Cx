const { BigQuery } = require('@google-cloud/bigquery');
const credsString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let credentials;
if (credsString && credsString.startsWith('{')) {
  credentials = JSON.parse(credsString);
}
const bq = new BigQuery({ credentials, projectId: 'dashboards-422710' });
async function test() {
  try {
    const [metadata] = await bq.dataset('lead_ledger').table('lead_ledger_platform_insights').getMetadata();
    console.log(JSON.stringify(metadata.schema.fields.map(f => f.name), null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
