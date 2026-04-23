'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ClientSidebar } from '@/components/admin/ClientSidebar';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';
import { ToastProvider } from '@/components/admin/ToastContext';
import { useAdminClients } from '@/hooks/useAdminClients';
import type { Client } from '@/types/admin';

export default function AdminPage() {
  const router = useRouter();
  const {
    clients,
    isLoading: loadingList,
    addClient,
    removeClient,
  } = useAdminClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const mainNoSearchMatches =
    searchQuery.trim().length > 0 && filteredClients.length === 0;

  const handleSelectClient = (id: number) => {
    router.push(`/admin/clients/${id}`);
  };

  const openDeleteFor = (id: number) => {
    const c = clients.find((x) => x.id === id);
    if (c) {
      setDeleteTarget(c);
      setShowDeleteModal(true);
    }
  };

  return (
    <ToastProvider>
      <div className="admin-portal w-full">
        <AdminLayout
          sidebar={
            <ClientSidebar
              clients={clients}
              filteredClients={filteredClients}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedClientId={null}
              onSelectClient={handleSelectClient}
              onNewClient={() => setShowCreateModal(true)}
              onRequestDelete={openDeleteFor}
              loading={loadingList}
            />
          }
        >
          {loadingList ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 md:p-8">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 text-5xl" aria-hidden>
                ✨
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                No client portals yet
              </h1>
              <p className="mb-6 max-w-md text-sm text-gray-600">
                Create your first client portal to get started. You can
                configure branding, properties, and support contacts.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                + New Client
              </button>
            </div>
          ) : mainNoSearchMatches ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 text-5xl text-gray-400" aria-hidden>
                🔍
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                No matching clients
              </h1>
              <p className="mb-6 max-w-md text-sm text-gray-600">
                Clear the search to see all clients, or create a new one.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Clear search
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  + New Client
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 text-5xl" aria-hidden>
                🏢
              </span>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Select a client portal
              </h1>
              <p className="mb-6 max-w-md text-sm text-gray-600">
                Choose a client from the left sidebar to view and manage their
                branding, properties, and support team.
              </p>
            </div>
          )}
        </AdminLayout>
      </div>

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newClient) => {
          addClient(newClient);
          router.push(`/admin/clients/${newClient.id}`);
        }}
      />

      <DeleteClientModal
        isOpen={showDeleteModal}
        client={deleteTarget}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onSuccess={(deletedId) => {
          removeClient(deletedId);
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
      />
    </ToastProvider>
  );
}
