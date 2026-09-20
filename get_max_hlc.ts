import { getBigQueryClient } from './server/bigquery/client';
async function run() {
  const bq = getBigQueryClient('dashboards-422710');
  const query = `SELECT MAX(ARRAY_LENGTH(hlc_details)) as max_hlc FROM \`dashboards-422710.lead_ledger.tbl_lead_ledger_all\``;
  const [rows] = await bq.query({ query });
  console.log('Max HLC array length:', rows[0].max_hlc);
}
run();
