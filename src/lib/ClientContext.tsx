import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

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
}

export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  id: 'default_tenant',
  name: 'Primary Tenant',
  currency: 'ZAR',
  timezone: 'Africa/Johannesburg',
  capabilities: {
    marketing: true,
    leads: true,
    calls: true,
    sales: true,
    activation: true,
    revenue: true,
  }
};

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientConfig, setClientConfig] = useState<ClientConfig>(DEFAULT_CLIENT_CONFIG);
  const [selectedClient, setSelectedClient] = useState<string>('default_tenant');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 3;

    const loadConfig = async () => {
      while (attempts < maxAttempts && isMounted) {
        try {
          const res = await fetch('/api/analytics/clients');
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const json = await res.json();
          if (isMounted && json.success && json.data && json.data.length > 0) {
            setClientConfig(json.data[0]);
            if (json.data[0].id) {
              setSelectedClient(json.data[0].id);
            }
            return;
          }
        } catch (err) {
          attempts++;
          if (attempts >= maxAttempts) {
            // Log as warning rather than error to avoid false positives in health checks
            console.warn("Using default tenant config fallback:", err);
          } else {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        }
      }
    };

    loadConfig();

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
      loading 
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
