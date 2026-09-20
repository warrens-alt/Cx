const { BigQuery } = require('@google-cloud/bigquery');
async function run() {
  const bq = new BigQuery({ projectId: 'dashboards-422710', credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
  const query = `
    SELECT
      COUNT(IF(CAST(fetched AS STRING) != '1900-01-01 00:00:00' AND CAST(fetched AS STRING) != '1970-01-01 00:00:00' AND CAST(fetched AS STRING) != '1970-01-01 00:00:01' AND fetched IS NOT NULL, 1, NULL)) as fetched_count,
      COUNTIF((CAST(standardised_idno AS STRING) != '1900-01-01 00:00:00' AND CAST(standardised_idno AS STRING) != '1970-01-01 00:00:00' AND CAST(standardised_idno AS STRING) != '1970-01-01 00:00:01' AND standardised_idno IS NOT NULL) OR (CAST(standardised_mobile AS STRING) != '1900-01-01 00:00:00' AND CAST(standardised_mobile AS STRING) != '1970-01-01 00:00:00' AND CAST(standardised_mobile AS STRING) != '1970-01-01 00:00:01' AND standardised_mobile IS NOT NULL)) as std_count,
      COUNTIF(CAST(validate_mobile AS STRING) != '1900-01-01 00:00:00' AND CAST(validate_mobile AS STRING) != '1970-01-01 00:00:00' AND CAST(validate_mobile AS STRING) != '1970-01-01 00:00:01' AND validate_mobile IS NOT NULL) as phone_val,
      COUNTIF(CAST(validate_idno AS STRING) != '1900-01-01 00:00:00' AND CAST(validate_idno AS STRING) != '1970-01-01 00:00:00' AND CAST(validate_idno AS STRING) != '1970-01-01 00:00:01' AND validate_idno IS NOT NULL) as id_val
    FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\`
  `;
  const [rows] = await bq.query({ query });
  console.log(rows);
}
run().catch(console.error);
