const { BigQuery } = require('@google-cloud/bigquery');
async function run() {
  const bq = new BigQuery({ projectId: 'dashboards-422710', credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
  const query = `
    SELECT
      SUBSTR(CAST(fetched AS STRING), 1, 7) as month,
      COUNT(IF(CAST(fetched AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND fetched IS NOT NULL, 1, NULL)) as fetched,
      COUNTIF((CAST(standardised_idno AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND standardised_idno IS NOT NULL) OR (CAST(standardised_mobile AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND standardised_mobile IS NOT NULL)) as standardised,
      COUNTIF(CAST(validate_mobile AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND validate_mobile IS NOT NULL) as phoneValidated,
      COUNTIF(CAST(validate_idno AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND validate_idno IS NOT NULL) as idValidated,
      COUNTIF(CAST(fetched AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND fetched IS NOT NULL) as deduped,
      COUNTIF(CAST(offershop_color_vetting_date AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND offershop_color_vetting_date IS NOT NULL) as scored,
      COUNTIF(CAST(offershop_color_vetting_date AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND offershop_color_vetting_date IS NOT NULL) as contactability,
      COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.attempted_to_deliver NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.attempted_to_deliver IS NOT NULL) > 0) as attemptedDeliver,
      COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.delivered NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.delivered IS NOT NULL) > 0) as delivered,
      COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.delivered NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.delivered IS NOT NULL) > 0) as vendorRecords,
      COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.sale NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.sale IS NOT NULL) > 0) as sale,
      COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.activated NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.activated IS NOT NULL) > 0) as activation
    FROM \`dashboards-422710.lead_ledger.clustered_lead_ledger\`
    GROUP BY month
    ORDER BY month DESC
  `;
  const [rows] = await bq.query({ query });
  console.log(rows);
}
run().catch(console.error);
