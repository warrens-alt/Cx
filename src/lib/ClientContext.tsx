import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ClientConfig {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  capabilities: {
    marketing: boolean;
    leads: boolean;
    calls: boolean;
    sales: boolean;
    activation: boolean;
    revenue: boolean;
  };
}

interface ClientContextType {
  clientConfig: ClientConfig | null;
  selectedClient: string;
  clientId: string;
  setSelectedClient: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('default_tenant');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 3;

    const loadConfig = async () => {
      while (attempts < maxAttempts && isMounted) {
        try {
          const res = await fetch('/api/analytics/clients');
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            const requestId = res.headers.get('x-request-id');
            const message = typeof body?.error === 'string' ? body.error : `Workspace request failed (${res.status})`;
            throw Object.assign(new Error(requestId ? `${message} Request ${requestId}.` : message), { retryable: res.status >= 500 });
          }
          const json = await res.json();
          if (isMounted && json.success && json.data && json.data.length > 0) {
            setClientConfig(json.data[0]);
            if (json.data[0].id) {
              setSelectedClient(json.data[0].id);
            }
            setError(null);
            setLoading(false);
            return;
          }
          throw Object.assign(new Error('No authorised workspace is available for this account.'), { retryable: false });
        } catch (err) {
          attempts++;
          const retryable = (err as { retryable?: boolean }).retryable !== false;
          if (attempts >= maxAttempts || !retryable) {
            if (isMounted) {
              setClientConfig(null);
              setError(err instanceof Error ? err.message : 'Workspace configuration is unavailable.');
              setLoading(false);
            }
            return;
          } else {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ClientContext.Provider value={{
      clientConfig,
      selectedClient,
      clientId: selectedClient,
      setSelectedClient,
      loading,
      error,
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClient must be used within a ClientProvider');
  return context;
};
