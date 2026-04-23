'use client';

import { createContext, useContext } from 'react';
import type {
  ClientPortalClient,
  ClientPortalContact,
  ClientPortalProperty,
} from '@/types/client-portal';

interface ClientPortalContextValue {
  client: ClientPortalClient;
  properties: ClientPortalProperty[];
  contacts: ClientPortalContact[];
}

const ClientPortalContext = createContext<ClientPortalContextValue | null>(null);

interface ClientPortalProviderProps {
  value: ClientPortalContextValue;
  children: React.ReactNode;
}

export function ClientPortalProvider({
  value,
  children,
}: ClientPortalProviderProps) {
  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
}

export function useClientPortal() {
  const context = useContext(ClientPortalContext);

  if (!context) {
    throw new Error('useClientPortal must be used within ClientPortalProvider');
  }

  return context;
}
