'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ClientBrandingCard } from '@/components/admin/ClientBrandingCard';
import { ClientSidebar } from '@/components/admin/ClientSidebar';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';
import { EditClientModal } from '@/components/admin/EditClientModal';
import { ToastProvider } from '@/components/admin/ToastContext';
import { useAdminClients } from '@/hooks/useAdminClients';
import type {
  ApiErrorResponse,
  Client,
  ClientDetail,
  ClientDetailResponse,
} from '@/types/admin';

function BrandingCardSkeleton() {
  return (
    <div className="animate-pulse p-6 md:p-8">
      <div className="mb-6 flex justify-between">
        <div className="h-9 w-48 max-w-full rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded bg-gray-200" />
          <div className="h-10 w-24 rounded bg-gray-200" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-4 flex justify-between">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="h-8 w-28 rounded bg-gray-200" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 shrink-0 rounded bg-gray-200" />
              <div className="h-4 flex-1 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 space-y-2">
        <div className="h-12 w-full rounded-lg bg-gray-200" />
        <div className="h-12 w-full rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export default function AdminClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParam = params.id;
  const clientId =
    typeof rawParam === 'string' ? Number.parseInt(rawParam, 10) : NaN;

  const {
    clients,
    isLoading: loadingList,
    addClient,
    updateClient,
    removeClient,
  } = useAdminClients();
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<
    'NOT_FOUND' | 'LOAD_FAILED' | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const clientIdValid = Number.isFinite(clientId);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const fetchClientDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/admin/clients/${id}`);
      const json = (await res.json()) as ClientDetailResponse | ApiErrorResponse;
      if (!json.success) {
        setSelectedClient(null);
        if (json.error === 'CLIENT_NOT_FOUND') {
          setDetailError('NOT_FOUND');
        } else {
          setDetailError('LOAD_FAILED');
        }
        return;
      }
      setSelectedClient(json.data);
    } catch {
      setSelectedClient(null);
      setDetailError('LOAD_FAILED');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!clientIdValid) {
      setSelectedClient(null);
      setDetailError(null);
      setLoadingDetail(false);
      return;
    }
    void fetchClientDetail(clientId);
  }, [clientId, clientIdValid, fetchClientDetail]);

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

  const renderMain = () => {
    if (loadingList) {
      return <BrandingCardSkeleton />;
    }

    if (clients.length === 0) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 text-5xl" aria-hidden>
            ✨
          </span>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            No client portals yet
          </h1>
          <p className="mb-6 max-w-md text-sm text-gray-600">
            Create your first client portal to get started. You can configure
            branding, properties, and support contacts.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            + New Client
          </button>
        </div>
      );
    }

    if (mainNoSearchMatches) {
      return (
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
      );
    }

    if (!clientIdValid) {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">Invalid client in URL.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to client list
          </Link>
        </div>
      );
    }

    if (loadingDetail || (!detailError && !selectedClient)) {
      return <BrandingCardSkeleton />;
    }

    if (detailError === 'NOT_FOUND') {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">This client was not found.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to client list
          </Link>
        </div>
      );
    }

    if (detailError === 'LOAD_FAILED') {
      return (
        <div className="p-6 md:p-8">
          <p className="text-sm text-gray-600">
            Could not load this client. Please try again.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-sm text-gray-800 hover:underline"
          >
            ← Back to client list
          </Link>
        </div>
      );
    }

    if (!selectedClient) {
      return <BrandingCardSkeleton />;
    }

    return (
      <ClientBrandingCard
        client={selectedClient}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => {
          setDeleteTarget(selectedClient);
          setShowDeleteModal(true);
        }}
      />
    );
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
              selectedClientId={clientIdValid ? clientId : null}
              onSelectClient={handleSelectClient}
              onNewClient={() => setShowCreateModal(true)}
              onRequestDelete={openDeleteFor}
              loading={loadingList}
            />
          }
        >
          {renderMain()}
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

      <EditClientModal
        isOpen={showEditModal}
        client={selectedClient}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updated) => {
          updateClient(updated);
          if (clientIdValid && updated.id === clientId) {
            void fetchClientDetail(clientId);
          }
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
          if (deletedId === clientId) {
            router.push('/admin');
          }
        }}
      />
    </ToastProvider>
  );
}
