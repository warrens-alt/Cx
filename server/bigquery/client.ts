import { BigQuery } from '@google-cloud/bigquery';

const bqClientCache = new Map<string, BigQuery>();

export function getBigQueryClient(projectId: string): BigQuery {
  if (bqClientCache.has(projectId)) {
    return bqClientCache.get(projectId)!;
  }

  let credentials;
  try {
    if (process.env.BIGQUERY_CREDENTIALS) {
      credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS);
    }
  } catch (e) {
    console.warn("Failed to parse BIGQUERY_CREDENTIALS, falling back to Application Default Credentials");
  }
  
  const client = new BigQuery({ projectId, credentials });
  bqClientCache.set(projectId, client);
  return client;
}

export async function checkBigQueryHealth(projectId: string, datasetId: string, tableId: string) {
  const bq = getBigQueryClient(projectId);
  try {
    const query = `SELECT MAX(fetched) as latest FROM \`${projectId}.${datasetId}.${tableId}\` LIMIT 1`;
    const [rows] = await bq.query({ query });
    return {
      status: 'Healthy',
      latestData: rows[0]?.latest || null
    };
  } catch (error: any) {
    return {
      status: 'Error',
      error: error.message
    };
  }
}
