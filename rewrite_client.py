content = """import { BigQuery } from '@google-cloud/bigquery';

let bqClient: BigQuery | null = null;

export function getBigQueryClient(projectId: string): BigQuery {
  let credentials;
  try {
    if (process.env.BIGQUERY_CREDENTIALS) {
      credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS);
    }
  } catch (e) {
    console.warn("Failed to parse BIGQUERY_CREDENTIALS, falling back to Application Default Credentials");
  }
  
  return new BigQuery({ projectId, credentials });
}

export async function checkBigQueryHealth(projectId: string, datasetId: string, tableId: string) {
  const bq = getBigQueryClient(projectId);
  try {
    const query = `SELECT MAX(capture_timestamp) as latest FROM \\`${projectId}.${datasetId}.${tableId}\\` LIMIT 1`;
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
"""
with open("server/bigquery/client.ts", "w") as f:
    f.write(content)
