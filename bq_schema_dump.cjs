const { BigQuery } = require('@google-cloud/bigquery');
const credentialsStr = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let bq;
try {
  const credentials = JSON.parse(credentialsStr);
  bq = new BigQuery({ projectId: 'dashboards-422710', credentials });
} catch (e) {
  bq = new BigQuery({ projectId: 'dashboards-422710' }); // Fallback if it was a file path
}

async function dumpSchema() {
  const query = `
    SELECT table_name, column_name, data_type 
    FROM \`dashboards-422710.lead_ledger.INFORMATION_SCHEMA.COLUMNS\`
    ORDER BY table_name, column_name
  `;
  try {
    const [rows] = await bq.query({ query });
    const fs = require('fs');
    fs.writeFileSync('schema_dump.json', JSON.stringify(rows, null, 2));
    console.log("Dumped to schema_dump.json");
  } catch (err) {
    console.error(err);
  }
}
dumpSchema();
