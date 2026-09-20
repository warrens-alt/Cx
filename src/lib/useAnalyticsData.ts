import { useClient } from './ClientContext';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from './FilterContext';

export interface FetchAnalyticsResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  metadata?: any;
  refetch?: () => void;
}

export function useAnalyticsData<T = any>(endpoint: string, extraParams: Record<string, any> = {}): FetchAnalyticsResult<T> {
  const { startDate, endDate, filters } = useFilters();
  const { selectedClient } = useClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics', endpoint, selectedClient, startDate, endDate, filters, extraParams],
    queryFn: async ({ signal }) => {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      const params = new URLSearchParams({ clientId: selectedClient || 'default' });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (filters && Object.keys(filters).length > 0) {
        params.append('filters', JSON.stringify(filters));
      }

      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined) {
          params.append(k, String(v));
        }
      });

      const [baseEndpoint, extraQuery] = cleanEndpoint.split('?');
      if (extraQuery) { 
        extraQuery.split('&').forEach(q => { 
          const [k,v] = q.split('='); 
          if(k && v) params.append(k, v); 
        }); 
      }
      const res = await fetch(`/api/analytics/${baseEndpoint}?${params.toString()}`, { signal });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'API request failed');
      }
      return json;
    },
    staleTime: 120 * 1000, // 2 minutes staleTime
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent redundant queries on window focus
  });

  return {
    data: data?.data || null,
    metadata: data?.metadata || null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: () => { refetch(); }
  };
}
