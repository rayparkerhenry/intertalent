import useSWR from 'swr';
import { fetcher } from '@/lib/admin/fetcher';
import type { Client, ClientListResponse } from '@/types/admin';

export function useAdminClients() {
  const { data, error, isLoading, mutate } = useSWR<ClientListResponse>(
    '/api/admin/clients',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const clients: Client[] = data?.success ? data.data : [];

  const addClient = (newClient: Client) => {
    if (!data?.success) return;
    void mutate(
      {
        ...data,
        data: [...data.data, newClient].sort((a, b) => a.id - b.id),
      },
      false
    );
  };

  const updateClient = (updated: Client) => {
    if (!data?.success) return;
    void mutate(
      {
        ...data,
        data: data.data.map((c) => (c.id === updated.id ? updated : c)),
      },
      false
    );
  };

  const removeClient = (deletedId: number) => {
    if (!data?.success) return;
    void mutate(
      {
        ...data,
        data: data.data.filter((c) => c.id !== deletedId),
      },
      false
    );
  };

  return {
    clients,
    isLoading,
    error,
    addClient,
    updateClient,
    removeClient,
  };
}
