const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

async function discover() {
  const bq = new BigQuery({ 
    projectId: 'dashboards-422710',
    credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS)
  });

  const [datasets] = await bq.getDatasets();
  console.log("Datasets found:", datasets.map(d => d.id));

  for (const dataset of datasets) {
    console.log(`\n--- Dataset: ${dataset.id} ---`);
    const [tables] = await dataset.getTables();
    for (const table of tables) {
      console.log(`Table: ${table.id}`);
      const [metadata] = await table.getMetadata();
      console.log(`  Type: ${metadata.type}`);
      console.log(`  Row count: ${metadata.numRows}`);
      const [schema] = await bq.query(`SELECT column_name, data_type FROM \`${dataset.id}.INFORMATION_SCHEMA.COLUMNS\` WHERE table_name = '${table.id}'`);
      console.log(`  Columns:`, schema.map(c => c.column_name).join(', '));
    }
  }
}

discover().catch(console.error);
