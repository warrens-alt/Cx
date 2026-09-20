import { useClient } from './ClientContext';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from './FilterContext';
export interface FetchAnalyticsResult<T> { data: T | null; loading: boolean; error: string | null; metadata?: any; fetching?: boolean; refetch?: () => void; }
export function useAnalyticsData<T = any>(endpoint: string, extraParams: Record<string, any> = {}): FetchAnalyticsResult<T> {
  const { startDate, endDate, filters, filterError } = useFilters(), { selectedClient } = useClient();
  const result = useQuery({
    queryKey: ['analytics', endpoint, selectedClient, startDate, endDate, filters, extraParams, filterError],
    enabled: !filterError,
    queryFn: async ({ signal }) => {
      if (filterError) throw Object.assign(new Error(filterError), { status: 400 });
      const [name, query = ''] = endpoint.replace(/^\//, '').split('?');
      const params = new URLSearchParams(query);
      params.set('clientId', selectedClient || 'default_tenant');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (filters && Object.keys(filters).length) params.set('filters', JSON.stringify(filters));
      for (const [key, value] of Object.entries(extraParams)) if (value !== undefined) params.set(key, String(value));
      const response = await fetch(`/api/analytics/${name}?${params.toString()}`, { signal, credentials: 'same-origin' });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        const message = typeof json?.error === 'string' ? json.error : `Analytics request failed (${response.status})`;
        throw Object.assign(new Error(message), { status: response.status });
      }
      return json;
    },
    retry: (count, error: any) => error.status >= 500 && count < 1,
    staleTime: 120000, gcTime: 600000, refetchOnWindowFocus: false,
  });
  return { data: filterError || result.error ? null : result.data?.data ?? null, metadata: result.data?.metadata ?? null, loading: result.isLoading, fetching: result.isFetching,
    error: filterError || (result.error instanceof Error ? result.error.message : null), refetch: () => { void result.refetch(); } };
}
