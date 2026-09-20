import { getBigQueryClient } from './server/bigquery/client';
import { getClientConfig } from './server/bigquery/config';
async function run() {
  const client = getClientConfig('default');
  const bq = getBigQueryClient(client.bigQueryProject);
  const query = `SELECT MAX(ARRAY_LENGTH(hlc_details)) as max_hlc FROM \`${client.semanticMappings.tables.leads}\``;
  const [rows] = await bq.query({ query });
  console.log('Max HLC array length:', rows[0].max_hlc);
}
run();
