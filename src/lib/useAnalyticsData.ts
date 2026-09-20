import { useQuery } from '@tanstack/react-query';
import { useClient } from './ClientContext';
import { useFilters } from './FilterContext';
export class AnalyticsHttpError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function fetchAnalyticsJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal, credentials: 'same-origin' });
  let body: any;
  try { body = await response.json(); } catch { throw new AnalyticsHttpError('The API did not return a valid JSON response', response.status); }
  if (!response.ok || body.success !== true) throw new AnalyticsHttpError(`${body.error || 'The data request failed'}${body.requestId ? ` (request ${body.requestId})` : ''}`, response.status);
  return body;
}
export interface FetchAnalyticsResult<T> { data: T | null; loading: boolean; error: string | null; metadata?: any; refetch?: () => void; }
export function useAnalyticsData<T = any>(endpoint: string, extraParams: Record<string, any> = {}): FetchAnalyticsResult<T> {
  const { selectedClient } = useClient(), { startDate, endDate, filters, filterError } = useFilters();
  const query = useQuery({
    queryKey: ['analytics', endpoint, selectedClient, startDate, endDate, filters, filterError, extraParams],
    queryFn: async ({ signal }) => {
      if (filterError) throw new AnalyticsHttpError(filterError, 400);
      const [route, encoded = ''] = endpoint.replace(/^\//, '').split('?');
      const params = new URLSearchParams(encoded);
      params.set('clientId', selectedClient || 'default_tenant'); params.set('startDate', startDate); params.set('endDate', endDate);
      params.set('filters', JSON.stringify(filters));
      for (const [key, value] of Object.entries(extraParams)) if (value !== undefined) params.set(key, String(value));
      return fetchAnalyticsJson(`/api/analytics/${route}?${params}`, signal);
    },
    staleTime: 120000, gcTime: 600000, refetchOnWindowFocus: false,
    retry: (count, error) => count < 1 && (!(error instanceof AnalyticsHttpError) || error.status >= 500),
  });
  return { data: query.data?.data ?? null, metadata: query.data?.metadata ?? null, loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null, refetch: () => { void query.refetch(); } };
}
