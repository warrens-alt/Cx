export interface ApiEnvelope<T> {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
}

export type ApiResponseError = Error & { status: number; httpStatus: number; retryable: boolean };

const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;
const errorStatus = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599;

/** A proxy can return HTTP 200 for an API failure; never describe that as a successful data response. */
export function apiResponseError(response: Response, body: unknown, label = 'Data', fallback?: string): ApiResponseError {
  const payload = object(body), detail = object(payload?.error);
  const candidate = payload?.error ?? detail?.message;
  const serverMessage = typeof candidate === 'string' ? candidate : detail?.message;
  const requestId = response.headers.get('x-request-id') || payload?.requestId;
  const safeId = typeof requestId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(requestId) ? requestId : null;
  const declaredStatus = payload?.status ?? payload?.statusCode ?? detail?.code;
  const status = !response.ok ? response.status : errorStatus(declaredStatus) ? declaredStatus : 502;
  const message = typeof serverMessage === 'string' && serverMessage.trim() && serverMessage.length <= 1000
    ? serverMessage
    : fallback ?? (response.ok
      ? `${label} API returned an invalid response. Check the app's API routing or preview connection.`
      : `${label} request failed (${response.status}). Please retry.`);
  return Object.assign(new Error(`${message}${safeId ? ` Request ${safeId}.` : ''}`), {
    status,
    httpStatus: response.status,
    // Invalid successful responses need a routing/contract fix, not automatic repeated reads.
    retryable: payload?.retryable !== false && status >= 500 && (!response.ok || errorStatus(declaredStatus)),
  });
}

/** Decode JSON without swallowing request cancellation or echoing HTML / proxy response bodies. */
export async function readApiObject(response: Response, label = 'Data'): Promise<Record<string, unknown>> {
  const text = await response.text();
  let decoded: unknown;
  try { decoded = JSON.parse(text); }
  catch {
    const html = response.headers.get('content-type')?.includes('text/html') || /^\s*</.test(text);
    const fallback = response.ok
      ? `${label} API returned ${html ? 'HTML instead of JSON' : 'invalid JSON'}. Check the app's API routing or preview connection.`
      : `${label} request failed (${response.status}); the server did not return a JSON error. Please retry.`;
    throw apiResponseError(response, null, label, fallback);
  }
  const body = object(decoded);
  if (!response.ok || body?.success !== true) throw apiResponseError(response, body, label);
  return body;
}

export async function readApiEnvelope<T>(response: Response, label = 'Data'): Promise<ApiEnvelope<T>> {
  const body = await readApiObject(response, label);
  if (!Object.hasOwn(body, 'data')) throw apiResponseError(response, body, label,
    `${label} API response is missing its data field. No empty or substitute result was used.`);
  return body as unknown as ApiEnvelope<T>;
}
