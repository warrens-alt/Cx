import type { ErrorRequestHandler } from 'express';
import { RequestError } from './bigquery/filters';

export interface SafeApiError { status: number; code: string; message: string; retryable: boolean; }
const result = (status: number, code: string, message: string, retryable = false): SafeApiError => ({ status, code, message, retryable });

/** Classify failures without sending SQL, source records, credentials or SDK response bodies to the browser. */
export function describeApiError(error: unknown): SafeApiError {
  if (error instanceof RequestError) return result(error.status, 'REQUEST_REJECTED', error.message, error.status === 429);
  const value = error && typeof error === 'object' ? error as Record<string, any> : {};
  if (value.type === 'entity.too.large') return result(413, 'REQUEST_TOO_LARGE', 'Request body is too large');
  if (value.type === 'entity.parse.failed') return result(400, 'INVALID_JSON', 'Invalid JSON request body');
  const reasons = new Set<string>(Array.isArray(value.errors) ? value.errors.map((entry: any) => entry?.reason).filter((reason: unknown): reason is string => typeof reason === 'string') : []);
  if (typeof value.reason === 'string') reasons.add(value.reason);
  const code = Number(value.code);
  // These are upstream warehouse failures, not a failed end-user login. Do not return 401/403 and evict their workspace.
  if (reasons.has('rateLimitExceeded') || reasons.has('jobRateLimitExceeded') || code === 429) return result(503, 'WAREHOUSE_RATE_LIMITED', 'BigQuery is rate limiting this read. Wait briefly, then retry.', true);
  if (reasons.has('quotaExceeded')) return result(503, 'WAREHOUSE_QUOTA_EXCEEDED', 'The BigQuery read quota is exhausted. No data was substituted. Retry after the quota resets.');
  if (reasons.has('billingNotEnabled') || reasons.has('billingTierLimitExceeded')) return result(503, 'WAREHOUSE_BILLING_LIMIT', 'BigQuery could not run this read within the configured billing limits. No data was substituted.');
  if (reasons.has('accessDenied') || code === 403) return result(503, 'WAREHOUSE_ACCESS_DENIED', 'The app identity cannot read the configured BigQuery source or create its read query job. Check the existing server credentials and source mapping. No data was substituted.');
  if (reasons.has('notFound') || code === 404) return result(503, 'WAREHOUSE_SOURCE_UNAVAILABLE', 'The configured BigQuery source or query job was not found in the requested location. Check the app table mapping and query location. No data was substituted.');
  if (reasons.has('invalidQuery')) return result(502, 'WAREHOUSE_QUERY_INVALID', 'The app query does not match the BigQuery source schema or supported SQL. No empty or substitute result was used.');
  if (reasons.has('resourcesExceeded') || reasons.has('responseTooLarge')) return result(422, 'WAREHOUSE_READ_LIMIT', 'This read exceeds BigQuery processing or result limits. Narrow the date range or filters and retry.');
  if (code === 401 || reasons.has('authError') || (typeof value.message === 'string' && /Could not load the default credentials|invalid_grant|invalid_client/i.test(value.message))) return result(503, 'WAREHOUSE_CREDENTIALS_UNAVAILABLE', 'The app server could not authenticate its BigQuery read. Check its existing server-side credentials. No data was substituted.');
  if (reasons.has('backendError') || reasons.has('internalError') || [500, 502, 503, 504].includes(code)) return result(503, 'WAREHOUSE_TEMPORARILY_UNAVAILABLE', 'BigQuery is temporarily unavailable. Retry this read shortly.', true);
  if (['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED'].includes(String(value.code))) return result(503, 'UPSTREAM_CONNECTION_FAILED', 'The app server could not reach the data service. Check its connection and retry.', true);
  return result(500, 'INTERNAL_ERROR', 'The request failed. Check the server logs or retry.');
}

export const apiErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) { res.end(); return; }
  const detail = describeApiError(error);
  if (detail.status >= 500) console.error(JSON.stringify({ action: 'REQUEST_FAILED', requestId: res.locals.requestId, method: req.method, status: detail.status, code: detail.code }));
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(detail.status).json({ success: false, error: detail.message, status: detail.status, code: detail.code, retryable: detail.retryable, requestId: res.locals.requestId });
};
