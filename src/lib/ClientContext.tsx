import React, { createContext, useCallback, useContext, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchAnalyticsJson } from './analyticsRequest';
import { resolveWorkspace } from './workspaceSelection';

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
  clients: ClientConfig[];
  selectedClient: string;
  clientId: string;
  setSelectedClient: (id: string) => void;
  loading: boolean;
  ready: boolean;
  error: string | null;
  retry: () => void;
  reportAuthenticationFailure: (message: string) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientConfig[]>([]);
  const [selectedClient, selectClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestError, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const selection = useMemo(() => {
    if (!clients.length) return { id: '', error: null };
    try { return { id: resolveWorkspace(searchParams, clients.map(client => client.id), selectedClient), error: null }; }
    catch (error) { return { id: '', error: error instanceof Error ? error.message : 'Workspace selection is invalid.' }; }
  }, [searchParams, clients, selectedClient]);

  // Gate the route during a URL-context transition, then clear its former cache before remounting.
  useLayoutEffect(() => {
    if (loading || requestError) return;
    if (selectedClient !== selection.id) {
      queryClient.clear();
      selectClient(selection.id);
    }
    // Make even the default selection reproducible in reloads and copied view links.
    if (selection.id && !searchParams.has('workspace')) {
      const next = new URLSearchParams(searchParams);
      next.set('workspace', selection.id);
      setSearchParams(next, { replace: true });
    }
  }, [loading, requestError, selectedClient, selection.id, searchParams, setSearchParams, queryClient]);

  const reportAuthenticationFailure = useCallback((message: string) => {
    queryClient.clear();
    setClients([]);
    selectClient('');
    setLoading(false);
    setError(message);
  }, [queryClient]);

  const retry = useCallback(() => {
    // A fresh permission check cannot reuse records from the former context.
    queryClient.clear();
    setClients([]);
    selectClient('');
    setError(null);
    setLoading(true);
    setGeneration(value => value + 1);
  }, [queryClient]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      for (let attempt = 0; attempt < 3 && !controller.signal.aborted; attempt++) {
        try {
          const json = await fetchAnalyticsJson<ClientConfig[]>('/api/analytics/clients', controller.signal);
          if (!Array.isArray(json.data) || !json.data.length) {
            throw Object.assign(new Error('No authorised workspace is available for this account.'), { status: 403 });
          }
          if (json.data.some(client => !client || typeof client.id !== 'string' || !client.id || typeof client.name !== 'string')) {
            throw Object.assign(new Error('Workspace configuration is incomplete. Please retry or contact an administrator.'), { status: 422 });
          }
          if (controller.signal.aborted) return;
          setClients(json.data);
          setError(null);
          setLoading(false);
          return;
        } catch (failure) {
          if (controller.signal.aborted) return;
          const { status, retryable } = failure as { status?: number; retryable?: boolean };
          if (attempt === 2 || retryable === false || (status !== undefined && status < 500)) {
            queryClient.clear();
            setClients([]);
            selectClient('');
            setError(failure instanceof Error ? failure.message : 'Workspace configuration is unavailable.');
            setLoading(false);
            return;
          }
          await new Promise<void>(resolve => {
            const finish = () => { controller.signal.removeEventListener('abort', finish); if (timer) clearTimeout(timer); resolve(); };
            timer = setTimeout(finish, 800);
            controller.signal.addEventListener('abort', finish, { once: true });
          });
        }
      }
    };
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [generation, queryClient]);

  const setSelectedClient = useCallback((id: string) => {
    if (!clients.some(client => client.id === id)) {
      queryClient.clear();
      selectClient('');
      setError('This account does not have access to the requested workspace.');
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('workspace', id);
    setSearchParams(next);
    setError(null);
  }, [clients, searchParams, setSearchParams, queryClient]);

  const error = requestError || selection.error;
  const clientConfig = selectedClient === selection.id ? clients.find(client => client.id === selectedClient) ?? null : null;
  const ready = !loading && !error && clientConfig !== null;
  return <ClientContext.Provider value={{ clientConfig, clients, selectedClient, clientId: selectedClient, setSelectedClient, loading, ready, error, retry, reportAuthenticationFailure }}>
    {children}
  </ClientContext.Provider>;
};

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClient must be used within a ClientProvider');
  return context;
};
