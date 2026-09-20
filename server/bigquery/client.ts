import { BigQuery, type Query } from '@google-cloud/bigquery';
import { vendorScope } from '../analyticsContext';
import { tableIdentifier } from './config';
const clients = new Map<string, AnalyticsBigQueryClient>();
export function guardedQueryOptions(options: Query): Query {
  const configured = Number(process.env.BIGQUERY_MAX_BYTES_BILLED || 1000000000);
  if (!Number.isSafeInteger(configured) || configured <= 0) throw new Error('Invalid BIGQUERY_MAX_BYTES_BILLED');
  const requested = options.maximumBytesBilled ? Number(options.maximumBytesBilled) : configured;
  if (!Number.isSafeInteger(requested) || requested <= 0) throw new Error('Invalid query budget');
  return { ...options, useLegacySql: false, maximumBytesBilled: String(Math.min(configured, requested)), params: { ...options.params, ...vendorScope().params } };
}
/** Keep the SDK behind one scoped query boundary so older reporting modules receive the same vendor bindings. */
export class AnalyticsBigQueryClient {
  constructor(private readonly bq: BigQuery) {}
  query(options: Query) { return this.bq.query(guardedQueryOptions(options)); }
  createQueryJob(options: Query) { return this.bq.createQueryJob(guardedQueryOptions(options)); }
  getDatasets() { return this.bq.getDatasets(); }
}
export function getBigQueryClient(projectId: string): AnalyticsBigQueryClient {
  if (!clients.has(projectId)) {
    let credentials;
    if (process.env.BIGQUERY_CREDENTIALS) {
      try { credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS); }
      catch { throw new Error('BIGQUERY_CREDENTIALS is invalid; refusing a silent identity fallback'); }
    }
    clients.set(projectId, new AnalyticsBigQueryClient(new BigQuery({ projectId, credentials })));
  }
  return clients.get(projectId)!;
}
export async function checkBigQueryHealth(projectId: string, datasetId: string, tableId: string) {
  const [rows] = await getBigQueryClient(projectId).query({ query: `SELECT MAX(SAFE_CAST(fetched AS TIMESTAMP)) AS latest FROM ${tableIdentifier(`${projectId}.${datasetId}.${tableId}`)}` });
  return { status: 'Connected', latestData: rows[0]?.latest || null, freshnessVerified: false };
}
