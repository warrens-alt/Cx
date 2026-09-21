import type { Filters } from '../../server/bigquery/filters';

export interface AnalyticsScope {
  clientId: string;
  startDate: string;
  endDate: string;
  filters: Filters;
}

/** Every analytical request, including records and exports, keeps the active scope. */
export function analyticsUrl(endpoint: string, scope: AnalyticsScope, extra: Record<string, unknown> = {}): string {
  if (!scope.clientId) throw new Error('Select an authorised workspace before requesting data.');
  const [path, query = ''] = endpoint.replace(/^\//, '').split('?');
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  // Scope wins over any endpoint defaults or display parameters.
  params.set('clientId', scope.clientId);
  params.delete('startDate');
  params.delete('endDate');
  params.delete('filters');
  if (scope.startDate) params.set('startDate', scope.startDate);
  if (scope.endDate) params.set('endDate', scope.endDate);
  if (Object.keys(scope.filters).length) params.set('filters', JSON.stringify(scope.filters));
  return `/api/analytics/${path}?${params.toString()}`;
}

export function analyticsError(response: Response, body: unknown): Error & { status: number } {
  const payload = body as { error?: unknown; requestId?: unknown } | null;
  const requestId = response.headers.get('x-request-id') || payload?.requestId;
  const safeId = typeof requestId === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(requestId) ? requestId : null;
  const message = typeof payload?.error === 'string' && payload.error.length <= 1000
    ? payload.error : `Data request failed (${response.status}). Please retry.`;
  return Object.assign(new Error(`${message}${safeId ? ` Request ${safeId}.` : ''}`), { status: response.status });
}

export async function fetchAnalyticsJson<T>(url: string, signal: AbortSignal): Promise<{ data: T; metadata?: Record<string, unknown> }> {
  const response = await fetch(url, { signal, credentials: 'same-origin' });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !Object.hasOwn(body, 'data')) throw analyticsError(response, body);
  return body;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Let the browser begin the download before revoking the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Values remain strings; formula-like labels are escaped for spreadsheet consumers. */
export function recordsCsv(rows: Record<string, unknown>[]): string {
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const cell = (input: unknown) => {
    const value = input && typeof input === 'object' && 'value' in input ? (input as { value: unknown }).value : input;
    const text = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    const safe = /^[\s\uFEFF]*[=+@]/.test(text) || (/^\s*-/.test(text) && !/^-?\d+(?:\.\d+)?$/.test(text)) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [columns.map(cell), ...rows.map(row => columns.map(key => cell(row[key])))].map(row => row.join(',')).join('\r\n');
}
