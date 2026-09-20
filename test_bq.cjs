const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery({ credentials: JSON.parse('{}'), projectId: 'test' });
console.log('Success');
